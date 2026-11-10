import { createSign } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Read-only BigQuery connection check. No private key or Google token is sent
 * to the browser. The SQL is fixed server-side, not user-supplied.
 */
type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
};

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function credentials(): ServiceAccount {
  const raw = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("BIGQUERY_SERVICE_ACCOUNT_JSON não configurada.");
  let parsed: Partial<ServiceAccount>;
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  } catch {
    throw new Error("BIGQUERY_SERVICE_ACCOUNT_JSON deve conter JSON válido.");
  }
  if (!parsed.client_email || !parsed.private_key || parsed.project_id !== "rj-spm-rio") {
    throw new Error("Conta de serviço do BigQuery inválida ou projeto incorreto.");
  }
  return parsed as ServiceAccount;
}

async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64url(signer.sign(account.private_key.replace(/\\n/g, "\n")))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Falha de autenticação Google (${response.status}).`);
  const result = (await response.json()) as { access_token?: string };
  if (!result.access_token) throw new Error("Google não retornou token.");
  return result.access_token;
}

export async function GET() {
  try {
    const account = credentials();
    const token = await accessToken(account);
    const response = await fetch("https://bigquery.googleapis.com/bigquery/v2/projects/rj-spm-rio/queries", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "SELECT COUNT(*) AS total_indicadores FROM `rj-spm-rio.projeto_mapa_mulher.indicador`",
        useLegacySql: false,
        location: "southamerica-east1",
        maximumBytesBilled: "1000000000",
        timeoutMs: 10000,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("BigQuery query failure:", response.status);
      throw new Error("Consulta ao BigQuery falhou.");
    }
    const result = (await response.json()) as {
      jobComplete?: boolean;
      rows?: { f?: { v?: string }[] }[];
    };
    if (!result.jobComplete) throw new Error("Consulta não concluída no prazo.");
    const total = Number(result.rows?.[0]?.f?.[0]?.v ?? 0);
    return NextResponse.json(
      { ok: true, fonte: "bigquery", projeto: "rj-spm-rio", total_indicadores: total },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("BigQuery:", error instanceof Error ? error.message : "erro desconhecido");
    return NextResponse.json(
      { ok: false, error: "Não foi possível consultar o BigQuery." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
