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
};
export type IndicadorRegistro = {
  indicador_id: string;
  titulo: string;
  tema: string;
  periodo: string;
  unidade: string;
  territorialidade: string;
  fonte: string;
  link_fonte: string;
  nota: string;
  observacoes: string;
  tipo_visualizacao: string;
};
export type DadoEixo01Registro = {
  id_indicador: string;
  periodo: string;
  territorio: string;
  categoria_recorte: string;
  serie_subrecorte: string;
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
async function query(table: string): Promise<Record<string, unknown>[]> {
  const auth = await accessToken();
  const response = await jsonRequest<QueryResult & {error?: {message?: string}}>(
    "https://bigquery.googleapis.com/bigquery/v2/projects/rj-spm-rio/queries",
    "POST",
    {
      query: `SELECT TO_JSON_STRING(t) AS linha_json FROM \`rj-spm-rio.projeto_mapa_mulher.${table}\` t LIMIT 1000`,
      useLegacySql: false, location: "southamerica-east1",
      maximumBytesBilled: "1000000000", timeoutMs: 10000, maxResults: 1000,
    },
    auth,
  );
  if (response.status !== 200) {
    if (/not found/i.test(response.data.error?.message ?? "")) throw new Error("table_not_found");
    throw new Error("Falha de consulta ao BigQuery.");
  }
  if (!response.data.jobComplete || response.data.pageToken) throw new Error("Consulta do BigQuery incompleta.");
  const fieldIndex = response.data.schema?.fields?.findIndex(field => field.name === "linha_json") ?? -1;
  if (fieldIndex < 0) throw new Error("Esquema inesperado no BigQuery.");
  return (response.data.rows ?? []).map(row => JSON.parse(String(row.f?.[fieldIndex]?.v ?? "{}")) as Record<string, unknown>);
}
const normalizarId = (id: unknown) => String(id ?? "").replace(/^(\d+(?:\.\d+)*)-(\d+)$/, "$1.$2");
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
    tema: normalizarEixo(row.eixo ?? row.tema),
    periodo: String(row.periodo ?? ""),
    unidade: String(row.unidade ?? ""),
    territorialidade: String(row.territorialidade ?? ""),
    fonte: String(row.fonte ?? ""),
    link_fonte: String(row.link_fonte ?? ""),
    nota: String(row.nota_metodologica ?? row.nota_indicador ?? row.nota ?? ""),
    observacoes: String(row.nota_metodologica ?? row.observacoes ?? ""),
    tipo_visualizacao: String(row.tipo_visualizacao ?? (indicador_id === "1.2.1" ? "linhas" : "")),
  })).filter(item => Boolean(item.indicador_id) && Boolean(item.titulo));
}
async function valoresEixo01() {
  const rows = await query("eixo_01_visao_geral");
  return rows.filter(row => !("publicar" in row) || String(row.publicar ?? "").toUpperCase() === "SIM")
    .map(row => ({
      id_indicador: normalizarId(row.indicador_id ?? row.id_indicador),
      periodo: String(row.periodo ?? ""),
      territorio: String(row.territorio ?? ""),
      categoria_recorte: String(row.categoria ?? row.categoria_recorte ?? ""),
      serie_subrecorte: String(row.serie ?? row.serie_subrecorte ?? ""),
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
// Os dados permanecem em cache até publicação explícita via /api/revalidate.
export const getIndicadores = unstable_cache(catalogo, ["mapa-catalogo-v5-eixo"], {
  tags: ["mapa-indicadores"], revalidate: false,
});
export const getEixo01 = unstable_cache(valoresEixo01, ["mapa-eixo01-v5-eixo"], {
  tags: ["mapa-eixo-01"], revalidate: false,
});
