"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

// Eixos temáticos oficiais do catálogo. São exibidos mesmo antes da carga de dados.
const temas = [
  "Visão geral",
  "Violência",
  "Cuidados",
  "Segurança pública",
  "Meninas",
  "Saúde",
  "Educação",
  "Emprego e renda",
  "Cultura",
  "Assistência social",
  "Mulheres",
  "CODIM",
];

const faixas = [
  {
    label: "0–14",
    value: 19.2,
  },
  {
    label: "15–29",
    value: 21.8,
  },
  {
    label: "30–44",
    value: 23.6,
  },
  {
    label: "45–59",
    value: 19.4,
  },
  {
    label: "60+",
    value: 16,
  },
];

type Indicador = {
  indicador_id: string;
  titulo: string;
  periodo: string;
  unidade: string;
  territorialidade: string;
  fonte: string;
  link_fonte: string;
  nota: string;
  observacoes: string;
};

type DadoCuidado = {
  indicador_id: string;
  tema: string;
  periodo: string;
  territorialidade: string;
  linha: string;
  coluna: string;
  valor: number;
  valor_original: number;
  texto: string;
  metrica: string;
  tipo_valor: string;
  escala: string;
  unidade: string;
  fonte: string;
  link_fonte: string;
  observacoes: string;
  nota_dado: string;
  formato_original: string;
  publicar: string;
};

function tabelaParaObjetos<T>(tabela: unknown[][]): T[] {
  if (!Array.isArray(tabela) || tabela.length < 2) return [];

  const cabecalho = tabela[0].map(String);

  return tabela.slice(1).map((linha) =>
    Object.fromEntries(
      cabecalho.map((campo, indice) => [campo, linha[indice] ?? ""]),
    ) as T,
  );
}

function numero(valor: unknown): number {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function formatarValor(dado: DadoCuidado): string {
  const valorOriginal = numero(dado.valor);

  if (dado.tipo_valor === "percentual" || dado.metrica === "percentual") {
    const percentual = dado.escala === "0–1" ? valorOriginal * 100 : valorOriginal;
    return `${percentual.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })}%`;
  }

  if (dado.tipo_valor === "moeda") {
    return valorOriginal.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    });
  }

  if (dado.metrica === "horas" || dado.unidade.toLowerCase().includes("hora")) {
    return `${valorOriginal.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} h`;
  }

  return valorOriginal.toLocaleString("pt-BR", {
    maximumFractionDigits: dado.tipo_valor === "inteiro" ? 0 : 2,
  });
}

const gruposIndicadores = [
  { prefixo: "3.1-", titulo: "Trabalho de cuidado e afazeres domésticos" },
  { prefixo: "3.2-", titulo: "Maternidade" },
  { prefixo: "3.3-", titulo: "Responsabilidade familiar e ausência paterna" },
  { prefixo: "3.4-", titulo: "Creche e educação infantil" },
  { prefixo: "3.5-", titulo: "Mulheres idosas e violência" },
];

function Donut({ value = 53.6 }: { value?: number }) {
  const style = {
    "--value": `${value * 3.6}deg`,
  } as CSSProperties;

  return (
    <div className="donut" style={style}>
      <div>
        <strong>
          {String(value).replace(".", ",")}%
        </strong>

        <span>da população</span>
      </div>
    </div>
  );
}

function Bars() {
  const dados = [
    {
      label: "Até 6",
      mulheres: 51.5,
      homens: 48.1,
    },
    {
      label: "7–13",
      mulheres: 51,
      homens: 48.8,
    },
    {
      label: "14–17",
      mulheres: 37.4,
      homens: 62.4,
    },
    {
      label: "18–25",
      mulheres: 26.2,
      homens: 73.6,
    },
    {
      label: "26–35",
      mulheres: 30.2,
      homens: 69.6,
    },
    {
      label: "36–45",
      mulheres: 34.4,
      homens: 65.5,
    },
    {
      label: "46–60",
      mulheres: 39.7,
      homens: 60.2,
    },
    {
      label: "60+",
      mulheres: 46.6,
      homens: 53.3,
    },
  ];

  return (
    <div
      className="stack-chart"
      aria-label="Distribuição por sexo e faixa etária"
    >
      {dados.map((dado) => (
        <div
          className="stack-col"
          key={dado.label}
        >
          <div
            className="stack"
            title={`${dado.label}: ${dado.homens}% homens e ${dado.mulheres}% mulheres`}
          >
            <span
              className="women"
              style={{
                height: `${dado.mulheres}%`,
              }}
            >
              {dado.mulheres >= 34 &&
                `${String(dado.mulheres).replace(".", ",")}%`}
            </span>

            <span
              className="men"
              style={{
                height: `${dado.homens}%`,
              }}
            >
              {dado.homens >= 48 &&
                `${String(dado.homens).replace(".", ",")}%`}
            </span>
          </div>

          <small>{dado.label}</small>
        </div>
      ))}
    </div>
  );
}

