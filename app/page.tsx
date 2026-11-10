import RadarClient from "./RadarClient";
import { getIndicadores, getEixo01 } from "../lib/bigquery-static";

// A página HTML é gerada e servida do cache ISR, não consulta o banco a cada visitante.
export const runtime = "nodejs";
export const revalidate = 86400;

export default async function Page() {
  const [indicadores, dadosEixo01] = await Promise.all([getIndicadores(), getEixo01()]);
  return <RadarClient indicadores={indicadores} dadosEixo01={dadosEixo01} />;
}
