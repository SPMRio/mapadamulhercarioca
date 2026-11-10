import RadarClient from "./RadarClient";
import { getIndicadores, getEixo01 } from "../lib/bigquery-static";

// HTML pré-renderizado. O cache só é invalidado por publicação autorizada.
export const runtime = "nodejs";
export const revalidate = false;

export default async function Page() {
  const [indicadores, dadosEixo01] = await Promise.all([getIndicadores(), getEixo01()]);
  return <RadarClient indicadores={indicadores} dadosEixo01={dadosEixo01} />;
}
