import RadarClient from "./RadarClient";
import { getIndicadores, getEixo01 } from "../lib/bigquery-static";

// HTML pré-renderizado via ISR: revalida automaticamente a cada 5 minutos sob demanda de acesso.\n// A maioria das visitas recebe o HTML em cache, sem consulta ao BigQuery.
export const runtime = "nodejs";
export const revalidate = 300;

export default async function Page() {
  const [indicadores, dadosEixo01] = await Promise.all([getIndicadores(), getEixo01()]);
  return <RadarClient indicadores={indicadores} dadosEixo01={dadosEixo01} />;
}
