import RadarClient from "./RadarClient";
import { getIndicadores, getDadosEixo, NUMEROS_EIXOS } from "../lib/bigquery-static";

// HTML pré-renderizado. O cache só é invalidado por publicação autorizada.
export const runtime = "nodejs";
export const revalidate = false;

export default async function Page() {
  const [indicadores, ...grupos] = await Promise.all([
    getIndicadores(),
    ...NUMEROS_EIXOS.map(numero => getDadosEixo(numero)),
  ]);
  return <RadarClient indicadores={indicadores} dadosEixo01={grupos.flat()} />;
}