function PainelCuidados({
  indicadores,
  dados,
  carregando,
  erro,
}: {
  indicadores: Indicador[];
  dados: DadoCuidado[];
  carregando: boolean;
  erro: string;
}) {
  const [indicadorSelecionado, setIndicadorSelecionado] =
    useState("3.1-1");

  const indicador = indicadores.find(
    (item) => item.indicador_id === indicadorSelecionado,
  );

  const linhas = dados.filter(
    (item) => item.indicador_id === indicadorSelecionado,
  );

  const metricas = Array.from(
    new Set(linhas.map((item) => item.metrica).filter(Boolean)),
  );

  const [metricaSelecionada, setMetricaSelecionada] =
    useState("");

  useEffect(() => {
    const preferida = metricas.includes("percentual")
      ? "percentual"
      : metricas[0] ?? "";

    setMetricaSelecionada(preferida);
  }, [indicadorSelecionado]);

  const linhasGrafico = linhas
    .filter(
      (item) =>
        (!metricaSelecionada || item.metrica === metricaSelecionada) &&
        item.coluna !== "Coluna 1",
    )
    .slice(0, 12);

  const maiorValor = Math.max(
    ...linhasGrafico.map((item) => Math.abs(numero(item.valor))),
    1,
  );

  function localizar(
    indicadorId: string,
    filtros: { linha?: string; coluna?: string; periodo?: string; tipo?: string },
  ) {
    return dados.find((item) => {
      if (item.indicador_id !== indicadorId) return false;
      if (filtros.linha && item.linha !== filtros.linha) return false;
      if (filtros.coluna && item.coluna !== filtros.coluna) return false;
      if (filtros.periodo && item.periodo !== filtros.periodo) return false;
      if (filtros.tipo && item.tipo_valor !== filtros.tipo) return false;
      return true;
    });
  }

  const horasMulheres = localizar("3.1-1", { coluna: "Mulheres" });
  const horasHomens = localizar("3.1-1", { coluna: "Homens" });
  const horasNegras = localizar("3.1-2", { coluna: "Negras" });
  const horasBrancas = localizar("3.1-2", { coluna: "Brancas" });
  const mulheresMaes = localizar("3.2-2", {
    linha: "Mães",
    tipo: "percentual",
  });
  const coberturaCreche = localizar("3.4-6", {
    periodo: "2024",
    coluna: "Percentual Rio de Janeiro",
    tipo: "percentual",
  });

  const diferencaGenero =
    numero(horasMulheres?.valor) - numero(horasHomens?.valor);
  const diferencaRacial =
    numero(horasNegras?.valor) - numero(horasBrancas?.valor);

  if (carregando) {
    return <div className="care-state">Carregando dados de Cuidados…</div>;
  }

  if (erro) {
    return <div className="care-state error">{erro}</div>;
  }

  return (
    <>
      <div className="section-title care-title">
        <span>03.</span>

        <div>
          <p>CUIDADOS</p>
          <h2>Quem cuida, quanto cuida e com qual apoio</h2>
          <small>
            Uma síntese sobre trabalho de cuidado, maternidade e acesso
            aos serviços no município do Rio de Janeiro.
          </small>
        </div>
      </div>

      <div className="care-kpis">
        <article className="care-kpi purple">
          <span>SOBRECARGA FEMININA</span>
          <strong>{horasMulheres ? formatarValor(horasMulheres) : "—"}</strong>
          <p>
            por semana, <b>{diferencaGenero.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} horas a mais</b> que os homens
          </p>
        </article>

        <article className="care-kpi lilac">
          <span>DESIGUALDADE RACIAL</span>
          <strong>{horasNegras ? formatarValor(horasNegras) : "—"}</strong>
          <p>
            entre mulheres negras, <b>{diferencaRacial.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} horas a mais</b> que entre brancas
          </p>
        </article>

        <article className="care-kpi white">
          <span>MULHERES QUE SÃO MÃES</span>
          <strong>{mulheresMaes ? formatarValor(mulheresMaes) : "—"}</strong>
          <p>Aproximadamente <b>1,97 milhão</b> de mulheres, em 2022</p>
        </article>

        <article className="care-kpi yellow">
          <span>ATENDIMENTO EM CRECHES</span>
          <strong>{coberturaCreche ? formatarValor(coberturaCreche) : "—"}</strong>
          <p><b>2,6 pontos percentuais abaixo</b> da meta do PNE, em 2024</p>
        </article>
      </div>

      <section className="indicator-explorer">
        <div className="explorer-head">
          <div>
            <span>BASE COMPLETA</span>
            <h3>Explore os indicadores de Cuidados</h3>
            <p>Selecione um indicador para abrir seus dados, fonte e notas.</p>
          </div>

          <label>
            INDICADOR
            <select
              value={indicadorSelecionado}
              onChange={(event) => setIndicadorSelecionado(event.target.value)}
            >
              {gruposIndicadores.map((grupo) => (
                <optgroup label={grupo.titulo} key={grupo.prefixo}>
                  {indicadores
                    .filter((item) => item.indicador_id.startsWith(grupo.prefixo))
                    .map((item) => (
                      <option value={item.indicador_id} key={item.indicador_id}>
                        {item.titulo.replace(/^\S+\s*-?\s*/, "")}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        {indicador && (
          <div className="indicator-detail">
            <div className="indicator-meta">
              <b>{indicador.indicador_id}</b>
              <span>{indicador.periodo || "Período não informado"}</span>
              <span>{indicador.territorialidade || "Município"}</span>
            </div>

            <h4>{indicador.titulo.replace(/^\S+\s*-?\s*/, "")}</h4>

            {metricas.length > 1 && (
              <div className="metric-tabs">
                {metricas.map((metrica) => (
                  <button
                    type="button"
                    className={metricaSelecionada === metrica ? "active" : ""}
                    onClick={() => setMetricaSelecionada(metrica)}
                    key={metrica}
                  >
                    {metrica}
                  </button>
                ))}
              </div>
            )}

            <div className="indicator-body">
              <div className="dynamic-chart">
                {linhasGrafico.map((item, index) => {
                  const largura = Math.max(
                    3,
                    (Math.abs(numero(item.valor)) / maiorValor) * 100,
                  );
                  const rotulo = [item.linha, item.coluna]
                    .filter(Boolean)
                    .filter((parte, posicao, lista) => lista.indexOf(parte) === posicao)
                    .join(" · ");

                  return (
                    <div className="dynamic-row" key={`${item.indicador_id}-${item.periodo}-${item.linha}-${item.coluna}-${index}`}>
                      <div>
                        <span>{rotulo}</span>
                        <b>{formatarValor(item)}</b>
                      </div>
                      <i style={{ width: `${largura}%` }} />
                    </div>
                  );
                })}
              </div>

              <div className="data-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Recorte</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((item, index) => (
                      <tr key={`${item.indicador_id}-${item.periodo}-${item.linha}-${item.coluna}-${index}`}>
                        <td>{item.linha}</td>
                        <td>{item.coluna}</td>
                        <td>{formatarValor(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="indicator-source">
              <p>
                <b>Fonte:</b> {indicador.fonte || linhas[0]?.fonte}
                {(indicador.link_fonte || linhas[0]?.link_fonte) && (
                  <>
                    {" "}
                    <a
                      href={indicador.link_fonte || linhas[0]?.link_fonte}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir fonte
                    </a>
                  </>
                )}
              </p>
              {(indicador.observacoes || linhas[0]?.observacoes) && (
                <p><b>Nota:</b> {indicador.observacoes || linhas[0]?.observacoes}</p>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

type DadoEixo01 = {
  id_indicador: string;
  periodo: string;
  territorio: string;
  categoria_recorte: string;
  serie_subrecorte: string;
  valor: string | number;
  publicar: string;
  atualizado_em?: string;
  tipo_valor?: string;
  escala?: string;
  texto?: string;
  unidade_dado?: string;
  nota_dado?: string;
  situacao?: string;
  ordem?: number;
};
function GraficoRendimento({ dados, aba }: { dados: DadoEixo01[]; aba: "grafico" | "tabela" }) {
  const publicados = dados.filter(d => d.id_indicador === "1.2.1" &&
    String(d.publicar).toUpperCase() === "SIM" &&
    ["Mulheres", "Homens"].includes(d.serie_subrecorte) &&
    Number.isFinite(Number(d.valor)));
  const [tooltip, setTooltip] = useState<null | { serie: string; periodo: string; valor: number; cor: string; left: number; top: number }>(null);
  if (!publicados.length) return null;
  const periodoOrdem = (p: string) => {
    const m = p.match(/^(?:([1-4])T(\d{4})|(\d{4})-T([1-4]))$/);
    return m ? Number(m[2] ?? m[3]) * 4 + Number(m[1] ?? m[4]) : Number.MAX_SAFE_INTEGER;
  };
  const periodos = Array.from(new Set(publicados.map(d => d.periodo)))
    .sort((a, b) => periodoOrdem(a) - periodoOrdem(b));
  const series = [
    { nome: "Mulheres", cor: "#7438b4" },
    { nome: "Homens", cor: "#259cc9" },
  ];
  const valores = publicados.map(d => Number(d.valor));
  const min = Math.floor(Math.min(...valores) / 250) * 250;
  const max = Math.ceil(Math.max(...valores) / 250) * 250;
  const amplitude = max > min ? max - min : 1;
  const W = 900, H = 390, left = 88, right = 28, top = 30, bottom = 54;
  const x = (i: number) => left + (periodos.length > 1 ? i / (periodos.length - 1) : 0.5) * (W-left-right);
  const y = (v: number) => top + (max-v)/amplitude * (H-top-bottom);
  const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const numeroGrafico = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const mostrarTooltip = (e: React.MouseEvent<SVGCircleElement> | React.FocusEvent<SVGCircleElement>, serie: string, periodo: string, valor: number, cor: string) => {
    const ponto = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest(".radar-real-chart")?.getBoundingClientRect();
    if (!container) return;
    setTooltip({ serie, periodo, valor, cor, left: ponto.left + ponto.width / 2 - container.left, top: ponto.top - container.top - 10 });
  };
  return (
    <div className="radar-real-chart">
      {aba === "grafico" && <>
      <div className="radar-series-legend">
        {series.map(serie => <span key={serie.nome}><i style={{ background: serie.cor }} />{serie.nome}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Rendimento médio mensal em reais por trimestre, mulheres e homens"
        style={{ width: "100%", height: "auto", display: "block" }}>
        {[0,1,2,3,4].map(i => {
          const valor = min + amplitude * i/4;
          return <g key={i}>
            <line x1={left} x2={W-right} y1={y(valor)} y2={y(valor)} stroke="#e4dfeb" />
            <text x={left-12} y={y(valor)+4} fontSize="14" fill="#52657b" textAnchor="end">{numeroGrafico(valor)}</text>
          </g>;
        })}
        {periodos.map((periodo, i) => <text key={periodo} x={x(i)} y={H-20}
          textAnchor="middle" fontSize="14" fill="#30435f">{periodo}</text>)}
        {series.map(serie => {
          const pontos = periodos.map((periodo, i) => {
            const dado = publicados.find(d => d.periodo === periodo && d.serie_subrecorte === serie.nome);
            return dado ? { periodo, indice: i, valor: Number(dado.valor) } : null;
          }).filter((p): p is { periodo: string; indice: number; valor: number } => p !== null);
          return <g key={serie.nome}>
            {pontos.length > 1 && <polyline points={pontos.map(p => `${x(p.indice)},${y(p.valor)}`).join(" ")}
              fill="none" stroke={serie.cor} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" className="radar-animated-line" pathLength={1} />}
            {pontos.map(p => <circle key={p.periodo} cx={x(p.indice)} cy={y(p.valor)} r="6"
              fill={serie.cor} stroke="#fff" strokeWidth="2" tabIndex={0} role="img"
              aria-label={`${serie.nome}, ${p.periodo}: ${numeroGrafico(p.valor)}`}
              onMouseEnter={e => mostrarTooltip(e, serie.nome, p.periodo, p.valor, serie.cor)}
              onMouseMove={e => mostrarTooltip(e, serie.nome, p.periodo, p.valor, serie.cor)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={e => mostrarTooltip(e, serie.nome, p.periodo, p.valor, serie.cor)}
              onBlur={() => setTooltip(null)}
            />)}
          </g>;
        })}
      </svg>
      {tooltip && (
        <div className="radar-chart-tooltip" style={{ left: tooltip.left, top: tooltip.top }} role="status">
          <span className="radar-tooltip-series"><i style={{ background: tooltip.cor }} />{tooltip.serie}</span>
          <strong>{tooltip.periodo}</strong>
          <b>{numeroGrafico(tooltip.valor)}</b>
        </div>
      )}
      </>}
      {aba === "tabela" && <div className="radar-data-table-wrap radar-table-standalone">
        <table>
          <thead><tr><th>Trimestre</th><th>Mulheres</th><th>Homens</th></tr></thead>
          <tbody>{periodos.map(periodo => <tr key={periodo}>
            <td>{periodo}</td>
            {series.map(serie => {
              const dado = publicados.find(d => d.periodo === periodo && d.serie_subrecorte === serie.nome);
              return <td key={serie.nome}>{dado ? moeda(Number(dado.valor)) : "—"}</td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
  );
}


// As visualizações são geradas pelos registros da tabela de dados do eixo, não por constantes no front-end.
function VisualizacaoEixo1({ indicador, dados, aba }: { indicador: Indicador & { tipo_visualizacao?: string }; dados: DadoEixo01[]; aba: "grafico" | "tabela" }) {
  const [metrica, setMetrica] = useState("");
  const [ordem, setOrdem] = useState<"maior" | "menor">("maior");
  const validos = dados.filter(d => d.id_indicador === indicador.indicador_id && Number.isFinite(Number(d.valor)));
  const tipo = indicador.tipo_visualizacao || "";
  const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const fmt = (d: DadoEixo01) => {
    const n = Number(d.valor);
    if (d.tipo_valor === "moeda" || d.unidade_dado === "R$") return moeda(n);
    if (d.unidade_dado === "%") return `${(d.escala === "0–1" ? n * 100 : n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    if (d.unidade_dado === "posição") return `${n}º`;
    return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  };
  if (!validos.length) return <div className="radar-chart-empty"><p>Dados ainda não disponíveis.</p></div>;
  if (tipo === "cards" && aba === "grafico") return (
    <>
      <div className="radar-world-grid">
        {[...validos].sort((a,b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map((d,i) => (
          <article className="radar-world-card" key={`${d.categoria_recorte}-${i}`}>
            <span className="radar-world-card-label">{d.periodo} · {d.territorio}</span>
            <strong>{fmt(d)}</strong>
            <h4>{d.categoria_recorte}</h4>
            <p>{d.texto}</p>
          </article>
        ))}
      </div>
    </>
  );
  const isPir = tipo === "piramide";
  const metricas = Array.from(new Set(validos.map(d => d.serie_subrecorte).filter(Boolean)));
  const uf = tipo === "barras_uf";
  const grupoTaxa = (m: string) => /taxa/i.test(m);
  const metricaAtual = metricas.includes(metrica) ? metrica : (metricas.find(m => !grupoTaxa(m)) || metricas[0]);
  const linhas = uf
    ? validos.filter(d => d.serie_subrecorte === metricaAtual && d.categoria_recorte !== "Brasil")
    : validos.filter(d => d.tipo_valor !== "texto" && (indicador.indicador_id !== "1.2.6" || d.tipo_valor === "percentual"));
  const periodos = Array.from(new Set(linhas.map(d => d.periodo))).sort((a,b) => a.localeCompare(b, "pt-BR"));
  const seriesLinha = Array.from(new Set(linhas.map(d => d.serie_subrecorte))).filter(Boolean);
  const valoresLinha = linhas.map(d => d.escala === "0–1" ? Number(d.valor)*100 : Number(d.valor));
  const minLinha = Math.min(0, ...valoresLinha);
  const maxLinha = Math.max(minLinha+1,...valoresLinha);
  const linhaX = (i: number) => 76 + (periodos.length > 1 ? i/(periodos.length-1) : .5)*700;
  const linhaY = (v: number) => 250-(v-minLinha)/(maxLinha-minLinha)*210;
  const ordered = uf ? [...linhas].sort((a,b) => ordem === "maior" ? Number(b.valor)-Number(a.valor) : Number(a.valor)-Number(b.valor)) : linhas;
  const max = Math.max(1,...ordered.map(d => Math.abs(Number(d.valor))));
  const avisos = Array.from(new Set(validos.filter(d => d.situacao && d.situacao !== "conferido").map(d => d.situacao)));
  const serieX = tipo === "linhas" || tipo === "barras_populacao";
  return (
    <div className="radar-dynamic-view">
      {uf && aba === "grafico" && <div className="radar-view-controls">
        {metricas.map(m => <button type="button" key={m} className={metricaAtual === m ? "active" : ""} onClick={() => setMetrica(m)}>{m}</button>)}
        <button type="button" onClick={() => setOrdem(v => v === "maior" ? "menor" : "maior")}>Ordenar: {ordem === "maior" ? "maiores" : "menores"}</button>
      </div>}
      {serieX && aba === "grafico" && <div className="radar-view-legend">
        {Array.from(new Set(ordered.map(d => d.serie_subrecorte))).filter(Boolean).map(m => <span key={m}>{m}</span>)}
      </div>}
      {aba === "grafico" && tipo === "linhas" && <svg viewBox="0 0 820 290" className="radar-eixo-linechart" role="img"
        aria-label={`Evolução de ${indicador.titulo}`}>
        {[0,1,2,3,4].map(i => {
          const v = minLinha+(maxLinha-minLinha)*i/4;
          return <g key={i}><line x1="76" x2="776" y1={linhaY(v)} y2={linhaY(v)} stroke="#e8e0ec" />
            <text x="65" y={linhaY(v)+5} fontSize="12" textAnchor="end" fill="#53657c">{v.toLocaleString("pt-BR",{maximumFractionDigits:1})}</text></g>;
        })}
        {periodos.map((p,i) => <text key={p} x={linhaX(i)} y="277" fontSize="12" textAnchor="middle" fill="#53657c">{p}</text>)}
        {seriesLinha.map((serie,i) => {
          const cor = ["#7030b5","#42b3df","#e19c29","#21977e"][i%4];
          const coords = periodos.map((p,j) => {
            const d = linhas.find(x => x.periodo === p && x.serie_subrecorte === serie);
            if (!d) return null;
            return { x: linhaX(j), y: linhaY(d.escala === "0–1" ? Number(d.valor)*100 : Number(d.valor)), label: fmt(d) };
          }).filter((x): x is {x:number;y:number;label:string} => x !== null);
          return <g key={serie}>{coords.length>1 && <polyline points={coords.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={cor} strokeWidth="3" className="radar-animated-line" pathLength={1} />}
            {coords.map((p,j)=><circle key={j} cx={p.x} cy={p.y} r="5" fill={cor} stroke="white" strokeWidth="2"><title>{serie}: {p.label}</title></circle>)}
          </g>;
        })}
      </svg>}
      {aba === "grafico" && <div className={tipo === "linhas" ? "radar-dynamic-bars radar-bars-secondary" : "radar-dynamic-bars"}>
        {ordered.map((d,i) => (
          <div className={`radar-dynamic-line${d.categoria_recorte === "RJ" ? " highlight" : ""}`} key={`${d.periodo}-${d.categoria_recorte}-${d.serie_subrecorte}-${i}`}>
            <div className="radar-dynamic-meta">
              <span>{isPir ? `${d.categoria_recorte} · ${d.serie_subrecorte}` : (uf ? d.categoria_recorte : `${d.periodo} · ${d.categoria_recorte} · ${d.serie_subrecorte}`)}</span>
              <strong>{fmt(d)}</strong>
            </div>
            <div className="radar-dynamic-track"><div style={{width:`${Math.max(1, Math.abs(Number(d.valor))/max*100)}%`}} /></div>
          </div>
        ))}
      </div>}
      {aba === "tabela" && <div className="radar-data-table-wrap radar-table-standalone">
        <table><thead><tr><th>Período</th><th>Categoria</th><th>Série</th><th>Valor</th></tr></thead>
          <tbody>{ordered.map((d,i) => <tr key={i}><td>{d.periodo}</td><td>{d.categoria_recorte}</td><td>{d.serie_subrecorte}</td><td>{fmt(d)}</td></tr>)}</tbody>
        </table>
      </div>}
      {avisos.length > 0 && <p className="radar-data-notice">Alguns registros ainda exigem conferência de fonte, escala ou total. Consulte a documentação antes de utilizar esses dados como definitivos.</p>}
    </div>
  );
}

function tituloPublico(titulo: string) {
  const nome = titulo.replace(/^\s*\d+(?:\.\d+)*(?:-\d+)?\s*[-–—:]?\s*/, "").trim();
  return /dados em texto corrido/i.test(nome) ? "Desigualdade de gênero no mundo" : nome;
}

export default function RadarClient({
  indicadores,
  dadosEixo01,
}: {
  indicadores: (Indicador & { tema?: string; status_publicacao?: string; tipo_visualizacao?: string; atualizado_em?: string })[];
  dadosEixo01: DadoEixo01[];
}) {
  const carregando = false;
  const erro = "";
  const erroDados = "";
  const carregandoDados = false;
  const [tema, setTema] = useState(temas[0]);
  const [indicadorId, setIndicadorId] = useState("");
  const [abaVisualizacao, setAbaVisualizacao] = useState<"grafico" | "tabela">("grafico");
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [buscaIndicador, setBuscaIndicador] = useState("");
  const seletorRef = useRef<HTMLDivElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  const indicadoresDoTema = useMemo(() =>
    indicadores.filter(item =>
      String(item.tema ?? "").toLocaleLowerCase("pt-BR") === tema.toLocaleLowerCase("pt-BR")
    ), [indicadores, tema],
  );
  const selecionado = indicadoresDoTema.find(item => item.indicador_id === indicadorId);

  const indicadoresFiltrados = useMemo(() => {
    const busca = buscaIndicador.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
    return indicadoresDoTema.filter(item =>
      tituloPublico(item.titulo).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(busca)
    );
  }, [indicadoresDoTema, buscaIndicador]);
  useEffect(() => {
    if (!seletorAberto) return;
    const fecharFora = (event: PointerEvent) => {
      if (seletorRef.current && !seletorRef.current.contains(event.target as Node)) setSeletorAberto(false);
    };
    const fecharEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSeletorAberto(false);
    };
    document.addEventListener("pointerdown", fecharFora);
    document.addEventListener("keydown", fecharEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharFora);
      document.removeEventListener("keydown", fecharEscape);
    };
  }, [seletorAberto]);
  useEffect(() => {
    if (seletorAberto) buscaRef.current?.focus();
  }, [seletorAberto]);
  function selecionarTema(novoTema: string) {
    setTema(novoTema);
    setIndicadorId("");
    setAbaVisualizacao("grafico");
    setSeletorAberto(false);
    setBuscaIndicador("");
  }

  return (
    <main>
      <div className="color-band" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Mapa da Mulher Carioca - início">
          <span>MAPA DA MULHER CARIOCA</span><b>Digital</b>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#dados">Dados</a><a href="#sobre">Sobre</a>
        </nav>
        <button className="download" type="button" onClick={() => window.print()}>
          Baixar relatório <span>↓</span>
        </button>
      </header>
      <section className="intro" id="inicio">
        <div className="eyebrow"><span>MAPA DA MULHER CARIOCA DIGITAL</span><i>✦</i></div>
        <h1>Radar de Dados — Visão Geral</h1>
        <p>Um retrato vivo das desigualdades, conquistas e condições de vida das mulheres cariocas,
          organizado para apoiar políticas públicas e transformar a cidade.</p>
        <div className="meta">
          <span>Indicadores organizados por eixo temático</span>
          <span>Fontes identificadas em cada indicador</span>
        </div>
      </section>
      <section className="dashboard" id="dados">
        <aside className="sidebar">
          <p>RADAR DE DADOS</p>
          <div className="theme-list">
            {temas.map((item, index) => (
              <button type="button" className={tema === item ? "active" : ""}
                onClick={() => selecionarTema(item)} key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item === "Visão geral" ? "Visão Geral Radar de Dados" : item}
              </button>
            ))}
          </div>
          <div className="source-note"><i>↗</i>
            <p><b>Dados abertos</b><br />Consulte as fontes de cada indicador publicado.</p>
          </div>
        </aside>
        <div className="content">
          <div className="section-title">
            <span>{String(temas.indexOf(tema) + 1).padStart(2, "0")}.</span>
            <div>
              <p>RADAR DE DADOS</p>
              <h2>{tema === "Visão geral" ? "Visão Geral Radar de Dados" : tema}</h2>
            </div>
          </div>

          <section className="radar-overview" aria-label={`Painel de infográficos de ${tema}`}>
            <div className="radar-overview-heading">
              <h3>Panorama do eixo</h3>
              <p>Espaços reservados para os infográficos que serão selecionados para destaque.</p>
            </div>
            <div className="radar-infographic-grid">
              {["Destaque do eixo", "Evolução dos dados", "Comparativo"].map((nome, index) => (
                <article className="radar-infographic-card" key={nome}>
                  <span className="radar-infographic-top">INFOGRÁFICO {String(index + 1).padStart(2, "0")}</span>
                  <div className="radar-infographic-placeholder" aria-hidden="true">
                    <div className="radar-infographic-symbol">{index === 0 ? "✦" : index === 1 ? "↗" : "◫"}</div>
                  </div>
                  <h4>{nome}</h4>
                  <p>Indicador a definir</p>
                </article>
              ))}
            </div>
          </section>

          <section className="radar-explorer" aria-label="Explorar indicadores do eixo">
            <div className="radar-explorer-heading">
              <div>
                <span>EXPLORE OS DADOS</span>
                <h3>Indicadores de {tema}</h3>
              </div>
            </div>
            {carregando ? (
              <div className="care-state">Carregando indicadores…</div>
            ) : erro ? (
              <div className="care-state error">{erro}</div>
            ) : indicadoresDoTema.length === 0 && tema !== "Visão geral" ? (
              <div className="care-state">Os indicadores deste eixo ainda não foram publicados.</div>
            ) : (
              <>
                <div className="radar-indicator-select" ref={seletorRef}>
                  <span className="radar-select-label">SELECIONE UM INDICADOR</span>
                  <button type="button" className={`radar-select-trigger${seletorAberto ? " is-open" : ""}`}
                    aria-haspopup="listbox" aria-expanded={seletorAberto} aria-controls="radar-indicator-options"
                    onClick={() => { setBuscaIndicador(""); setSeletorAberto(aberto => !aberto); }}>
                    <span>{selecionado ? tituloPublico(selecionado.titulo) : "Escolha um indicador"}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {seletorAberto && (
                    <div className="radar-select-menu">
                      <div className="radar-select-search">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input ref={buscaRef} type="search" value={buscaIndicador}
                          aria-label="Buscar indicador" placeholder="Buscar indicador pelo nome..."
                          onChange={event => setBuscaIndicador(event.target.value)} />
                      </div>
                      <div id="radar-indicator-options" className="radar-select-options" role="listbox" aria-label="Indicadores disponíveis">
                        {indicadoresFiltrados.map(item => (
                          <button type="button" role="option" key={item.indicador_id}
                            aria-selected={indicadorId === item.indicador_id}
                            className={`radar-select-option${indicadorId === item.indicador_id ? " selected" : ""}`}
                            onClick={() => { setIndicadorId(item.indicador_id); setAbaVisualizacao("grafico"); setSeletorAberto(false); setBuscaIndicador(""); }}>
                            <span>{tituloPublico(item.titulo)}</span>
                            {indicadorId === item.indicador_id && <span className="radar-option-check" aria-hidden="true">✓</span>}
                          </button>
                        ))}
                        {indicadoresFiltrados.length === 0 && (
                          <div className="radar-select-empty">Nenhum indicador encontrado.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {selecionado && (
                  <article className="panel wide radar-indicator">
                    <div className="panel-head">
                      <div>
                        <h3>{tituloPublico(selecionado.titulo)}</h3>
                      </div>
                    </div>
                    <div className="radar-indicator-tags">
                      <span>{selecionado.tema}</span>
                      {Array.from(new Set(dadosEixo01.filter(d => d.id_indicador === selecionado.indicador_id).map(d => d.territorio).filter(Boolean))).slice(0, 2).map(t => <span key={t}>{t}</span>)}
                      {Array.from(new Set(dadosEixo01.filter(d => d.id_indicador === selecionado.indicador_id).map(d => d.unidade_dado).filter(Boolean))).slice(0, 2).map(u => <span key={u}>{u}</span>)}
                    </div>
                    <div className="radar-indicator-tabs" role="tablist" aria-label="Visualização dos dados">
                      <button type="button" role="tab" id="indicador-aba-grafico" aria-controls="indicador-conteudo" aria-selected={abaVisualizacao === "grafico"}
                        className={abaVisualizacao === "grafico" ? "active" : ""} onClick={() => setAbaVisualizacao("grafico")}>Gráfico</button>
                      <button type="button" role="tab" id="indicador-aba-tabela" aria-controls="indicador-conteudo" aria-selected={abaVisualizacao === "tabela"}
                        className={abaVisualizacao === "tabela" ? "active" : ""} onClick={() => setAbaVisualizacao("tabela")}>Tabela</button>
                    </div>
                    <div className="radar-indicator-preview" id="indicador-conteudo" role="tabpanel" aria-labelledby={abaVisualizacao === "grafico" ? "indicador-aba-grafico" : "indicador-aba-tabela"} key={`${selecionado.indicador_id}-${abaVisualizacao}`}>
                      {abaVisualizacao === "tabela" && (
                        <div className="radar-table-update">
                          <strong>Última atualização:</strong>{" "}
                          {selecionado.atualizado_em
                            ? new Date(selecionado.atualizado_em.replace(" ", "T").replace(/(\+00(:00)?|Z)?$/, "Z")).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })
                            : "Ainda não registrada"}
                        </div>
                      )}
                      {dadosEixo01.some(d => d.id_indicador === selecionado.indicador_id) ? (
                        selecionado.indicador_id === "1.2.1" ? <GraficoRendimento dados={dadosEixo01} aba={abaVisualizacao} /> : <VisualizacaoEixo1 indicador={selecionado} dados={dadosEixo01} aba={abaVisualizacao} />
                      ) : (
                        <div className="radar-chart-empty" role="status">
                          <div className="radar-chart-grid" aria-hidden="true" />
                          <div className="radar-chart-message">
                            <strong>{carregandoDados ? "Carregando dados…" : erroDados || "Dados ainda não disponíveis"}</strong>
                            <p>O gráfico aparecerá quando os dados deste indicador estiverem publicados.</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="radar-indicator-footer">
                      <div>
                        <strong>Fonte</strong>
                        {selecionado.link_fonte ? (
                          <p><a href={selecionado.link_fonte} target="_blank" rel="noopener noreferrer" className="radar-source-direct">
                            {selecionado.fonte?.trim() || "Abrir fonte original"} ↗
                          </a></p>
                        ) : (
                          <p>{selecionado.fonte?.trim() || "Fonte não cadastrada"}</p>
                        )}
                      </div>
                      <div>
                        <strong>Última atualização do indicador</strong>
                        <p>{selecionado.atualizado_em
                          ? new Date(selecionado.atualizado_em.replace(" ", "T").replace(/(\+00(:00)?|Z)?$/, "Z")).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })
                          : "Data ainda não registrada no BigQuery"}</p>
                      </div>
                      {selecionado.observacoes && (
                        <div><strong>Nota metodológica</strong><p>{selecionado.observacoes}</p></div>
                      )}
                    </div>
                  </article>
                )}
              </>
            )}
          </section>
        </div>
      </section>
      <footer id="sobre">
        <div><b>MAPA DA<br />MULHER CARIOCA</b><span>2026</span></div>
        <p>Uma iniciativa da Secretaria Especial de Políticas para Mulheres e Cuidados da Prefeitura do Rio.</p>
        <div className="footer-links">
          <a href="#dados">Metodologia</a>
          <a href="#dados">Fontes dos dados</a>
          <a href="#inicio">Voltar ao topo ↑</a>
        </div>
      </footer>
    </main>
  );
}
