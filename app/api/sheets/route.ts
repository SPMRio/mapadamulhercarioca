import { createSign } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SheetRow = Record<string, unknown>;

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function base64url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function parseServiceAccount(): ServiceAccount | null {
  const raw =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ||
    process.env.SERVICE_ACCOUNT_B64;

  if (!raw) return null;

  const candidates = [raw];

  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {}

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.client_email && parsed?.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
      }
    } catch {}
  }

  throw new Error("Credencial Google inválida.");
}

async function getAccessToken() {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const assertion = `${unsigned}.${base64url(
    signer.sign(serviceAccount.private_key),
  )}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Falha ao autenticar no Google:", response.status, details);
    throw new Error("Não foi possível autenticar a conta de serviço Google.");
  }

  const json = await response.json();
  return json.access_token as string;
}

function normalizeTable(values: unknown[][] | undefined) {
  return Array.isArray(values) ? values : [];
}

function tableToObjects(table: unknown[][]): SheetRow[] {
  if (table.length < 2) return [];
  const header = table[0].map((item) => String(item ?? "").trim());

  return table.slice(1).map((row) =>
    Object.fromEntries(
      header.map((field, index) => [field, row[index] ?? ""]),
    ),
  );
}

function objectsToTable(rows: SheetRow[], columns: string[]) {
  return [
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ];
}

function isPublished(row: SheetRow) {
  const value = String(row.Publicar ?? row.publicar ?? "SIM")
    .trim()
    .toUpperCase();
  return value !== "NÃO" && value !== "NAO" && value !== "FALSE";
}

function normalizeMetric(type: string, unit: string) {
  const normalizedType = type.toLowerCase();
  const normalizedUnit = unit.toLowerCase();

  if (normalizedType === "percentual" || normalizedUnit === "%") {
    return "percentual";
  }
  if (normalizedType === "moeda") return "moeda";
  if (normalizedType === "taxa") return "taxa";
  if (normalizedUnit.includes("hora")) return "horas";
  if (normalizedType === "texto") return "texto";
  return normalizedType || normalizedUnit || "valor";
}

function transformIndicators(table: unknown[][]) {
  const rows = tableToObjects(table).map((row) => ({
    indicador_id: String(row.indicador_id ?? ""),
    id_original: String(row.id_original ?? row.indicador_id ?? ""),
    tema: String(row.tema ?? ""),
    titulo: String(row.titulo ?? ""),
    periodo: String(row.periodo ?? ""),
    unidade: String(row.unidade ?? ""),
    territorialidade: String(row.territorialidade ?? ""),
    fonte: String(row.fonte ?? ""),
    link_fonte: String(row.link_fonte ?? ""),
    nota: String(row.nota_indicador ?? ""),
    observacoes: String(row.nota_indicador ?? ""),
    status_publicacao: String(row.status_publicacao ?? ""),
    tipo_visualizacao: String(row.tipo_visualizacao ?? ""),
    aba: String(row.aba ?? ""),
  }));

  return objectsToTable(rows, [
    "indicador_id",
    "id_original",
    "tema",
    "titulo",
    "periodo",
    "unidade",
    "territorialidade",
    "fonte",
    "link_fonte",
    "nota",
    "observacoes",
    "status_publicacao",
    "tipo_visualizacao",
    "aba",
  ]);
}

function transformData(table: unknown[][]) {
  const rows = tableToObjects(table)
    .filter(isPublished)
    .map((row) => {
      const tipoValor = String(row["Tipo de dado"] ?? "");
      const unidade = String(row.Unidade ?? "");
      const valor = row.Valor ?? "";

      return {
        indicador_id: String(row.indicador_id ?? ""),
        tema: String(row.tema ?? ""),
        periodo: String(row["Período"] ?? ""),
        territorialidade: String(row["Território"] ?? ""),
        linha: String(row["Categoria / recorte"] ?? ""),
        coluna: String(row["Série / subrecorte"] ?? ""),
        valor,
        valor_original: valor,
        texto: String(row.Texto ?? ""),
        metrica: normalizeMetric(tipoValor, unidade),
        tipo_valor: tipoValor,
        escala: String(row.Escala ?? "valor direto"),
        unidade,
        fonte: String(row.Fonte ?? ""),
        link_fonte: String(row["Link da fonte"] ?? ""),
        observacoes: String(row["Nota do dado"] ?? ""),
        nota_dado: String(row["Nota do dado"] ?? ""),
        formato_original: String(row.formato_original ?? ""),
        publicar: String(row.Publicar ?? "SIM"),
      };
    });

  return objectsToTable(rows, [
    "indicador_id",
    "tema",
    "periodo",
    "territorialidade",
    "linha",
    "coluna",
    "valor",
    "valor_original",
    "texto",
    "metrica",
    "tipo_valor",
    "escala",
    "unidade",
    "fonte",
    "link_fonte",
    "observacoes",
    "nota_dado",
    "formato_original",
    "publicar",
  ]);
}

function filterByTheme(table: unknown[][], theme: string) {
  if (table.length < 2) return table;

  const header = table[0].map((item) => String(item ?? ""));
  const themeIndex = header.indexOf("tema");
  if (themeIndex < 0) return [header];

  const wanted = theme.trim().toLowerCase();
  return [
    header,
    ...table.slice(1).filter((row) =>
      String(row[themeIndex] ?? "").trim().toLowerCase().includes(wanted),
    ),
  ];
}

export async function GET() {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID?.trim();
    if (!spreadsheetId) {
      throw new Error("SPREADSHEET_ID não configurado.");
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");
    }

    const params = new URLSearchParams();
    params.append("ranges", "_indicadores!A:M");
    params.append("ranges", "dados!A:P");
    params.set("valueRenderOption", "UNFORMATTED_VALUE");
    params.set("dateTimeRenderOption", "FORMATTED_STRING");

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId,
      )}/values:batchGet?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("Google Sheets API:", response.status, details);
      throw new Error(`Google Sheets respondeu com status ${response.status}.`);
    }

    const json = await response.json();
    const ranges = json.valueRanges ?? [];
    const rawIndicators = normalizeTable(ranges[0]?.values);
    const rawData = normalizeTable(ranges[1]?.values);

    const indicadores = transformIndicators(rawIndicators);
    const dados = transformData(rawData);

    return NextResponse.json(
      {
        ok: true,
        indicadores,
        dados: {
          todos: dados,
          cuidado: filterByTheme(dados, "cuidados"),
          violencia: filterByTheme(dados, "violência"),
          meninas: filterByTheme(dados, "meninas"),
          saude: filterByTheme(dados, "saúde"),
          educacao: filterByTheme(dados, "educação"),
          empregoRenda: filterByTheme(dados, "emprego e renda"),
          cultura: filterByTheme(dados, "cultura"),
          assistenciaSocial: filterByTheme(dados, "assistência social"),
          segurancaPublica: filterByTheme(dados, "segurança pública"),
          mulheres: filterByTheme(dados, "mulheres"),
          visaoGeral: filterByTheme(dados, "visão geral"),
          codim: filterByTheme(dados, "codim"),
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Erro ao carregar Mapa da Mulher Carioca:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Não foi possível carregar os dados da planilha.",
      },
      { status: 500 },
    );
  }
}
