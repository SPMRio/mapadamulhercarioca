import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function valido(recebido: string, esperado: string) {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Será acionado pelo serviço de ingestão SOMENTE após uma carga validada no BigQuery.
// POST /api/revalidate com Authorization: Bearer <REVALIDATE_SECRET>
// Corpo opcional: { "eixo": "01" } ou { "eixo": "todos" }.
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ ok: false, error: "Revalidação não configurada." }, { status: 503 });
  }
  const enviado = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!valido(enviado, secret)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  let eixo = "todos";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "eixo" in body) {
      eixo = String((body as { eixo?: unknown }).eixo ?? "todos");
    }
  } catch { /* Corpo vazio equivale a revalidar tudo. */ }
  if (!["01", "todos"].includes(eixo)) {
    return NextResponse.json({ ok: false, error: "Eixo inválido." }, { status: 400 });
  }

  revalidateTag("mapa-indicadores");
  if (eixo === "01" || eixo === "todos") revalidateTag("mapa-eixo-01");
  revalidatePath("/");
  return NextResponse.json({ ok: true, revalidado: eixo, pagina: "/", mensagem: "Cache invalidado. A página será regenerada no próximo acesso." }, {
    headers: { "Cache-Control": "no-store" },
  });
}
