"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

const temas = [
  "Visão geral",
  "Violência",
  "Cuidados",
  "Segurança pública",
  "Meninas",
  "Emprego e renda",
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

export default function Home() {
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [dadosCuidado, setDadosCuidado] = useState<DadoCuidado[]>([]);
  const [carregandoPlanilha, setCarregandoPlanilha] = useState(true);
  const [erroPlanilha, setErroPlanilha] = useState("");

  useEffect(() => {
    async function carregarPlanilha() {
      try {
        const resposta = await fetch("/api/sheets");

        if (!resposta.ok) {
          throw new Error("Erro ao consultar a API");
        }

        const resultado = await resposta.json();
        setIndicadores(
          tabelaParaObjetos<Indicador>(resultado?.indicadores ?? []),
        );
        setDadosCuidado(
          tabelaParaObjetos<DadoCuidado>(resultado?.dados?.cuidado ?? []).map(
            (item) => ({ ...item, valor: numero(item.valor) }),
          ),
        );
      } catch (erro) {
        console.error(erro);
        setErroPlanilha("Não foi possível carregar os dados de Cuidados.");
      } finally {
        setCarregandoPlanilha(false);
      }
    }

    carregarPlanilha();
  }, []);

  const [tema, setTema] = useState("Visão geral");
  const [regiao, setRegiao] = useState(
    "Todo o município",
  );
  const [ano, setAno] = useState("2025");

  const destaque = useMemo(() => {
    if (tema === "Visão geral") {
      return "As mulheres são maioria no Rio";
    }

    return `${tema}: recorte das mulheres cariocas`;
  }, [tema]);

  function limparFiltros() {
    setRegiao("Todo o município");
    setAno("2025");
  }

  return (
    <main>
      <div
        className="color-band"
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <header className="topbar">
        <a
          className="brand"
          href="#inicio"
          aria-label="Mapa da Mulher Carioca - início"
        >
          <span>MAPA DA</span>

          <b>
            MULHER
            <br />
            CARIOCA
          </b>

          <em>2026</em>
        </a>

        <nav aria-label="Navegação principal">
          <a href="#dados">Dados</a>
          <a href="#sobre">Sobre</a>
        </nav>

        <button
          className="download"
          type="button"
          onClick={() => window.print()}
        >
          Baixar relatório <span>↓</span>
        </button>
      </header>

      <section
        className="intro"
        id="inicio"
      >
        <div className="eyebrow">
          <span>RADAR DE DADOS</span>
          <i>✦</i>
        </div>

        <h1>
          Dados para enxergar
          <br />
          as mulheres do Rio.
        </h1>

        <p>
          Um retrato vivo das desigualdades,
          conquistas e condições de vida das
          mulheres cariocas, organizado para
          apoiar políticas públicas e transformar
          a cidade.
        </p>

        <div className="meta">
          <span>
            Dados atualizados em{" "}
            <b>agosto de 2026</b>
          </span>

          <span>
            Fontes: IBGE, ISP, Data.Rio e
            registros municipais
          </span>
        </div>
      </section>

      <section
        className="dashboard"
        id="dados"
      >
        <aside className="sidebar">
          <p>EXPLORE POR TEMA</p>

          <div className="theme-list">
            {temas.map((item, index) => (
              <button
                type="button"
                className={
                  tema === item ? "active" : ""
                }
                onClick={() => setTema(item)}
                key={item}
              >
                <span>
                  {String(index + 1).padStart(
                    2,
                    "0",
                  )}
                </span>

                {item}
              </button>
            ))}
          </div>

          <div className="source-note">
            <i>↗</i>

            <p>
              <b>Dados abertos</b>
              <br />
              Consulte as fontes e baixe as bases
              utilizadas neste painel.
            </p>
          </div>
        </aside>

        <div className="content">
          {tema === "Cuidados" ? (
            <PainelCuidados
              indicadores={indicadores}
              dados={dadosCuidado}
              carregando={carregandoPlanilha}
              erro={erroPlanilha}
            />
          ) : (
            <>
          <div className="filters">
            <label>
              REGIÃO

              <select
                value={regiao}
                onChange={(event) =>
                  setRegiao(event.target.value)
                }
              >
                <option>
                  Todo o município
                </option>
                <option>Zona Norte</option>
                <option>Zona Oeste</option>
                <option>Zona Sul</option>
                <option>Centro</option>
              </select>
            </label>

            <label>
              ANO DE REFERÊNCIA

              <select
                value={ano}
                onChange={(event) =>
                  setAno(event.target.value)
                }
              >
                <option>2025</option>
                <option>2024</option>
                <option>2023</option>
              </select>
            </label>

            <button
              type="button"
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>
          </div>

          <div className="section-title">
            <span>01.</span>

            <div>
              <p>{tema.toUpperCase()}</p>
              <h2>{destaque}</h2>
            </div>
          </div>

          <div className="kpis">
            <article className="kpi purple">
              <span>POPULAÇÃO FEMININA</span>

              <strong>3,4 milhões</strong>

              <p>
                <b>+1,8%</b> desde o último Censo
              </p>

              <i>✦</i>
            </article>

            <article className="kpi white">
              <span>PARTE DA POPULAÇÃO</span>

              <div className="donut-row">
                <Donut value={53.6} />

                <p>
                  <b>53,6%</b>
                  <br />
                  mulheres
                  <br />
                  <small>46,4% homens</small>
                </p>
              </div>
            </article>

            <article className="kpi yellow">
              <span>RAZÃO DE SEXO</span>

              <strong>86,5</strong>

              <p>
                homens para cada
                <br />
                <b>100 mulheres</b>
              </p>

              <i>♀</i>
            </article>
          </div>

          <div className="chart-grid">
            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <span>PERFIL ETÁRIO</span>

                  <h3>
                    Em todas as fases da vida
                  </h3>
                </div>

                <div className="legend">
                  <i />
                  Mulheres
                  <i />
                  Homens
                </div>
              </div>

              <Bars />

              <p className="insight">
                <b>✦ Leitura do dado</b> A
                presença feminina cresce nas
                faixas etárias mais altas, reflexo
                da maior longevidade das mulheres.
              </p>
            </article>

            <article className="panel lilac">
              <span>
                DISTRIBUIÇÃO POR IDADE
              </span>

              <h3>
                Quase metade tem
                <br />
                entre 15 e 44 anos
              </h3>

              <div className="age-bars">
                {faixas.map((faixa) => (
                  <div key={faixa.label}>
                    <span>{faixa.label}</span>

                    <p>
                      <i
                        style={{
                          width: `${faixa.value * 3.2}%`,
                        }}
                      />

                      <b>
                        {String(
                          faixa.value,
                        ).replace(".", ",")}
                        %
                      </b>
                    </p>
                  </div>
                ))}
              </div>

              <small>
                Percentual sobre o total de
                mulheres
              </small>
            </article>
          </div>
            </>
          )}
        </div>
      </section>

      <footer id="sobre">
        <div>
          <b>
            MAPA DA
            <br />
            MULHER CARIOCA
          </b>

          <span>2026</span>
        </div>

        <p>
          Uma iniciativa da Secretaria Especial
          de Políticas para Mulheres e Cuidados
          da Prefeitura do Rio.
        </p>

        <div className="footer-links">
          <a href="#dados">Metodologia</a>
          <a href="#dados">Fontes dos dados</a>
          <a href="#inicio">
            Voltar ao topo ↑
          </a>
        </div>
      </footer>
    </main>
  );
}