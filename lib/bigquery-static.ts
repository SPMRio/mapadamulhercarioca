import "server-only";
import { createSign } from "node:crypto";
import { request } from "node:https";
import { unstable_cache } from "next/cache";

type Account = { client_email: string; private_key: string; project_id: string };
type QueryResult = {
  jobComplete?: boolean;
  schema?: { fields?: { name: string }[] };
  rows?: { f?: { v?: string | null }[] }[];
  pageToken?: string;
  jobReference?: { jobId?: string; location?: string };
};
export type IndicadorRegistro = {
  indicador_id: string;
  titulo: string;
  descricao: string;
  tema: string;
  periodo: string;
  unidade: string;
  territorialidade: string;
  fonte: string;
  link_fonte: string;
  nota: string;
  observacoes: string;
  tipo_visualizacao: string;
  atualizado_em?: string;
};
export type DadoEixo01Registro = {
  id_indicador: string;
  periodo: string;
  territorio: string;
  categoria_recorte: string;
  serie_subrecorte: string;
  metrica?: string;
  valor: string | number;
  publicar: string;
  tipo_valor?: string;
  escala?: string;
  texto?: string;
  unidade_dado?: string;
  nota_dado?: string;
  situacao?: string;
  ordem?: number;
};
function jsonRequest<T>(url: string, method: "GET" | "POST", body?: unknown, authorization?: string): Promise<{status: number; data: T}> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = request(url, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
        ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
      },
      timeout: 20000,
    }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode ?? 500, data: JSON.parse(Buffer.concat(chunks).toString("utf8")) as T });
        } catch { reject(new Error("Resposta inválida do Google Cloud.")); }
      });
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("Tempo de resposta excedido.")));
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}
function credentials(): Account {
  const raw = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("BIGQUERY_SERVICE_ACCOUNT_JSON ausente.");
  const parsed = JSON.parse(raw) as Partial<Account>;
  if (!parsed.client_email || !parsed.private_key || parsed.project_id !== "rj-spm-rio") {
    throw new Error("Conta de serviço inválida para o projeto.");
  }
  return parsed as Account;
}
function b64(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }
async function accessToken(): Promise<string> {
  const account = credentials();
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    b64(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    b64(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned); signer.end();
  const assertion = unsigned + "." + b64(signer.sign(account.private_key.replace(/\\n/g, "\n")));
  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }).toString();
  const result = await new Promise<{access_token?: string}>((resolve, reject) => {
    const req = request("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(form) },
      timeout: 20000,
    }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error("Falha de autenticação Google."));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch { reject(new Error("Token inválido.")); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("Tempo de autenticação excedido.")));
    req.on("error", reject);
    req.write(form); req.end();
  });
  if (!result.access_token) throw new Error("Google não retornou acesso.");
  return result.access_token;
}
async function query(table: string, isSql = false): Promise<Record<string, unknown>[]> {
  const auth = await accessToken();
  const response = await jsonRequest<QueryResult & {error?: {message?: string}}>(
    "https://bigquery.googleapis.com/bigquery/v2/projects/rj-spm-rio/queries",
    "POST",
    {
      query: isSql ? table : `SELECT TO_JSON_STRING(t) AS linha_json FROM \`rj-spm-rio.projeto_mapa_mulher.${table}\` t`,
      useLegacySql: false, location: "southamerica-east1",
      maximumBytesBilled: "1000000000", timeoutMs: 10000, maxResults: 1000,
    },
    auth,
  );
  if (response.status !== 200) {
    if (/not found/i.test(response.data.error?.message ?? "")) throw new Error("table_not_found");
    throw new Error("Falha de consulta ao BigQuery: " + table);
  }
  if (!response.data.jobComplete) throw new Error("Consulta do BigQuery ainda não concluída: " + table);
  const index = response.data.schema?.fields?.findIndex(field => field.name === "linha_json") ?? -1;
  if (index < 0) throw new Error("Esquema inesperado no BigQuery: " + table);
  const resultado: Record<string, unknown>[] = [];
  const adicionar = (rows: QueryResult["rows"]) => {
    for (const row of rows ?? []) {
      resultado.push(JSON.parse(String(row.f?.[index]?.v ?? "{}")) as Record<string, unknown>);
    }
  };
  adicionar(response.data.rows);
  let token = response.data.pageToken;
  const job = response.data.jobReference?.jobId;
  if (token && !job) throw new Error("Consulta paginada sem identificador de job: " + table);
  while (token) {
    const url = "https://bigquery.googleapis.com/bigquery/v2/projects/rj-spm-rio/queries/"
      + encodeURIComponent(job!)
      + "?location=southamerica-east1&maxResults=1000&pageToken=" + encodeURIComponent(token);
    const pagina = await jsonRequest<QueryResult & {error?: {message?: string}}>(url, "GET", undefined, auth);
    if (pagina.status !== 200 || !pagina.data.jobComplete) {
      throw new Error("Falha na paginação de dados do BigQuery: " + table);
    }
    adicionar(pagina.data.rows);
    token = pagina.data.pageToken;
  }
  return resultado;
}
const normalizarId = (id: unknown) => String(id ?? "").replace(/^(\d+(?:\.\d+)*)-(\d+)$/, "$1.$2");
/** Normaliza trimestres, mantendo outros períodos inalterados. */
function normalizarPeriodo(periodo: unknown): string {
  const texto = String(periodo ?? "").trim();
  const anoPrimeiro = texto.match(/^((?:19|20)\d{2})[\s./-]*(?:T|TRI(?:MESTRE)?)[\s.-]*([1-4])$/i)
    ?? texto.match(/^((?:19|20)\d{2})[\s./-]*([1-4])\s*(?:T|TRI(?:MESTRE)?)$/i);
  if (anoPrimeiro) return anoPrimeiro[1] + "-" + anoPrimeiro[2] + "T";
  const trimestrePrimeiro = texto.match(/^([1-4])\s*º?\s*(?:T|TRI(?:MESTRE)?)[\s./-]*((?:19|20)\d{2})$/i);
  if (trimestrePrimeiro) return trimestrePrimeiro[2] + "-" + trimestrePrimeiro[1] + "T";
  return texto;
}
function normalizarEixo(valor: unknown): string {
  const nome = String(valor ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const eixos: Record<string,string> = {
    "visao geral": "Visão geral", "violencia": "Violência", "cuidados": "Cuidados",
    "seguranca publica": "Segurança pública", "meninas": "Meninas",
    "saude": "Saúde", "educacao": "Educação", "emprego e renda": "Emprego e renda",
    "cultura": "Cultura", "assistencia social": "Assistência social",
    "mulheres": "Mulheres", "codim": "CODIM"
  };
  return eixos[nome] || String(valor ?? "").trim();
}
async function catalogo() {
  const originais = await query("indicadores");
  const eixo1 = await query("eixo_01_visao_geral");
  const datas = new Map<string, string>();
  for (const row of eixo1) {
    const id = normalizarId(row.indicador_id ?? row.id_indicador);
    const data = String(row.atualizado_em ?? "");
    if (id && data && (!datas.has(id) || data > datas.get(id)!)) datas.set(id, data);
  }
  const porId = new Map<string, Record<string, unknown>>();
  // Metadados oficiais vêm da tabela indicadores, conforme o modelo novo.
  for (const row of originais) {
    const id = normalizarId(row.indicador_id ?? row.id_indicador);
    if (id) porId.set(id, row);
  }
  // Durante a migração, os dados existentes também podem identificar um indicador
  // ainda não cadastrado no catálogo (desde que possua título).
  for (const row of eixo1) {
    const id = normalizarId(row.indicador_id ?? row.id_indicador);
    if (id && !porId.has(id) && String(row.titulo ?? "").trim()) {
      porId.set(id, { ...row, eixo: "Visão geral" });
    }
  }
  return Array.from(porId.entries()).map(([indicador_id,row]) => ({
    indicador_id,
    titulo: String(row.titulo ?? ""),
    descricao: String(row.descricao ?? ""),
    tema: normalizarEixo(row.eixo ?? row.tema),
    periodo: String(row.periodo ?? ""),
    unidade: String(row.unidade ?? ""),
    territorialidade: String(row.territorialidade ?? ""),
    fonte: String(row.fonte ?? ""),
    link_fonte: String(row.link_fonte ?? ""),
    nota: String(row.nota_metodologica ?? row.nota_indicador ?? row.nota ?? ""),
    observacoes: String(row.nota_metodologica ?? row.observacoes ?? ""),
    tipo_visualizacao: String(row.tipo_visualizacao ?? (indicador_id === "1.2.1" ? "linhas" : "")),
    atualizado_em: datas.get(indicador_id) || String(row.atualizado_em ?? ""),
  })).filter(item => Boolean(item.indicador_id) && Boolean(item.titulo));
}
// Descobre automaticamente as tabelas dos 12 eixos pelo prefixo, sem fixar
// o sufixo no código (ex.: eixo_08_emprego_renda ou eixo_08_emprego_e_renda).
export const NUMEROS_EIXOS = Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0"));
async function descobrirTabelasEixos(): Promise<string[]> {
  const sql = `SELECT TO_JSON_STRING(t) AS linha_json FROM (
    SELECT table_name FROM \`rj-spm-rio.projeto_mapa_mulher.INFORMATION_SCHEMA.TABLES\`
    WHERE table_type = 'BASE TABLE' AND STARTS_WITH(table_name, 'eixo_')
  ) t`;
  const rows = await query(sql,true);
  return rows.map(r=>String(r.table_name??"")).filter(nome=>/^eixo_(0[1-9]|1[0-2])(?:_|$)/.test(nome));
}
const tabelasEixosDisponiveis = unstable_cache(descobrirTabelasEixos,["mapa-tabelas-eixos-auto-v1"],{
  tags:["mapa-eixos"],revalidate:120,
});

async function valoresEixo(numero: string): Promise<DadoEixo01Registro[]> {
  if (!/^(0[1-9]|1[0-2])$/.test(numero)) throw new Error("Eixo inválido.");
  const tabelas = await tabelasEixosDisponiveis();
  const prefixo = `eixo_${numero}_`;
  // Cada eixo é encontrado pelo prefixo, independentemente do sufixo escolhido na importação.
  const nomes = tabelas.filter(nome=>nome === `eixo_${numero}` || nome.startsWith(prefixo));
  if (!nomes.length) return [];
  const resultados = await Promise.all(nomes.map(async nome=>{
    try{return await query(nome);}
    catch(erro){if(erro instanceof Error && erro.message==="table_not_found") return [];throw erro;}
  }));
  // Une somente os dados efetivamente existentes. A tabela indicadores permanece independente.
  const rows = resultados.flat();
  return rows
    .filter(row => {
      const publicar = String(row.publicar ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
      // A importação é pública por padrão. Só omite bloqueios explícitos.
      return !["NAO","N","FALSE","0","RASCUNHO"].includes(publicar);
    })
    .map(row => ({
      id_indicador: normalizarId(row.indicador_id ?? row.id_indicador),
      periodo: normalizarPeriodo(row.periodo),
      territorio: String(row.territorio ?? ""),
      categoria_recorte: String(row.categoria ?? row.categoria_recorte ?? ""),
      serie_subrecorte: String(row.serie ?? row.serie_subrecorte ?? ""),
      metrica: String(row.metrica ?? ""),
      valor: row.valor == null ? "" : Number(row.valor),
      publicar: "SIM",
      tipo_valor: String(row.tipo_valor ?? ""),
      escala: String(row.escala ?? ""),
      texto: String(row.texto ?? ""),
      unidade_dado: String(row.unidade ?? row.unidade_dado ?? ""),
      nota_dado: String(row.nota_dado ?? ""),
      situacao: String(row.situacao ?? ""),
      ordem: Number(row.ordem ?? 0),
    }));
}
// A importação pode invalidar imediatamente o cache via /api/revalidate.
// Como garantia, os dados também são atualizados automaticamente após 2 minutos.
// Assim os 12 eixos funcionam sem mudanças de código ou publicações manuais.
export const getIndicadores = unstable_cache(catalogo, ["mapa-catalogo-v9-auto"], {
  tags: ["mapa-indicadores"], revalidate: 120,
});
// O argumento numero faz parte da chave de cache, isolando cada um dos 12 eixos.
export const getDadosEixo = unstable_cache(valoresEixo, ["mapa-eixos-v3-auto"], {
  tags: ["mapa-eixos"], revalidate: 120,
});
