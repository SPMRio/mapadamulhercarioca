import RadarClient from "./RadarClient";
import { getIndicadores, getDadosEixo, NUMEROS_EIXOS } from "../lib/bigquery-static";

// Renderização dinâmica: cada visita verifica o cache atualizado dos 12 eixos.
// A importação invalida imediatamente o cache; uma atualização periódica de
// segurança evita que uma publicação esquecida mantenha dados antigos.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page() {
  const indicadores = await getIndicadores();
  const grupos = await Promise.all(NUMEROS_EIXOS.map(numero => getDadosEixo(numero)));
  return <RadarClient indicadores={indicadores} dadosEixo01={grupos.flat()} />;
}
