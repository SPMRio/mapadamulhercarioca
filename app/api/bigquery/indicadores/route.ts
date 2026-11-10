import { createSign } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Account = { client_email: string; private_key: string; project_id: string };
type BigQueryCell = { v?: unknown };
type BigQueryResult = {
  jobComplete?: boolean;
  schema?: { fields?: { name: string; type?: string }[] };
  rows?: { f?: BigQueryCell[] }[];
  pageToken?: string;
};

function credentials(): Account {
  const raw = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("BigQuery sem credencial.");
  const account = JSON.parse(raw) as Partial<Account>;
  if (!account.client_email || !account.private_key || account.project_id !== "rj-spm-rio") {
    throw new Error("Credenciais do BigQuery inválidas.");
  }
  return account as Account;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function token(account: Account): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    base64url(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/bigquery",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + "." + base64url(signer.sign(account.private_key.replace(/\\n/g, "\n")));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Autenticação Google indisponível.");
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Google não retornou acesso.");
  return body.access_token;
}

function normalizeValue(cell: BigQueryCell | undefined): string {
  const value = cell?.v;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function GET() {
  try {
    const auth = await token(credentials());
    const response = await fetch("https://bigquery.googleapis.com/bigquery/v2/projects/rj-spm-rio/queries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "SELECT TO_JSON_STRING(t) AS linha_json FROM `rj-spm-rio.projeto_mapa_mulher.indicador` AS t LIMIT 1000",
        useLegacySql: false,
        location: "southamerica-east1",
        maximumBytesBilled: "1000000000",
        timeoutMs: 10000,
        maxResults: 1000,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { error?: { errors?: { reason?: string }[]; status?: string; message?: string } } | null;
      console.error("Falha de consulta BigQuery:", response.status, detail?.error?.message);
      const reason = detail?.error?.errors?.[0]?.reason ?? detail?.error?.status ?? "http_error";
      throw new Error(`query_http_${response.status}_${String(reason).replace(/[^a-zA-Z0-9_-]/g, "")}`);
    }
    const payload = (await response.json()) as BigQueryResult;
    if (!payload.jobComplete) throw new Error("job_pending");
    if (payload.pageToken) throw new Error("pagination_required");
    const columns = payload.schema?.fields?.map(field => field.name) ?? [];
    if (!columns.includes("linha_json")) throw new Error("schema_missing_row_json");
    const index = columns.indexOf("linha_json");
    const indicadores = (payload.rows ?? []).map(row => {
      const raw = normalizeValue(row.f?.[index]);
      if (!raw) return {};
      const decoded: unknown = JSON.parse(raw);
      return decoded && typeof decoded === "object" && !Array.isArray(decoded)
        ? decoded as Record<string, unknown> : {};
    });
    const normalizados = indicadores.map((row) => ({ ...row, indicador_id: String(row.indicador_id ?? row.id_indicador ?? "") }));
    const firstColumns = indicadores.length > 0 ? Object.keys(indicadores[0]) : [];
    // Indicate when the source's original key differs from the dashboard's ID.
    const contemId = firstColumns.includes("indicador_id");
    return NextResponse.json(
      { ok: true, fonte: "bigquery", indicadores: normalizados, colunas: firstColumns, possui_indicador_id: contemId },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("Indicadores BigQuery:", error instanceof Error ? error.message : "erro");
    const detail = error instanceof Error ? error.message : "unknown";
    const safeCode = /^(query_http_[0-9]{3}_[a-zA-Z0-9_-]+|job_pending|pagination_required|schema_missing_indicador_id|schema_missing_row_json)$/.test(detail) ? detail : "auth_or_server_error";
    return NextResponse.json(
      { ok: false, error: "Não foi possível carregar os indicadores do BigQuery.", codigo: safeCode },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
