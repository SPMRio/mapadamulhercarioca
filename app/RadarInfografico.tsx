import React from "react";

function Stat({ valor, legenda }: { valor: string; legenda: string }) {
  return <div className="ri-stat"><strong>{valor}</strong><span>{legenda}</span></div>;
}
function MulheresHomens({ mulheres, homens }: { mulheres: number; homens: number }) {
  return <div className="ri-population">
    <div className="ri-population-figures" aria-hidden="true"><span>♀</span><span>♂</span></div>
    <div className="ri-population-bars" role="img" aria-label={`Mulheres: ${mulheres}%; homens: ${homens}%`}>
      <span style={{ width: `${mulheres}%` }} /><span style={{ width: `${homens}%` }} />
    </div>
    <div className="ri-population-labels">
      <div><strong>{mulheres.toLocaleString("pt-BR")}%</strong><small>Mulheres</small></div>
      <div><strong>{homens.toLocaleString("pt-BR")}%</strong><small>Homens</small></div>
    </div>
  </div>;
}
export default function RadarInfografico() {
  return (
    <div className="ri-root" aria-label="Infográfico do Radar de Dados: panorama de gênero">
      <div className="ri-heading">
        <div><span className="ri-kicker">PANORAMA DE GÊNERO</span><h3>Infográfico | Radar de Dados</h3></div>
        <p>Mundo, Brasil e Rio de Janeiro em perspectiva</p>
      </div>
      <div className="ri-top-grid">
        <article className="ri-card ri-world">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">◎</span><h4>Mundo</h4></div>
          <p className="ri-subhead">Brasil no Índice Global de Lacuna de Gênero (2024)</p>
          <div className="ri-world-stats">
            <Stat valor="70º" legenda="lugar no mundo, entre 146 países" />
            <Stat valor="16º" legenda="lugar na América Latina" />
          </div>
          <small className="ri-source">Fonte: Global Gender Gap Report 2024, World Economic Forum</small>
        </article>
        <article className="ri-card">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">♙</span><h4>Brasil · População</h4></div>
          <MulheresHomens mulheres={51.5} homens={48.5} />
        </article>
        <article className="ri-card">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">⌖</span><h4>Município do Rio · População</h4></div>
          <MulheresHomens mulheres={53.2} homens={46.8} />
          <div className="ri-elder"><strong>~60%</strong><span>da população idosa é composta por mulheres</span></div>
        </article>
      </div>
      <div className="ri-mid-grid">
        <article className="ri-card ri-violence">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">◇</span><h4>Violência doméstica e familiar</h4></div>
          <div className="ri-big-number"><strong>23,6 milhões</strong><span>de mulheres já sofreram violência no Brasil</span></div>
          <div className="ri-violence-grid">
            <Stat valor="27%" legenda="das brasileiras · cerca de 1 em cada 4 mulheres" />
            <Stat valor="30%" legenda="média mundial (OMS)" />
          </div>
          <div className="ri-divider" />
          <h5>Rio de Janeiro</h5>
          <div className="ri-inline-stats"><Stat valor="2,5 milhões+" legenda="de mulheres" /><Stat valor="3º" legenda="estado com mais casos no país" /></div>
          <div className="ri-witness">
            <div><strong>7 em cada 10</strong><span>casos tiveram testemunhas</span></div>
            <div><strong>71%</strong><span>das agressões com testemunhas foram presenciadas por crianças</span></div>
          </div>
        </article>
        <article className="ri-card ri-femicide">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">◷</span><h4>Feminicídio</h4></div>
          <div className="ri-femicide-hero"><strong>1.470</strong><span>vítimas no Brasil</span></div>
          <div className="ri-femicide-frequency">
            <div><strong>4</strong><span>mulheres assassinadas por dia, em média</span></div>
            <div><strong>6h</strong><span>uma mulher assassinada a cada seis horas</span></div>
          </div>
          <h5>Evolução em 10 anos</h5>
          <div className="ri-trend" role="img" aria-label="535 casos em 2015 e 1.470 casos em 2025">
            <div><span>2015</span><div className="ri-trend-track"><i style={{width:"36.4%"}} /></div><strong>535</strong></div>
            <div><span>2025</span><div className="ri-trend-track"><i style={{width:"100%"}} /></div><strong>1.470</strong></div>
          </div>
          <div className="ri-divider" />
          <h5>Rio de Janeiro · 2025</h5>
          <div className="ri-inline-stats"><Stat valor="104" legenda="casos" /><Stat valor="2º" legenda="estado com mais vítimas" /></div>
          <div className="ri-rate">Taxa por 100 mil habitantes <b>RJ: 1,35</b><b>Brasil: 1,67</b></div>
        </article>
      </div>
      <article className="ri-income">
        <div className="ri-income-title"><span className="ri-icon" aria-hidden="true">↗</span><div><span>DESIGUALDADE ECONÔMICA</span><h4>Disparidade de renda</h4></div></div>
        <div className="ri-income-grid">
          <div className="ri-income-br">
            <h5>Brasil · Rendimento médio mensal por gênero</h5>
            <div className="ri-salary"><div><span>Homens</span><strong>R$ 3.735</strong><i style={{width:"100%"}} /></div><div><span>Mulheres</span><strong>R$ 2.973</strong><i style={{width:"79.6%"}} /></div></div>
            <div className="ri-income-facts">
              <div><strong>R$ 762</strong><span>a menos por mês</span></div>
              <div><strong>54%</strong><span>de um salário mínimo</span></div>
              <div><strong>Quase R$ 10 mil</strong><span>a menos por ano no orçamento feminino</span></div>
            </div>
          </div>
          <div className="ri-income-rio">
            <h5>Município do Rio de Janeiro</h5>
            <div className="ri-income-rio-value">R$ 1.458 <span>a menos por mês para as mulheres</span></div>
            <p>Diferença equivalente a <strong>1 salário mínimo por mês</strong>.</p>
            <p>A cada dois meses trabalhados, o homem recebe <strong>1 salário mínimo a mais</strong> do que a mulher.</p>
          </div>
        </div>
      </article>
      <p className="ri-footnote">Síntese com os valores fornecidos para o infográfico. Consulte as fontes e notas metodológicas dos indicadores para contextualização.</p>
    </div>
  );
}
