"use client";

import RadarInfografico from "./RadarInfografico";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

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

const tituloEixo = (tema: string) => tema === "Visão geral" ? "Radar de Dados" : tema;

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
  descricao?: string;
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

// Formatação apenas visual: o valor original do período continua no BigQuery.
function exibirPeriodo(periodo: string): string {
  const valor = periodo.trim();
  const trimestre = valor.match(/^(\d{4})-T([1-4])$/i) ?? valor.match(/^([1-4])T-(\d{4})$/i);
  if (trimestre) {
    const ano = /^\d{4}/.test(valor) ? trimestre[1] : trimestre[2];
    const numero = /^\d{4}/.test(valor) ? trimestre[2] : trimestre[1];
    return `${ano} | ${numero}º trimestre`;
  }
  return valor;
}

type DadoEixo01 = {
  id_indicador: string;
  periodo: string;
  territorio: string;
  categoria_recorte: string;
  serie_subrecorte: string;
  metrica?: string;
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
  // O recorte por gênero pode estar na coluna Série ou Categoria da planilha.
  const genero = (d: DadoEixo01) => {
    const recortes = [d.serie_subrecorte, d.categoria_recorte]
      .map(v => (v ?? "").trim().toLocaleLowerCase("pt-BR"));
    if (recortes.includes("mulheres")) return "Mulheres";
    if (recortes.includes("homens")) return "Homens";
    return "";
  };
  const publicados = dados.filter(d => d.id_indicador === "1.2.1" &&
    String(d.publicar).trim().toUpperCase() === "SIM" &&
    Boolean(genero(d)) &&
    Number.isFinite(Number(d.valor)));
  const [tooltip, setTooltip] = useState<null | { serie: string; periodo: string; valor: number; cor: string; left: number; top: number }>(null);
  if (!publicados.length) return (
    <div className="radar-chart-empty" role="status">
      <p>Não há dados publicados com os recortes Homens e Mulheres neste indicador. Confira as colunas Série e Categoria do Eixo 01.</p>
    </div>
  );
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
            <text x={left-12} y={y(valor)+4} fontSize="14" fill="#52657b" textAnchor="end">{moeda(valor)}</text>
          </g>;
        })}
        {periodos.map((periodo, i) => <text key={periodo} x={x(i)} y={H-20}
          textAnchor="middle" fontSize="14" fill="#30435f">{exibirPeriodo(periodo)}</text>)}
        {series.map(serie => {
          const pontos = periodos.map((periodo, i) => {
            const dado = publicados.find(d => d.periodo === periodo && genero(d) === serie.nome);
            return dado ? { periodo, indice: i, valor: Number(dado.valor) } : null;
          }).filter((p): p is { periodo: string; indice: number; valor: number } => p !== null);
          return <g key={serie.nome}>
            {pontos.length > 1 && <polyline points={pontos.map(p => `${x(p.indice)},${y(p.valor)}`).join(" ")}
              fill="none" stroke={serie.cor} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" className="radar-animated-line" pathLength={1} />}
            {pontos.map(p => <circle key={p.periodo} cx={x(p.indice)} cy={y(p.valor)} r="6"
              fill={serie.cor} stroke="#fff" strokeWidth="2" tabIndex={0} role="img"
              aria-label={`${serie.nome}, ${exibirPeriodo(p.periodo)}: ${moeda(p.valor)}`}
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
          <strong>{exibirPeriodo(tooltip.periodo)}</strong>
          <b>{moeda(tooltip.valor)}</b>
        </div>
      )}
      </>}
      {aba === "tabela" && <div className="radar-data-table-wrap radar-table-standalone">
        <table>
          <thead><tr><th>Trimestre</th><th>Mulheres</th><th>Homens</th></tr></thead>
          <tbody>{periodos.map(periodo => <tr key={periodo}>
            <td>{exibirPeriodo(periodo)}</td>
            {series.map(serie => {
              const dado = publicados.find(d => d.periodo === periodo && genero(d) === serie.nome);
              return <td key={serie.nome}>{dado ? moeda(Number(dado.valor)) : "—"}</td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
  );
}


// Tooltip centralizado e posicionado fora das áreas com rolagem dos gráficos.
// Mede o tamanho real da caixa e escolhe automaticamente acima ou abaixo da barra.
function BarraComTooltip({
  className, style, cor, serie, categoria, valor, ariaLabel,
}: {
  className: string;
  style?: CSSProperties;
  cor: string;
  serie: string;
  categoria?: string;
  valor: string;
  ariaLabel: string;
}) {
  const barra = useRef<HTMLDivElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(false);
  const [posicao, setPosicao] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (!ativo || !barra.current || !caixa.current) return;
    const localizar = () => {
      if (!barra.current || !caixa.current) return;
      const alvo = barra.current.getBoundingClientRect();
      const tooltip = caixa.current.getBoundingClientRect();
      const margem = 10;
      const espacoAcima = alvo.top - margem;
      const espacoAbaixo = window.innerHeight - alvo.bottom - margem;
      const colocarAcima = espacoAcima >= tooltip.height + margem ||
        (espacoAcima >= espacoAbaixo && espacoAcima >= tooltip.height);
      const x = Math.max(margem, Math.min(alvo.left + alvo.width / 2 - tooltip.width / 2, window.innerWidth - tooltip.width - margem));
      const idealY = colocarAcima ? alvo.top - tooltip.height - margem : alvo.bottom + margem;
      const y = Math.max(margem, Math.min(idealY, window.innerHeight - tooltip.height - margem));
      setPosicao({x, y});
    };
    localizar();
    window.addEventListener("resize", localizar);
    // Evita tooltip parado durante rolagem vertical/horizontal.
    window.addEventListener("scroll", localizar, true);
    return () => {
      window.removeEventListener("resize", localizar);
      window.removeEventListener("scroll", localizar, true);
    };
  }, [ativo]);
  return <>
    <div ref={barra} className={className} style={style} role="img" tabIndex={0}
      aria-label={ariaLabel}
      onMouseEnter={() => {setPosicao(null);setAtivo(true);}}
      onMouseLeave={() => setAtivo(false)}
      onFocus={() => {setPosicao(null);setAtivo(true);}}
      onBlur={() => setAtivo(false)} />
    {ativo && createPortal(
      <div ref={caixa} className="radar-unified-tooltip radar-tooltip-floating" role="status"
        style={{left:posicao?.x ?? -9999,top:posicao?.y ?? -9999,visibility:posicao ? "visible" : "hidden"}}>
        <strong><i style={{background:cor}} />{serie}</strong>
        {categoria && categoria !== serie && <span>{categoria}</span>}
        <b>{valor}</b>
      </div>, document.body
    )}
  </>;
}


/** Para comparar categorias em barras, exibe o registro mais recente de cada
 * combinação de território/categoria/série/métrica. Não altera o histórico
 * usado pelas tabelas e pelas evoluções temporais. */
function ordenarPeriodo(periodo: string): number {
  const valor = String(periodo ?? "").trim();
  const anos = [...valor.matchAll(/(?:19|20)\d{2}/g)].map(m => Number(m[0]));
  if (!anos.length) return -1;
  const ano = Math.max(...anos);
  const anoNoInicio = valor.match(/^((?:19|20)\d{2})[\-\/.](\d{1,2})(?:\D|$)/);
  const trimestre = valor.match(/(?:T|TRI(?:MESTRE)?)[\s.-]*([1-4])/i)
    ?? valor.match(/^([1-4])\s*T[\s.-]*(?:19|20)\d{2}/i);
  const semestre = valor.match(/(?:S|SEM(?:ESTRE)?)[\s.-]*([12])/i);
  const mes = anoNoInicio && Number(anoNoInicio[1]) === ano && Number(anoNoInicio[2]) <= 12
    ? Number(anoNoInicio[2]) : trimestre ? Number(trimestre[1]) * 3
    : semestre ? Number(semestre[1]) * 6 : 0;
  return ano * 100 + mes;
}
function registrosMaisRecentes<T extends DadoEixo01>(registros: T[]): T[] {
  const grupos = new Map<string, T>();
  for (const registro of registros) {
    const chave = JSON.stringify([
      registro.territorio?.trim().toLowerCase(), registro.categoria_recorte?.trim().toLowerCase(),
      registro.serie_subrecorte?.trim().toLowerCase(), registro.metrica?.trim().toLowerCase(),
      registro.unidade_dado?.trim().toLowerCase(), registro.tipo_valor?.trim().toLowerCase()
    ]);
    const anterior = grupos.get(chave);
    if (!anterior || ordenarPeriodo(registro.periodo) > ordenarPeriodo(anterior.periodo) ||
      (ordenarPeriodo(registro.periodo) === ordenarPeriodo(anterior.periodo) &&
       String(registro.atualizado_em ?? "") > String(anterior.atualizado_em ?? ""))) {
      grupos.set(chave, registro);
    }
  }
  return Array.from(grupos.values());
}

// Barras agrupadas: as séries ficam lado a lado dentro da mesma categoria.
function GraficoBarrasAgrupadas({ dados, titulo }: { dados: DadoEixo01[]; titulo: string }) {
  const series = Array.from(new Set(dados.map(d => d.serie_subrecorte.trim()).filter(Boolean)))
    .sort((a, b) => {
      const ordemSerie = (nome: string) => /mulher/i.test(nome) ? 0 : /homem/i.test(nome) ? 1 : 2;
      return ordemSerie(a) - ordemSerie(b) || a.localeCompare(b, "pt-BR");
    });
  const territorios = new Set(dados.map(d => d.territorio.trim()).filter(Boolean));
  const grupos = new Map<string, { rotulo: string; valores: Map<string, DadoEixo01> }>();
  for (const d of dados) {
    // Séries de uma mesma categoria podem ter períodos de referência diferentes.
    // Isso não cria uma segunda categoria; o período fica no tooltip de cada barra.
    const rotulo = [territorios.size > 1 ? d.territorio : "", d.categoria_recorte].filter(Boolean).join(" · ");
    const chave = JSON.stringify([d.territorio, d.categoria_recorte, d.metrica ?? ""]);
    if (!grupos.has(chave)) grupos.set(chave, { rotulo, valores: new Map() });
    grupos.get(chave)!.valores.set(d.serie_subrecorte.trim(), d);
  }
  const linhas = Array.from(grupos.values());
  const muitasCategorias = linhas.length > 9;
  const porcentagem = dados.every(d => d.unidade_dado?.trim() === "%" ||
    /percentual|proporção/i.test(d.metrica ?? "") || d.escala === "0–1");
  const fator = porcentagem && dados.every(d => Math.abs(Number(d.valor)) <= 1) ? 100 : 1;
  const valor = (d: DadoEixo01) => Number(d.valor) * fator;
  const maior = Math.max(0, ...dados.map(d => Math.max(0, valor(d))));
  const bruto = Math.max(0.25, maior / 4);
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const normalizado = bruto / potencia;
  const passo = (normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10) * potencia;
  const teto = Math.max(passo, Math.ceil(maior / passo) * passo);
  const numero = (n: number) => n.toLocaleString("pt-BR", {maximumFractionDigits: porcentagem ? 2 : Number.isInteger(passo) ? 0 : 2});
  const formato = (n: number) => numero(n) + (porcentagem ? "%" : "");
  const cor = (serie: string, i: number) => /mulher/i.test(serie) ? "#7132b2"
    : /homem/i.test(serie) ? "#42b9eb"
    : ["#a66ddd","#269c85","#dc9c32","#4066ad","#c58df1"][i % 5];
  return <div className="radar-grouped-root">
    <div className="radar-view-legend">
      {series.map((serie, i) => <span key={serie} className="radar-grouped-legend">
        <i style={{background:cor(serie,i)}} aria-hidden="true" />{serie}
      </span>)}
    </div>
    {muitasCategorias ? <div className="radar-horizontal-chart radar-grouped-horizontal" role="region" aria-label={`Barras agrupadas: ${titulo}`}>
      {linhas.map((grupo,i) => <div key={i} className="radar-horizontal-group">
        <h5>{grupo.rotulo}</h5>
        {series.map((serie,j) => {
          const dado = grupo.valores.get(serie);
          if (!dado) return null;
          const n = Math.max(0,valor(dado));
          return <div className="radar-horizontal-row" key={serie}>
            <div className="radar-horizontal-meta"><span>{serie}</span><strong>{formato(n)}</strong></div>
            <div className="radar-horizontal-track">
              {[0,1,2,3,4].map(t=><i key={t} className="radar-horizontal-gridline" style={{left:`${t*25}%`}}/>)}
              <BarraComTooltip className="radar-horizontal-bar"
                style={{width:`${n/teto*100}%`,backgroundColor:cor(serie,j)}}
                cor={cor(serie,j)} serie={serie} categoria={`${grupo.rotulo} · ${exibirPeriodo(dado.periodo)}`}
                valor={formato(n)} ariaLabel={`${grupo.rotulo}, ${serie}, ${exibirPeriodo(dado.periodo)}: ${formato(n)}`} />
            </div>
          </div>;
        })}
      </div>)}
    </div> : <div className="radar-grouped-scroll" role="region" tabIndex={0} aria-label={`Barras agrupadas: ${titulo}`}>
      <div className="radar-grouped-chart">
        <div className="radar-grouped-plot">
          {[0,1,2,3,4].map(i => <div key={i} className="radar-grouped-gridline" style={{bottom:`${i*25}%`}}>
            <span>{formato(teto*i/4)}</span>
          </div>)}
          <div className="radar-grouped-categories">
            {linhas.map((grupo,i) => <div className="radar-grouped-category" key={i}>
              <div className="radar-grouped-bars">
                {series.map((serie,j) => {
                  const dado = grupo.valores.get(serie);
                  if (!dado) return <div key={serie} className="radar-grouped-bar-slot"/>;
                  const n = Math.max(0, valor(dado));
                  return <div className="radar-grouped-bar-slot" key={serie}>
                    <BarraComTooltip className="radar-grouped-bar"
                      style={{height:`${n/teto*100}%`,backgroundColor:cor(serie,j)}}
                      cor={cor(serie,j)} serie={serie} categoria={`${grupo.rotulo} · ${exibirPeriodo(dado.periodo)}`} valor={formato(n)}
                      ariaLabel={`${grupo.rotulo}, ${serie}, ${exibirPeriodo(dado.periodo)}: ${formato(n)}`} />
                  </div>;
                })}
              </div>
              <span className="radar-grouped-label" title={grupo.rotulo}>{grupo.rotulo}</span>
            </div>)}
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

// Barras empilhadas: uma barra por combinação de dimensões, uma cor por série.
// Valores são agregados somente dentro da mesma combinação de período, território,
// categoria, série e métrica; nunca mistura métricas distintas.
function GraficoBarrasEmpilhadas({ dados, titulo }: { dados: DadoEixo01[]; titulo: string }) {
  const [metricaSelecionada, setMetricaSelecionada] = useState("");
  const validos = dados.filter(d => d.tipo_valor !== "texto" && String(d.valor).trim() !== "" && Number.isFinite(Number(d.valor)));
  const metricas = Array.from(new Set(validos.map(d => (d.metrica ?? "").trim()).filter(Boolean)));
  const metrica = metricas.includes(metricaSelecionada) ? metricaSelecionada : metricas[0] || "";
  const linhas = metricas.length > 1 ? validos.filter(d => (d.metrica ?? "").trim() === metrica) : validos;
  const distintos = (selecionar: (d: DadoEixo01) => string) =>
    new Set(linhas.map(d => selecionar(d).trim()).filter(Boolean)).size;
  const multiTerritorio = distintos(d => d.territorio) > 1;
  const multiCategoria = distintos(d => d.categoria_recorte) > 1;
  const multiPeriodo = distintos(d => d.periodo) > 1;
  const multiSerie = distintos(d => d.serie_subrecorte) > 1;
  // Se não há série, categorias são segmentos quando o eixo distingue territórios/períodos.
  const categoriaComoSerie = !multiSerie && !linhas.some(d => d.serie_subrecorte.trim()) &&
    multiCategoria && (multiTerritorio || multiPeriodo);
  const grupo = (d: DadoEixo01) => {
    const partes = [
      multiTerritorio ? d.territorio : "",
      multiCategoria && !categoriaComoSerie ? d.categoria_recorte : "",
      multiPeriodo ? exibirPeriodo(d.periodo) : "",
    ].filter(Boolean);
    return partes.join(" · ") || d.categoria_recorte || d.territorio || exibirPeriodo(d.periodo) || "Total";
  };
  const serie = (d: DadoEixo01) => categoriaComoSerie ? d.categoria_recorte :
    d.serie_subrecorte || (multiCategoria ? "Total" : d.categoria_recorte || "Valor");
  const registros = new Map<string, { nome: string; partes: Map<string, number> }>();
  const nomesSeries: string[] = [];
  const percentual = linhas.length > 0 && linhas.every(d =>
    d.unidade_dado?.trim() === "%" || /percentual|proporção/i.test(d.metrica ?? "")
  );
  const valoresFracionarios = percentual && linhas.every(d => Math.abs(Number(d.valor)) <= 1);
  const fator = valoresFracionarios ? 100 : 1;
  let existemNegativos = false;
  for (const d of linhas) {
    const valor = Number(d.valor) * fator;
    if (valor < 0) { existemNegativos = true; continue; }
    const nome = grupo(d);
    const nomeSerie = serie(d);
    if (!nomesSeries.includes(nomeSerie)) nomesSeries.push(nomeSerie);
    if (!registros.has(nome)) registros.set(nome, { nome, partes: new Map() });
    const partes = registros.get(nome)!.partes;
    partes.set(nomeSerie, (partes.get(nomeSerie) ?? 0) + valor);
  }
  const barras = Array.from(registros.values());
  const maior = Math.max(0, ...barras.map(b => Array.from(b.partes.values()).reduce((a, v) => a + v, 0)));
  const passoBruto = Math.max(0.01, maior / 4);
  const potencia = 10 ** Math.floor(Math.log10(passoBruto));
  const n = passoBruto / potencia;
  const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * potencia;
  const teto = Math.max(passo, Math.ceil(maior / passo) * passo);
  const casas = percentual ? 2 : Number.isInteger(passo) ? 0 : 2;
  const numero = (valor: number) => valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
  const formato = (valor: number) => numero(valor) + (percentual ? "%" : "");
  const cores = ["#7132b2", "#42b9eb", "#a66ddd", "#269c85", "#dc9c32", "#c58df1", "#4066ad", "#dc6d97"];
  if (!barras.length) return <div className="radar-chart-empty"><p>Dados ainda não disponíveis para barras empilhadas.</p></div>;
  return <div className="radar-stacked-root">
    {metricas.length > 1 && <div className="radar-view-controls" aria-label="Selecionar métrica">
      {metricas.map(m => <button type="button" key={m} className={metrica === m ? "active" : ""} onClick={() => setMetricaSelecionada(m)}>{m}</button>)}
    </div>}
    <div className="radar-view-legend">
      {nomesSeries.map((nome, i) => <span key={nome} className="radar-stacked-legend-item">
        <i style={{ background: cores[i % cores.length] }} aria-hidden="true" />{nome}
      </span>)}
    </div>
    <div className="radar-stacked-scroll" role="region" tabIndex={0} aria-label={`Gráfico de barras empilhadas: ${titulo}`}>
      <div className="radar-stacked-chart" style={{ minWidth: `${Math.max(560, barras.length * 100)}px` }}>
        <div className="radar-stacked-plot">
          {[0,1,2,3,4].map(i => <div className="radar-stacked-gridline" key={i} style={{ bottom: `${i * 25}%` }}>
            <span>{formato(teto * i / 4)}</span>
          </div>)}
          <div className="radar-stacked-columns">
            {barras.map(barra => {
              const total = Array.from(barra.partes.values()).reduce((a, v) => a + v, 0);
              return <div className="radar-stacked-item" key={barra.nome}>
                <div className="radar-stacked-stack" style={{ height: `${total / teto * 100}%` }} aria-label={`${barra.nome}: ${formato(total)}`}>
                  {nomesSeries.map((nome, i) => {
                    const valor = barra.partes.get(nome) ?? 0;
                    if (valor <= 0) return null;
                    return <BarraComTooltip key={nome} className="radar-stacked-segment"
                      style={{ height: `${valor / total * 100}%`, background: cores[i % cores.length] }}
                      cor={cores[i % cores.length]} serie={nome} categoria={barra.nome} valor={formato(valor)}
                      ariaLabel={`${barra.nome}, ${nome}: ${formato(valor)}`} />;
                  })}
                </div>
                <span className="radar-stacked-label" title={barra.nome}>{barra.nome}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
    {existemNegativos && <p className="radar-data-notice">Valores negativos não foram incluídos nas barras empilhadas.</p>}
  </div>;
}


/** Série histórica por recorte: só liga pontos de observações do mesmo
 * território, categoria, série, métrica e unidade. Não mistura períodos distintos. */
function chaveSerieHistorica(d: DadoEixo01): string {
  return JSON.stringify([d.territorio?.trim(),d.categoria_recorte?.trim(),d.serie_subrecorte?.trim(),
    d.metrica?.trim(),d.unidade_dado?.trim(),d.tipo_valor?.trim()]);
}
function HistoricoIndicador({dados,formatar}:{dados:DadoEixo01[];formatar:(d:DadoEixo01)=>string}) {
  const [chaveAtiva,setChaveAtiva] = useState("");
  const series = Array.from(dados.reduce((grupos,d) => {
    const key=chaveSerieHistorica(d);
    if (!grupos.has(key)) grupos.set(key,[]);
    grupos.get(key)!.push(d);
    return grupos;
  },new Map<string,DadoEixo01[]>()).entries())
    .map(([chave,registros]) => {
      const porPeriodo=new Map<string,DadoEixo01>();
      for (const d of registros) {
        const periodo=d.periodo.trim();
        if (!periodo) continue;
        const anterior=porPeriodo.get(periodo);
        if (!anterior || String(d.atualizado_em??"")>String(anterior.atualizado_em??"")) porPeriodo.set(periodo,d);
      }
      const valores=Array.from(porPeriodo.values()).sort((a,b)=>
        ordenarPeriodo(a.periodo)-ordenarPeriodo(b.periodo) || a.periodo.localeCompare(b.periodo,"pt-BR",{numeric:true}));
      const exemplo=registros[0];
      const nome=[exemplo.territorio,exemplo.categoria_recorte,exemplo.serie_subrecorte,exemplo.metrica]
        .map(x=>String(x??"").trim()).filter(Boolean).join(" · ") || "Total";
      return {chave,nome,valores};
    }).filter(item=>item.valores.length>=2)
    .sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR",{numeric:true}));
  const escolhida=series.find(s=>s.chave===chaveAtiva)??series[0];
  if (!escolhida) return <p className="radar-history-empty">Não há dois períodos comparáveis para construir uma evolução histórica deste recorte.</p>;
  const valores=escolhida.valores;
  const numeros=valores.map(d=>d.escala==="0–1"&&(d.unidade_dado==="%"||/percentual|proporção/i.test(d.metrica??""))
    ? Number(d.valor)*100:Number(d.valor));
  const minimo=Math.min(0,...numeros),maximo=Math.max(0,...numeros);
  const alcance=Math.max(1,maximo-minimo);
  const x=(i:number)=>78+(valores.length === 1 ? 0.5 : i / (valores.length - 1))*748;
  const y=(valor:number)=>272-(valor-minimo)/alcance*220;
  const pontos=numeros.map((valor,i)=>`${x(i)},${y(valor)}`).join(" ");
  const unidadePercentual=valores.every(d=>d.unidade_dado==="%" || /percentual|proporção/i.test(d.metrica??""));
  const numeroEixo=(n:number)=>n.toLocaleString("pt-BR",{maximumFractionDigits:unidadePercentual?2:Math.abs(n)<10?2:0});
  return <div className="radar-history-view">
    <div className="radar-history-filter">
      <label htmlFor="radar-history-series">Recorte da série histórica</label>
      <select id="radar-history-series" value={escolhida.chave} onChange={e=>setChaveAtiva(e.target.value)}>
        {series.map(serie=><option key={serie.chave} value={serie.chave}>{serie.nome}</option>)}
      </select>
    </div>
    <p className="radar-history-note">Evolução de {valores.length} períodos disponíveis. Cada ponto representa um dado registrado para o mesmo recorte.</p>
    <div className="radar-history-figure">
      <svg viewBox="0 0 900 335" role="img" aria-label={`Evolução histórica: ${escolhida.nome}`} preserveAspectRatio="xMidYMid meet">
        {[0,1,2,3,4].map(t=>{
          const valor=minimo+alcance*t/4;
          return <g key={t}><line x1="78" x2="826" y1={y(valor)} y2={y(valor)} stroke="#e8dfee" strokeWidth="1.5"/>
            <text x="68" y={y(valor)+4} textAnchor="end" fontSize="12" fill="#52627b">{numeroEixo(valor)}</text></g>;
        })}
        {valores.length>1&&<polyline points={pontos} fill="none" stroke="#7132b2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>}
        {valores.map((d,i)=><g key={d.periodo}>
          <circle cx={x(i)} cy={y(numeros[i])} r="7" fill="#7132b2" stroke="#fff" strokeWidth="3"/>
          <title>{`${exibirPeriodo(d.periodo)}: ${formatar(d)}`}</title>
          <text x={x(i)} y="307" textAnchor="middle" fontSize="12" fill="#293b60">{exibirPeriodo(d.periodo)}</text>
        </g>)}
      </svg>
    </div>
    <div className="radar-history-values" aria-label="Valores da série histórica">
      {valores.map((d,i)=><div key={d.periodo}>
        <small>{exibirPeriodo(d.periodo)}</small><strong>{formatar(d)}</strong>
        {i>0&&numeros[i-1]!==0&&<span>{((numeros[i]/numeros[i-1]-1)*100)>=0?"+":""}{((numeros[i]/numeros[i-1]-1)*100).toLocaleString("pt-BR",{maximumFractionDigits:1})}% em relação ao período anterior</span>}
      </div>)}
    </div>
  </div>;
}

// As visualizações são geradas pelos registros da tabela de dados do eixo, não por constantes no front-end.
function VisualizacaoEixo1({ indicador, dados, aba }: { indicador: Indicador & { tipo_visualizacao?: string }; dados: DadoEixo01[]; aba: "grafico" | "tabela" }) {
  const [metrica, setMetrica] = useState("");
  const [ordem, setOrdem] = useState<"maior" | "menor">("maior");
  const [visaoPeriodo,setVisaoPeriodo] = useState<"atual"|"historico">("atual");
  const [pontoAtivo, setPontoAtivo] = useState<null | {periodo:string;serie:string;valor:string;cor:string;x:number;y:number}>(null);
  const [fatiaAtiva, setFatiaAtiva] = useState<number | null>(null);
  const registros = dados.filter(d => d.id_indicador === indicador.indicador_id);
  const validos = registros.filter(d => String(d.valor).trim() !== "" && Number.isFinite(Number(d.valor)));
  const tipoCadastrado = (indicador.tipo_visualizacao || "").trim().toLowerCase();
  // Para este eixo, a apresentação solicitada prevalece sobre metadados ainda não republicados.
  // O catálogo continua disponível para os outros indicadores.
  const tipo = indicador.indicador_id === "1.2.3" ? "pizza"
    : ["1.2.2", "1.2.5"].includes(indicador.indicador_id) ? "barras"
    : tipoCadastrado;
  const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const fmt = (d: DadoEixo01) => {
    const n = Number(d.valor);
    if (d.tipo_valor === "moeda" || d.unidade_dado === "R$") return moeda(n);
    if (d.unidade_dado === "%" || /proporção|percentual/i.test(d.metrica ?? "")) return `${(d.escala === "0–1" ? n * 100 : n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    if (/100\s*mil/i.test(d.unidade_dado ?? "") || /taxa/i.test(d.metrica ?? "")) return n.toLocaleString("pt-BR", {maximumFractionDigits: 5});
    if (d.unidade_dado === "posição") return `${n}º`;
    return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  };
  if (tipo === "texto" && aba === "grafico") return (
    <div className="radar-world-grid">
      {registros.filter(d => d.texto?.trim()).map((d, i) => (
        <article className="radar-world-card" key={i}>
          <span className="radar-world-card-label">{[d.periodo, d.territorio].filter(Boolean).join(" · ")}</span>
          <h4>{d.categoria_recorte || "Informação"}</h4>
          <p>{d.texto}</p>
        </article>
      ))}
    </div>
  );
  if (!validos.length && tipo !== "texto") return <div className="radar-chart-empty"><p>Dados ainda não disponíveis.</p></div>;
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
  // Pizza genérica: usa categorias reais, independentemente de sexo.
  // Nunca acrescenta linhas de total como uma fatia adicional.
  if (tipo === "pizza" && aba === "grafico") {
    const eTotal = (nome: string) => /^(total|total geral|população total)$/i.test(nome.trim());
    const etiquetas = validos.map(d => d.categoria_recorte.trim() || d.serie_subrecorte.trim()).filter(Boolean);
    const usarSerie = new Set(etiquetas).size <= 1 &&
      new Set(validos.map(d => d.serie_subrecorte.trim()).filter(Boolean)).size > 1;
    const nomeFatia = (d: DadoEixo01) => usarSerie
      ? d.serie_subrecorte.trim() || d.categoria_recorte.trim()
      : d.categoria_recorte.trim() || d.serie_subrecorte.trim();
    const grupos = new Map<string, number>();
    for (const d of validos) {
      const nome = nomeFatia(d);
      const valor = Number(d.valor);
      if (!nome || eTotal(nome) || !Number.isFinite(valor) || valor < 0) continue;
      grupos.set(nome, (grupos.get(nome) ?? 0) + valor);
    }
    const fatias = Array.from(grupos, ([nome, valor]) => ({ nome, valor })).filter(f => f.valor > 0);
    const total = fatias.reduce((soma, f) => soma + f.valor, 0);
    if (fatias.length < 2 || total <= 0) return <div className="radar-chart-empty"><p>Não há pelo menos duas categorias com valores positivos para este gráfico de pizza.</p></div>;
    const cores = ["#42b9eb", "#7132b2", "#a66ddd", "#269c85", "#dc9c32", "#c58df1", "#4066ad", "#dc6d97", "#7654af", "#c35c83"];
    const coresFatia = fatias.map((f, i) => /^(homens|meninos)$/i.test(f.nome) ? "#42b9eb"
      : /^(mulheres|meninas)$/i.test(f.nome) ? "#7132b2" : cores[i % cores.length]);
    const percentual = validos.every(d => d.unidade_dado?.trim() === "%" ||
      /percentual|proporção/i.test(d.metrica ?? "") || d.escala === "0–1");
    const fracao = percentual && fatias.every(f => f.valor <= 1);
    const formatoPercentual = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + "%";
    const unidades = Array.from(new Set(validos.map(d => d.unidade_dado?.trim()).filter(Boolean)));
    const unidade = unidades.length === 1 ? unidades[0] : "";
    let acumulado = 0;
    const partes = fatias.map((f, i) => {
      const inicio = acumulado;
      const participacao = f.valor / total * 100;
      acumulado += participacao;
      return {
        ...f,
        cor: coresFatia[i],
        inicio,
        fim: acumulado,
        participacao,
        valorExibido: percentual ? formatoPercentual(fracao ? f.valor * 100 : f.valor)
          : f.valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + (unidade ? ` ${unidade}` : ""),
      };
    });
    const coordenada = (graus: number) => {
      const radianos = (graus - 90) * Math.PI / 180;
      return { x: 100 + 99 * Math.cos(radianos), y: 100 + 99 * Math.sin(radianos) };
    };
    const caminho = (inicio: number, fim: number) => {
      const a = coordenada(inicio * 3.6);
      const b = coordenada(fim * 3.6);
      return `M 100 100 L ${a.x} ${a.y} A 99 99 0 ${fim - inicio > 50 ? 1 : 0} 1 ${b.x} ${b.y} Z`;
    };
    const ativa = fatiaAtiva !== null ? partes[fatiaAtiva] : null;
    return <div className="radar-pie-layout">
      <div className="radar-pie-interactive">
        <svg viewBox="0 0 200 200" className="radar-pie-circle" role="group"
          aria-label="Gráfico de pizza interativo. Passe o mouse ou use Tab para consultar cada fatia.">
          {partes.map((f,i) => <path key={f.nome}
            d={caminho(f.inicio, f.fim)}
            fill={f.cor}
            tabIndex={0}
            role="img"
            aria-label={`${f.nome}: ${f.valorExibido}${percentual ? "" : `; participação ${formatoPercentual(f.participacao)}`}`}
            onMouseEnter={() => setFatiaAtiva(i)}
            onMouseLeave={() => setFatiaAtiva(null)}
            onFocus={() => setFatiaAtiva(i)}
            onBlur={() => setFatiaAtiva(null)}>
          </path>)}
        </svg>
        {ativa && <div className="radar-pie-tooltip" role="status">
          <strong><i style={{background:ativa.cor}} />{ativa.nome}</strong>
          <span>{ativa.valorExibido}</span>
          {!percentual && <small>Participação: {formatoPercentual(ativa.participacao)}</small>}
        </div>}
      </div>
      <div className="radar-pie-legend">
        <strong>Distribuição por categoria</strong>
        {partes.map(f => <div className="radar-pie-legend-item" key={f.nome}>
          <span className="radar-pie-legend-name"><i style={{background:f.cor}}/>{f.nome}</span>
          {!percentual && <b>{f.valorExibido}</b>}
          <span>{percentual ? f.valorExibido : formatoPercentual(f.participacao)}</span>
        </div>)}
        {!percentual && <small>Total: {total.toLocaleString("pt-BR", {maximumFractionDigits:2})}{unidade ? ` ${unidade}` : ""}</small>}
      </div>
    </div>;
  }
  const isPir = tipo === "piramide";
  if (isPir && aba === "grafico") {
    const faixas = Array.from(new Set(validos.map(d => d.categoria_recorte)))
      .filter(Boolean)
      .sort((a, b) => {
        const idadeInicial = (faixa: string) => {
          const numero = faixa.match(/\d+/);
          return numero ? Number(numero[0]) : Number.POSITIVE_INFINITY;
        };
        return idadeInicial(a) - idadeInicial(b) || a.localeCompare(b, "pt-BR", { numeric: true });
      });
    const maxPir = Math.max(1, ...validos.map(d => Math.abs(Number(d.valor))));
    const fmtPir = (n: number) => Math.abs(n).toLocaleString("pt-BR", {maximumFractionDigits:0});
    return (
      <div style={{padding:"16px 4px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 125px 1fr",gap:12,marginBottom:14,textAlign:"center",fontWeight:700}}>
          <span>Homens</span><span>Faixa etária</span><span>Mulheres</span>
        </div>
        {faixas.map(faixa => {
          const homens = Math.abs(Number(validos.find(d => d.categoria_recorte === faixa && /homens/i.test(d.serie_subrecorte))?.valor ?? 0));
          const mulheres = Math.abs(Number(validos.find(d => d.categoria_recorte === faixa && /mulheres/i.test(d.serie_subrecorte))?.valor ?? 0));
          return <div key={faixa} style={{display:"grid",gridTemplateColumns:"1fr 125px 1fr",alignItems:"center",gap:12,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8}}>
              <small>{fmtPir(homens)}</small>
              <div style={{width:"75%",display:"flex",justifyContent:"flex-end"}}>
                <div title={`Homens: ${fmtPir(homens)}`} style={{width:`${homens/maxPir*100}%`,height:22,background:"#42b3df",borderRadius:"5px 0 0 5px"}} />
              </div>
            </div>
            <span style={{fontSize:12,textAlign:"center"}}>{faixa}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:"75%"}}>
                <div title={`Mulheres: ${fmtPir(mulheres)}`} style={{width:`${mulheres/maxPir*100}%`,height:22,background:"#7030b5",borderRadius:"0 5px 5px 0"}} />
              </div>
              <small>{fmtPir(mulheres)}</small>
            </div>
          </div>;
        })}
      </div>
    );
  }
  if (tipo === "barras_empilhadas" && aba === "grafico") {
    return <GraficoBarrasEmpilhadas dados={validos} titulo={indicador.titulo} />;
  }
  const metricas = Array.from(new Set(validos.map(d => d.serie_subrecorte).filter(Boolean)));
  const uf = tipo === "barras_uf";
  const grupoTaxa = (m: string) => /taxa/i.test(m);
  const metricaAtual = metricas.includes(metrica) ? metrica : (metricas.find(m => !grupoTaxa(m)) || metricas[0]);
  const linhas = validos.filter(d => d.tipo_valor !== "texto");
  const periodos = Array.from(new Set(linhas.map(d => d.periodo))).sort((a,b) => a.localeCompare(b, "pt-BR"));
  const nomeSerie = (d: DadoEixo01) => d.serie_subrecorte || d.categoria_recorte || (d.territorio && periodos.length > 1 ? d.territorio : "") || "Total";
  const seriesLinha = Array.from(new Set(linhas.map(nomeSerie))).filter(Boolean);
  const graficoTemporal = tipo === "linhas" && periodos.length > 1;
  const metricasUF = Array.from(new Set(validos.map(d => d.metrica).filter((m): m is string => Boolean(m))));
  const [metricaUF, setMetricaUF] = [metrica, setMetrica];
  const metricaUFAtual = metricasUF.includes(metricaUF) ? metricaUF : (metricasUF.find(m => /quantidade|casos/i.test(m)) || metricasUF[0]);
  const valoresLinha = linhas.map(d => d.escala === "0–1" ? Number(d.valor)*100 : Number(d.valor));
  // Escalas arredondadas com intervalos inteiros (1, 2 ou 5 x potência de 10).
  // Não arredonda os dados; apenas os números mostrados nos eixos.
  const passoEixo = (maiorValor: number) => {
    const bruto = Math.max(1, Math.abs(maiorValor) / 4);
    const potencia = 10 ** Math.floor(Math.log10(bruto));
    const normalizado = bruto / potencia;
    const multiplicador = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10;
    return Math.max(1, multiplicador * potencia);
  };
  const minimoOriginal = Math.min(0, ...valoresLinha);
  const maximoOriginal = Math.max(0, ...valoresLinha);
  const passoLinha = passoEixo(Math.max(Math.abs(minimoOriginal), Math.abs(maximoOriginal)));
  const minLinha = Math.floor(minimoOriginal / passoLinha) * passoLinha;
  const maxLinha = Math.max(passoLinha, Math.ceil(maximoOriginal / passoLinha) * passoLinha);
  const marcasLinha = Array.from(
    { length: Math.round((maxLinha - minLinha) / passoLinha) + 1 },
    (_, i) => minLinha + i * passoLinha
  );
  const linhaX = (i: number) => 76 + (periodos.length > 1 ? i/(periodos.length-1) : .5)*700;
  const linhaY = (v: number) => 250-(v-minLinha)/(maxLinha-minLinha)*210;
  const metricasComparacao = ["1.2.2", "1.2.5"].includes(indicador.indicador_id);
  const comparacaoCompleta = linhas.filter(d => !metricasComparacao || !metricaUFAtual || d.metrica === metricaUFAtual);
  const comparacao = tipo === "linhas" && graficoTemporal
    ? comparacaoCompleta
    : registrosMaisRecentes(comparacaoCompleta);
  const ordered = [...comparacao].sort((a,b) => ordem === "maior" ? Number(b.valor)-Number(a.valor) : Number(a.valor)-Number(b.valor));
  const temHistoricoComparavel = new Map<string,Set<string>>();
  for (const d of comparacaoCompleta) {
    const chave=chaveSerieHistorica(d);
    if (!temHistoricoComparavel.has(chave)) temHistoricoComparavel.set(chave,new Set());
    if (d.periodo.trim()) temHistoricoComparavel.get(chave)!.add(d.periodo.trim());
  }
  const existeEvolucao=Array.from(temHistoricoComparavel.values()).some(periodos=>periodos.size>=2);
  const permiteAlternar = ["barras","barras_uf","barras_populacao"].includes(tipo) && existeEvolucao;
  // A aba Tabela preserva todos os períodos e dados históricos, sem o recorte do gráfico.
  const registrosTabela = [...comparacaoCompleta].sort((a,b) =>
    ordenarPeriodo(b.periodo) - ordenarPeriodo(a.periodo) ||
    a.categoria_recorte.localeCompare(b.categoria_recorte,"pt-BR",{numeric:true}));
  // Ativa agrupamento apenas quando existem diferentes categorias e séries
  // repetidas nas mesmas categorias. Gráficos por UF sem essa estrutura ficam iguais.
  const agrupadas = tipo === "barras" && !metricasComparacao &&
    new Set(comparacao.map(d => d.categoria_recorte.trim()).filter(Boolean)).size > 1 &&
    new Set(comparacao.map(d => d.serie_subrecorte.trim()).filter(Boolean)).size > 1 &&
    comparacao.some((d,i) => comparacao.some((outro,j) => i !== j &&
      d.categoria_recorte.trim() !== "" && d.categoria_recorte === outro.categoria_recorte &&
      d.serie_subrecorte.trim() !== "" && outro.serie_subrecorte.trim() !== "" &&
      d.serie_subrecorte !== outro.serie_subrecorte));
  // Detecta a dimensão que realmente varia: UFs, categorias, séries ou períodos.
  // Território fixo (ex.: Rio de Janeiro) não deve substituir nomes das categorias.
  const distintos = (campo: (d: DadoEixo01) => string) =>
    new Set(comparacao.map(d => campo(d).trim()).filter(Boolean)).size;
  const variosTerritorios = distintos(d => d.territorio) > 1;
  const variasCategorias = distintos(d => d.categoria_recorte) > 1;
  const variasSeries = distintos(d => d.serie_subrecorte) > 1;
  const rotuloBarra = (d: DadoEixo01) => {
    if (variosTerritorios) return d.territorio || d.categoria_recorte || d.serie_subrecorte || d.periodo;
    if (variasCategorias) {
      const categoria = d.categoria_recorte || d.serie_subrecorte || d.periodo;
      // Só acrescenta Série quando houver categorias repetidas entre séries distintas.
      const repetida = variasSeries && comparacao.some(outro =>
        outro !== d && outro.categoria_recorte === d.categoria_recorte &&
        outro.serie_subrecorte !== d.serie_subrecorte
      );
      return repetida && d.serie_subrecorte ? `${categoria} · ${d.serie_subrecorte}` : categoria;
    }
    if (variasSeries) return d.serie_subrecorte || d.categoria_recorte || d.periodo;
    if (distintos(d => d.periodo) > 1) return exibirPeriodo(d.periodo);
    return d.categoria_recorte || d.serie_subrecorte || d.territorio || exibirPeriodo(d.periodo);
  };
  const max = Math.max(1,...ordered.map(d => Math.abs(Number(d.valor))));
  const avisos = Array.from(new Set(validos.filter(d => d.situacao && d.situacao !== "conferido").map(d => d.situacao)));
  const serieX = tipo === "linhas" || tipo === "barras_populacao";
  const barrasVerticais = tipo === "barras" || tipo === "barras_uf" || tipo === "barras_populacao";
  const coresBarras = ["#7132b2", "#a66ddd", "#42b9eb", "#c58df1"];
  const maiorValorVertical = Math.max(0, ...ordered.map(d => Math.abs(Number(d.valor))));
  // Taxas por 100 mil habitantes podem ser menores que 1. Nesses casos,
  // usar teto 1 evita barras quase invisíveis no intervalo artificial 0–4.
  const escalaTaxaUF = indicador.indicador_id === "1.2.2" && /taxa/i.test(metricaUFAtual ?? "");
  const maxVertical = escalaTaxaUF && maiorValorVertical <= 1
    ? 1
    : passoEixo(maiorValorVertical) * 4;
  return (
    <div className="radar-dynamic-view">
      {aba === "grafico" && metricasComparacao && <div className="radar-view-controls">
        {metricasUF.map(m => <button type="button" key={m} className={metricaUFAtual === m ? "active" : ""} onClick={() => setMetricaUF(m)}>{m}</button>)}
        <button type="button" onClick={() => setOrdem(v => v === "maior" ? "menor" : "maior")}>Ordenar: {ordem === "maior" ? "maiores" : "menores"}</button>
      </div>}
      {serieX && aba === "grafico" && <div className="radar-view-legend">
        {seriesLinha.map((serie, i) => {
          const cor = ["#7030b5", "#42b3df", "#e19c29", "#21977e"][i % 4];
          return <span key={serie} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <i aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, flexShrink: 0, borderRadius: "50%", backgroundColor: cor }} />
            {serie}
          </span>;
        })}
      </div>}
      {aba === "grafico" && graficoTemporal && <div className="radar-line-wrap"><svg viewBox="0 0 820 290" className="radar-eixo-linechart" role="img"
        aria-label={`Evolução de ${indicador.titulo}`}>
        {marcasLinha.map(v => {
          return <g key={v}><line x1="76" x2="776" y1={linhaY(v)} y2={linhaY(v)} stroke="#e8e0ec" />
            <text x="65" y={linhaY(v)+5} fontSize="12" textAnchor="end" fill="#53657c">{Math.round(v).toLocaleString("pt-BR",{maximumFractionDigits:0})}</text></g>;
        })}
        {periodos.map((p,i) => <text key={p} x={linhaX(i)} y="277" fontSize="12" textAnchor="middle" fill="#53657c">{exibirPeriodo(p)}</text>)}
        {seriesLinha.map((serie,i) => {
          const cor = ["#7030b5","#42b3df","#e19c29","#21977e"][i%4];
          const coords = periodos.map((p,j) => {
            const d = linhas.find(x => x.periodo === p && nomeSerie(x) === serie);
            if (!d) return null;
            return { x: linhaX(j), y: linhaY(d.escala === "0–1" ? Number(d.valor)*100 : Number(d.valor)), label: fmt(d), periodo: p };
          }).filter((x): x is {x:number;y:number;label:string;periodo:string} => x !== null);
          return <g key={serie}>{coords.length>1 && <polyline points={coords.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={cor} strokeWidth="3" className="radar-animated-line" pathLength={1} />}
            {coords.map((p,j)=><circle key={j} cx={p.x} cy={p.y} r="7" fill={cor} stroke="white" strokeWidth="2" tabIndex={0}
              aria-label={`${exibirPeriodo(p.periodo)}, ${serie}: ${p.label}`}
              onMouseEnter={() => setPontoAtivo({periodo:p.periodo,serie,valor:p.label,cor,x:p.x,y:p.y})}
              onMouseLeave={() => setPontoAtivo(null)}
              onFocus={() => setPontoAtivo({periodo:p.periodo,serie,valor:p.label,cor,x:p.x,y:p.y})}
              onBlur={() => setPontoAtivo(null)}>
              
            </circle>)}
          </g>;
        })}
      </svg>
      {pontoAtivo && <div className="radar-line-point-tooltip" role="status" style={{left:`${pontoAtivo.x/820*100}%`,top:`${pontoAtivo.y/290*100}%`}}>
        <span><i style={{background:pontoAtivo.cor}} />{pontoAtivo.serie}</span>
        <strong>{exibirPeriodo(pontoAtivo.periodo)}</strong>
        <b>{pontoAtivo.valor}</b>
      </div>}
      </div>}

      {aba==="grafico" && permiteAlternar && <div className="radar-period-mode" role="group" aria-label="Visualização temporal">
        <button type="button" className={visaoPeriodo==="atual"?"active":""} aria-pressed={visaoPeriodo==="atual"} onClick={()=>setVisaoPeriodo("atual")}>Comparação atual</button>
        <button type="button" className={visaoPeriodo==="historico"?"active":""} aria-pressed={visaoPeriodo==="historico"} onClick={()=>setVisaoPeriodo("historico")}>Evolução histórica</button>
      </div>}
      {aba==="grafico" && permiteAlternar && visaoPeriodo==="historico" && <HistoricoIndicador dados={comparacaoCompleta} formatar={fmt} />}
      {aba === "grafico" && !graficoTemporal && (!permiteAlternar || visaoPeriodo==="atual") && <>
        {tipo === "linhas" && <p style={{marginBottom:12}}>Comparação dos valores disponíveis.</p>}
        {/* A métrica só é filtrada para a comparação por UF. */}
        {agrupadas ? (
          <GraficoBarrasAgrupadas dados={comparacao} titulo={indicador.titulo} />
        ) : barrasVerticais && ordered.length <= 12 ? (
          <div className="radar-vertical-scroll" role="region" aria-label={`Comparação em barras verticais: ${indicador.titulo}`} tabIndex={0}>
            <div className="radar-vertical-chart" >
              <div className="radar-vertical-plot">
                {[0,1,2,3,4].map(tick => (
                  <div className="radar-vertical-gridline" key={tick} style={{bottom:`${tick*25}%`}}>
                    <span>{(maxVertical*tick/4).toLocaleString("pt-BR",{maximumFractionDigits: escalaTaxaUF && maxVertical === 1 ? 2 : 0})}</span>
                  </div>
                ))}
                <div className="radar-vertical-columns">
                  {ordered.map((d,i) => {
                    const nome = rotuloBarra(d);
                    const valor = Math.abs(Number(d.valor));
                    return <div className="radar-vertical-item" key={`${d.id_indicador}-${i}`}>
                      <BarraComTooltip className="radar-vertical-bar"
                        style={{height:`${valor/maxVertical*100}%`,background:coresBarras[metricasComparacao ? 0 : i%coresBarras.length]}}
                        cor={coresBarras[metricasComparacao ? 0 : i%coresBarras.length]}
                        serie={nome} categoria={d.periodo ? `Período: ${exibirPeriodo(d.periodo)}` : undefined} valor={fmt(d)} ariaLabel={`${nome}, ${exibirPeriodo(d.periodo)}: ${fmt(d)}`} />
                      <span className="radar-vertical-label" title={nome}>{nome}</span>
                    </div>;
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="radar-horizontal-chart" role="region" aria-label={`Comparação em barras horizontais: ${indicador.titulo}`}>
            <div className="radar-horizontal-axis" aria-hidden="true">
              {[0,1,2,3,4].map(t => <span key={t}>{(maxVertical*t/4).toLocaleString("pt-BR", {maximumFractionDigits:maxVertical<=10?2:0})}</span>)}
            </div>
            <div className="radar-horizontal-list">
              {ordered.map((d,i) => {
                const nome = rotuloBarra(d);
                const valor = Math.abs(Number(d.valor));
                const cor = coresBarras[metricasComparacao ? 0 : i % coresBarras.length];
                return <div className="radar-horizontal-row" key={`${d.periodo}-${d.categoria_recorte}-${d.serie_subrecorte}-${i}`}>
                  <div className="radar-horizontal-meta">
                    <span title={nome}>{nome}</span>
                    <strong>{fmt(d)}</strong>
                  </div>
                  <div className="radar-horizontal-track">
                    {[0,1,2,3,4].map(t => <i key={t} className="radar-horizontal-gridline" style={{left:`${t*25}%`}} />)}
                    <BarraComTooltip className="radar-horizontal-bar"
                      style={{width:`${Math.max(0,valor/maxVertical*100)}%`,backgroundColor:cor}}
                      cor={cor} serie={nome} categoria={d.periodo ? `Período: ${exibirPeriodo(d.periodo)}` : undefined}
                      valor={fmt(d)} ariaLabel={`${nome}, ${exibirPeriodo(d.periodo)}: ${fmt(d)}`} />
                  </div>
                </div>;
              })}
            </div>
          </div>
        )}</>}
      {aba === "tabela" && (() => {
        // Esconde apenas as colunas inteiramente vazias no indicador selecionado.
        // Os dados continuam intactos no BigQuery e nas demais visualizações.
        const mostrarPeriodo = registrosTabela.some(d => Boolean(d.periodo?.trim()));
        const mostrarTerritorio = registrosTabela.some(d => Boolean(d.territorio?.trim()));
        const mostrarCategoria = registrosTabela.some(d => Boolean(d.categoria_recorte?.trim()));
        const mostrarSerie = registrosTabela.some(d => Boolean(d.serie_subrecorte?.trim()));
        const mostrarMetrica = registrosTabela.some(d => Boolean(d.metrica?.trim()));
        return <div className="radar-data-table-wrap radar-table-standalone">
          <table>
            <thead><tr>
              {mostrarPeriodo && <th>Período</th>}
              {mostrarTerritorio && <th>Território</th>}
              {mostrarCategoria && <th>Categoria</th>}
              {mostrarSerie && <th>Série</th>}
              {mostrarMetrica && <th>Métrica</th>}
              <th>Valor</th>
            </tr></thead>
            <tbody>{registrosTabela.map((d,i) => <tr key={i}>
              {mostrarPeriodo && <td>{exibirPeriodo(d.periodo)}</td>}
              {mostrarTerritorio && <td>{d.territorio}</td>}
              {mostrarCategoria && <td>{d.categoria_recorte}</td>}
              {mostrarSerie && <td>{d.serie_subrecorte}</td>}
              {mostrarMetrica && <td>{d.metrica}</td>}
              <td>{d.texto || fmt(d)}</td>
            </tr>)}</tbody>
          </table>
        </div>;
      })()}
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
  const [alturaMenu, setAlturaMenu] = useState(320);
  const [abrirMenuAcima, setAbrirMenuAcima] = useState(true);
  const [buscaIndicador, setBuscaIndicador] = useState("");
  const [catalogoAberto, setCatalogoAberto] = useState(false);
  const [buscaCatalogo, setBuscaCatalogo] = useState("");
  const [eixoCatalogo, setEixoCatalogo] = useState("todos");
  const buscaCatalogoRef = useRef<HTMLInputElement>(null);
  const abrirCatalogoRef = useRef<HTMLButtonElement>(null);
  const seletorRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  const indicadoresDoTema = useMemo(() =>
    indicadores.filter(item =>
      String(item.tema ?? "").toLocaleLowerCase("pt-BR") === tema.toLocaleLowerCase("pt-BR")
    ).sort((a, b) => a.indicador_id.localeCompare(b.indicador_id, "pt-BR", { numeric: true, sensitivity: "base" })), [indicadores, tema],
  );
  const selecionado = indicadoresDoTema.find(item => item.indicador_id === indicadorId);

  const indicadoresCatalogo = useMemo(() => {
    const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const busca = normalizar(buscaCatalogo.trim());
    return indicadores.filter(item => {
      const eixo = String(item.tema ?? "");
      if (eixoCatalogo !== "todos" && normalizar(eixo) !== normalizar(eixoCatalogo)) return false;
      return !busca || normalizar([tituloPublico(item.titulo), item.indicador_id, eixo, item.descricao ?? ""].join(" ")).includes(busca);
    }).sort((a, b) => {
      const porCodigo = a.indicador_id.localeCompare(b.indicador_id, "pt-BR", {numeric:true});
      return porCodigo || tituloPublico(a.titulo).localeCompare(tituloPublico(b.titulo),"pt-BR");
    });
  }, [indicadores, buscaCatalogo, eixoCatalogo]);

  useEffect(() => {
    if (!catalogoAberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    buscaCatalogoRef.current?.focus({preventScroll:true});
    const fecharEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCatalogoAberto(false);
    };
    document.addEventListener("keydown", fecharEscape);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", fecharEscape);
      abrirCatalogoRef.current?.focus({preventScroll:true});
    };
  }, [catalogoAberto]);

  function abrirCatalogo() {
    setBuscaCatalogo("");
    setEixoCatalogo("todos");
    setSeletorAberto(false);
    setCatalogoAberto(true);
  }

  function escolherNoCatalogo(item: Indicador & {tema?: string}) {
    const eixo = temas.find(t => t.toLocaleLowerCase("pt-BR") === String(item.tema ?? "").toLocaleLowerCase("pt-BR"));
    if (!eixo) return;
    setTema(eixo);
    setIndicadorId(item.indicador_id);
    setAbaVisualizacao("grafico");
    setBuscaIndicador("");
    setSeletorAberto(false);
    setCatalogoAberto(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => document.getElementById("indicador-conteudo")?.scrollIntoView({behavior:"smooth",block:"start"}));
    });
  }

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
    if (!seletorAberto) return;
    const reposicionar = () => {
      const retangulo = gatilhoRef.current?.getBoundingClientRect();
      if (!retangulo) return;
      const espacoAcima = retangulo.top - 12;
      const espacoAbaixo = window.innerHeight - retangulo.bottom - 12;
      const acima = espacoAcima >= 220 || espacoAcima >= espacoAbaixo;
      setAbrirMenuAcima(acima);
      setAlturaMenu(Math.max(100, Math.min(390, acima ? espacoAcima : espacoAbaixo)));
    };
    reposicionar();
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
    };
  }, [seletorAberto]);
  useEffect(() => {
    if (seletorAberto) buscaRef.current?.focus({ preventScroll: true });
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
          <img className="spm-official-logo" src="/logo-prefeitura-mulheres.svg" alt="Prefeitura Rio — Políticas para Mulheres e Cuidados" width={300} height={75} />
        </a>
      </header>
      <section className="intro" id="inicio">
        <div className="intro-content">
          <div className="eyebrow"><span>SECRETARIA DE POLÍTICAS PARA MULHERES E CUIDADOS</span><i>✦</i></div>
          <h1>Mapa da <span>Mulher</span> Carioca</h1>
          <p>Indicadores e informações sobre as mulheres da cidade do Rio de Janeiro, reunidos para compreender desigualdades e fortalecer as políticas públicas.</p>
          <a className="intro-explore" href="#dados">Explorar os dados <span aria-hidden="true">↓</span></a>
        </div>
      </section>
      <section className="dashboard" id="dados">
        <aside className="sidebar">
          <p>EIXOS TEMÁTICOS</p>
          <div className="theme-list">
            {temas.map((item, index) => (
              <button type="button" className={tema === item ? "active" : ""}
                onClick={() => selecionarTema(item)} key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {tituloEixo(item)}
              </button>
            ))}
          </div>
          <div className="sidebar-catalogo">
            <button ref={abrirCatalogoRef} type="button" className="sidebar-catalogo-btn" onClick={abrirCatalogo} aria-haspopup="dialog">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /><path d="M8 10.5h5" />
              </svg>
              Todos os indicadores
            </button>
          </div>
          <div className="source-note"><i>↗</i>
            <p><b>Dados abertos</b><br />Consulte as fontes de cada indicador publicado.</p>
          </div>
        </aside>
        <div className="content">
          <div className="section-title">
            <span>{String(temas.indexOf(tema) + 1).padStart(2, "0")}.</span>
            <div>
              <p>MAPA DA MULHER CARIOCA</p>
              <h2>{tituloEixo(tema)}</h2>
            </div>
          </div>

          <section className="radar-overview" aria-label={`Painel de infográficos de ${tituloEixo(tema)}`}>
            <div className="radar-overview-heading">
              <h3>{tema === "Visão geral" ? "Panorama do Radar de Dados" : `Panorama de ${tema}`}</h3>
              <p>Explore os indicadores, acompanhe os recortes disponíveis e consulte as fontes utilizadas.</p>
            </div>
            {tema === "Visão geral" ? (
              <RadarInfografico />
            ) : (
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
            )}
          </section>

          <section className="radar-explorer" aria-label="Explorar indicadores do eixo">
            <div className="radar-explorer-heading">
              <div>
                <span>EXPLORE OS DADOS</span>
                <h3>Indicadores de {tituloEixo(tema)}</h3>
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
                  <button type="button" ref={gatilhoRef} className={`radar-select-trigger${seletorAberto ? " is-open" : ""}`}
                    aria-haspopup="listbox" aria-expanded={seletorAberto} aria-controls="radar-indicator-options"
                    onClick={() => { setBuscaIndicador(""); setSeletorAberto(aberto => !aberto); }}>
                    <span>{selecionado ? tituloPublico(selecionado.titulo) : "Escolha um indicador"}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {seletorAberto && (
                    <div className={`radar-select-menu${abrirMenuAcima ? " opens-up" : ""}`} style={{ maxHeight: alturaMenu }}>
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
                        {selecionado.descricao?.trim() && <p className="radar-indicator-description">{selecionado.descricao}</p>}
                      </div>
                    </div>
                    <div className="radar-indicator-tags">
                      <span>{selecionado.tema === "Visão geral" ? "Radar de Dados" : selecionado.tema}</span>
                      {(() => {
                        const territorios = Array.from(new Set(dadosEixo01
                          .filter(d => d.id_indicador === selecionado.indicador_id)
                          .map(d => d.territorio?.trim())
                          .filter((t): t is string => Boolean(t))));
                        if (territorios.length > 2) {
                          return <span>{territorios.length} territórios</span>;
                        }
                        return territorios.map(t => <span key={t}>{t}</span>);
                      })()}
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
                        <VisualizacaoEixo1 indicador={selecionado} dados={dadosEixo01} aba={abaVisualizacao} />
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
      {catalogoAberto && (
        <div className="catalogo-backdrop" onMouseDown={event => {if(event.target===event.currentTarget)setCatalogoAberto(false);}}>
          <section className="catalogo-modal" role="dialog" aria-modal="true" aria-labelledby="catalogo-titulo">
            <div className="catalogo-header">
              <div>
                <span>CONSULTA RÁPIDA</span>
                <h2 id="catalogo-titulo">Todos os indicadores</h2>
                <p>Encontre um indicador em qualquer eixo e abra diretamente sua visualização.</p>
              </div>
              <button type="button" className="catalogo-close" aria-label="Fechar todos os indicadores" onClick={() => setCatalogoAberto(false)}>×</button>
            </div>
            <div className="catalogo-controls">
              <label className="catalogo-search">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
                <input ref={buscaCatalogoRef} type="search" value={buscaCatalogo}
                  onChange={event => setBuscaCatalogo(event.target.value)}
                  placeholder="Buscar pelo nome, assunto ou código..." aria-label="Buscar em todos os indicadores" />
              </label>
              <label className="catalogo-eixo-label">
                <span>Eixo temático</span>
                <select value={eixoCatalogo} onChange={event => setEixoCatalogo(event.target.value)}>
                  <option value="todos">Todos os eixos</option>
                  {temas.map(eixo => <option key={eixo} value={eixo}>{tituloEixo(eixo)}</option>)}
                </select>
              </label>
            </div>
            <div className="catalogo-summary" aria-live="polite">
              {indicadoresCatalogo.length} {indicadoresCatalogo.length === 1 ? "indicador encontrado" : "indicadores encontrados"}
              {(buscaCatalogo || eixoCatalogo !== "todos") && (
                <button type="button" onClick={() => {setBuscaCatalogo("");setEixoCatalogo("todos");}}>Limpar filtros</button>
              )}
            </div>
            <div className="catalogo-results">
              {indicadoresCatalogo.length === 0 ? (
                <div className="catalogo-empty">Nenhum indicador encontrado. Tente outro termo ou selecione todos os eixos.</div>
              ) : (
                temas.map(eixo => {
                  const itens = indicadoresCatalogo.filter(item => String(item.tema ?? "").toLocaleLowerCase("pt-BR") === eixo.toLocaleLowerCase("pt-BR"));
                  if (!itens.length) return null;
                  return <div className="catalogo-group" key={eixo}>
                    <h3>{tituloEixo(eixo)} <span>{itens.length}</span></h3>
                    {itens.map(item => (
                      <button type="button" className="catalogo-item" key={item.indicador_id} onClick={() => escolherNoCatalogo(item)}>
                        <span className="catalogo-item-info">
                          <strong>{tituloPublico(item.titulo)}</strong>
                          <small>{item.periodo ? `Período: ${item.periodo}` : "Abrir visualização do indicador"}</small>
                        </span>
                        <span className="catalogo-item-arrow" aria-hidden="true">↗</span>
                      </button>
                    ))}
                  </div>;
                })
              )}
            </div>
          </section>
        </div>
      )}
      <footer id="sobre">
        <div><b>MAPA DA<br />MULHER CARIOCA</b></div>
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
