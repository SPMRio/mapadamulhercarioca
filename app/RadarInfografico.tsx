import React from "react";


function Pessoa({cor="#7131ae",saia=false,tamanho=54}:{cor?:string;saia?:boolean;tamanho?:number}){
return <svg width={tamanho} height={tamanho*1.35} viewBox="0 0 64 88" fill="none" aria-hidden="true"><circle cx="32" cy="11" r="10" fill={cor}/>{saia?<path d="M24 23h16l8 35H16l8-35Z" fill={cor}/>:<rect x="21" y="23" width="22" height="37" rx="8" fill={cor}/>}<path d="M24 27 15 51M40 27l9 24" stroke={cor} strokeWidth="8" strokeLinecap="round"/><path d="M25 57v23M39 57v23" stroke={cor} strokeWidth="8" strokeLinecap="round"/></svg>}
function PessoasIlustradas({compacta=false}:{compacta?:boolean}){return <div className={`ri-people-art${compacta?" compact":""}`} aria-hidden="true"><Pessoa cor="#7131ae" saia tamanho={compacta?40:55}/><Pessoa cor="#42b9e5" tamanho={compacta?40:55}/></div>}
function MundoIlustrado(){return <svg className="ri-world-art" viewBox="0 0 190 150" fill="none" aria-hidden="true"><path d="M44 12 61 91" stroke="#7435b1" strokeWidth="5" strokeLinecap="round"/><path d="M64 18Q111 -3 168 21v74q-57 -24-104 -3V18Z" fill="#7435b1"/><path d="m86 36 15-8 14 4 5 10-10 3-4 14-12 5-8-8-4-12Zm37-3 17-1 8 10-9 13-5 16-10 8-7-6 3-20Zm-24 38 10 7 4 11-8 3-7-10Z" fill="#f9eafa"/><circle cx="110" cy="107" r="12" fill="#7435b1"/><path d="M99 124h22l9 21H90l9-21Z" fill="#7435b1"/><path d="M87 143h57" stroke="#7435b1" strokeWidth="7" strokeLinecap="round"/><path d="M10 142h57v-18H38v-15H10v33Z" fill="#7435b1"/></svg>}
function MulheresIlustradas(){return <div className="ri-women-art" aria-hidden="true">{["#caa1e9","#9959cb","#7131ae","#caa1e9"].map((cor,i)=><Pessoa key={i} cor={cor} saia tamanho={46}/>)}</div>}
function TestemunhasIlustradas(){return <svg className="ri-witness-art" viewBox="0 0 110 80" fill="none" aria-hidden="true"><path d="M6 41Q55-13 104 41Q55 94 6 41Z" fill="#dfbbf4" stroke="#7131ae" strokeWidth="4"/><circle cx="55" cy="41" r="23" fill="#7131ae"/><circle cx="55" cy="41" r="10" fill="#fff"/><circle cx="55" cy="41" r="5" fill="#7131ae"/></svg>}
function RelogiosIlustrados(){return <div className="ri-clocks" aria-hidden="true">{Array.from({length:6},(_,i)=><svg key={i} width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="17" r="12" stroke="#f6d4ff" strokeWidth="2.5"/><path d="M16 8v9l6 4M12 3h8" stroke="#f6d4ff" strokeWidth="2.5" strokeLinecap="round"/></svg>)}</div>}
function DinheiroIlustrado(){return <svg className="ri-money-art" viewBox="0 0 132 96" fill="none" aria-hidden="true"><rect x="19" y="26" width="70" height="42" rx="5" fill="#7131ae"/><rect x="28" y="35" width="70" height="42" rx="5" fill="#9e5bc9"/><circle cx="63" cy="55" r="14" fill="#ffdf63"/><path d="M62 44v22m7-17c-6-5-14-2-14 3 0 6 14 1 14 8-1 7-12 7-16 2" stroke="#7131ae" strokeWidth="3" strokeLinecap="round"/><path d="M103 29 117 16m-14 0h14v13" stroke="#7131ae" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></svg>}

function Stat({ valor, legenda }: { valor: string; legenda: string }) {
  return <div className="ri-stat"><strong>{valor}</strong><span>{legenda}</span></div>;
}
function MulheresHomens({ mulheres, homens }: { mulheres: number; homens: number }) {
  return <div className="ri-population">
    <PessoasIlustradas />
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
          <div className="ri-world-composition"><div className="ri-world-stats">
            <Stat valor="70º" legenda="lugar no mundo, entre 146 países" />
            <Stat valor="16º" legenda="lugar na América Latina" />
          </div>
          <MundoIlustrado /></div><small className="ri-source">Fonte: Global Gender Gap Report 2024, World Economic Forum</small>
        </article>
        <article className="ri-card">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">♙</span><h4>Brasil · População</h4></div>
          <MulheresHomens mulheres={51.5} homens={48.5} />
        </article>
        <article className="ri-card">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">⌖</span><h4>Município do Rio · População</h4></div>
          <MulheresHomens mulheres={53.2} homens={46.8} />
          <div className="ri-elder"><Pessoa cor="#7131ae" saia tamanho={28}/><strong>~60%</strong><span>da população idosa é composta por mulheres</span></div>
        </article>
      </div>
      <div className="ri-mid-grid">
        <article className="ri-card ri-violence">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">◇</span><h4>Violência doméstica e familiar</h4></div>
          <div className="ri-big-number"><strong>23,6 milhões</strong><span>de mulheres já sofreram violência no Brasil</span></div>
          <MulheresIlustradas /><div className="ri-violence-grid">
            <Stat valor="27%" legenda="das brasileiras · cerca de 1 em cada 4 mulheres" />
            <Stat valor="30%" legenda="média mundial (OMS)" />
          </div>
          <div className="ri-divider" />
          <h5>Rio de Janeiro</h5>
          <div className="ri-inline-stats"><Stat valor="2,5 milhões+" legenda="de mulheres" /><Stat valor="3º" legenda="estado com mais casos no país" /></div>
          <div className="ri-witness-illustration"><TestemunhasIlustradas /><span>Testemunhas nas situações de violência</span></div><div className="ri-witness">
            <div><strong>7 em cada 10</strong><span>casos tiveram testemunhas</span></div>
            <div><strong>71%</strong><span>das agressões com testemunhas foram presenciadas por crianças</span></div>
          </div>
        </article>
        <article className="ri-card ri-femicide">
          <div className="ri-card-head"><span className="ri-icon" aria-hidden="true">◷</span><h4>Feminicídio</h4></div>
          <div className="ri-femicide-hero"><strong>1.470</strong><span>vítimas no Brasil</span></div>
          <RelogiosIlustrados /><div className="ri-femicide-frequency">
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
        <div className="ri-income-title"><DinheiroIlustrado /><div><span>DESIGUALDADE ECONÔMICA</span><h4>Disparidade de renda</h4></div></div>
        <div className="ri-income-grid">
          <div className="ri-income-br">
            <h5>Brasil · Rendimento médio mensal por gênero</h5>
            <div className="ri-income-figures"><PessoasIlustradas compacta /></div><div className="ri-salary"><div><span>Homens</span><strong>R$ 3.735</strong><i style={{width:"100%"}} /></div><div><span>Mulheres</span><strong>R$ 2.973</strong><i style={{width:"79.6%"}} /></div></div>
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
