import { createSign } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_SPREADSHEET_ID =
  "1x1mAgU8B0afc7W0Obgl3qwgk8GJgAjq-gsaP619VYvw";

function base64url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function parseServiceAccount() {
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
      if (parsed?.client_email && parsed?.private_key) return parsed;
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

  const unsigned = header + "." + claim;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();

  const signature = base64url(signer.sign(serviceAccount.private_key));
  const assertion = unsigned + "." + signature;

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
    throw new Error("Não foi possível autenticar a conta de serviço Google.");
  }

  const json = await response.json();
  return json.access_token as string;
}

function normalizeTable(values: unknown[][] | undefined) {
  return Array.isArray(values) ? values : [];
}

function filterCareData(table: unknown[][]) {
  if (table.length < 2) return table;

  const header = table[0].map((item) => String(item ?? "").trim());
  const idIndex = header.indexOf("indicador_id");
  const chapterIndex = header.findIndex((name) =>
    ["capitulo", "capítulo", "tema"].includes(name.toLowerCase()),
  );

  const rows = table.slice(1).filter((row) => {
    const id = idIndex >= 0 ? String(row[idIndex] ?? "") : "";
    const chapter =
      chapterIndex >= 0
        ? String(row[chapterIndex] ?? "").toLowerCase()
        : "";

    return id.startsWith("3.") || chapter.includes("cuidado");
  });

  return [header, ...rows];
}

export async function GET() {
  try {
    const spreadsheetId =
      process.env.SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
    const accessToken = await getAccessToken();
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!accessToken && !apiKey) {
      throw new Error(
        "Configure uma conta de serviço Google ou GOOGLE_API_KEY.",
      );
    }

    const params = new URLSearchParams();
    params.append("ranges", "_indicadores");
    params.append("ranges", "dados");
    params.set("valueRenderOption", "UNFORMATTED_VALUE");
    params.set("dateTimeRenderOption", "FORMATTED_STRING");
    if (apiKey && !accessToken) params.set("key", apiKey);

    const response = await fetch(
      "https://sheets.googleapis.com/v4/spreadsheets/" +
        encodeURIComponent(spreadsheetId) +
        "/values:batchGet?" +
        params.toString(),
      {
        headers: accessToken
          ? { Authorization: "Bearer " + accessToken }
          : undefined,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        "Google Sheets respondeu com status " + response.status + ".",
      );
    }

    const json = await response.json();
    const ranges = json.valueRanges ?? [];
    const indicadores = normalizeTable(ranges[0]?.values);
    const dados = normalizeTable(ranges[1]?.values);

    return NextResponse.json(
      {
        indicadores,
        dados: {
          cuidado: filterCareData(dados),
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Erro ao carregar Mapa da Mulher Carioca:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os dados da planilha." },
      { status: 500 },
    );
  }
}
