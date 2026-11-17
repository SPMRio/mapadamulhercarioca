import React from "react";

// Ilustrações vetoriais editoriais, desenhadas no código e independentes de arquivos externos.
function Pessoa({cor="#7430b3",modelo="saia",pequena=false}:{cor?:string;modelo?:"saia"|"calca";pequena?:boolean}) {
  return <svg viewBox="0 0 74 120" className={pequena?"rd-person rd-person-small":"rd-person"} aria-hidden="true" fill="none">
    <circle cx="37" cy="15" r="15" fill={cor}/>
    {modelo==="saia" ? <path d="M24 36h26l13 53H11l13-53Z" fill={cor}/> : <rect x="20" y="36" width="34" height="55" rx="14" fill={cor}/>}
    <path d="M22 44 9 78M52 44l13 34" stroke={cor} strokeWidth="12" strokeLinecap="round"/>
    <path d="M25 88v25M49 88v25" stroke={cor} strokeWidth="14" strokeLinecap="round"/>
  </svg>;
}
function BandeiraMundo() {
  return <svg className="rd-flag-art" viewBox="0 0 210 218" fill="none" aria-hidden="true">
    <path d="m36 15 47 140" stroke="#752cb0" strokeWidth="7" strokeLinecap="round"/>
    <path d="M62 23Q110 4 192 22v93q-62-22-107-4L62 23Z" fill="#742cb0"/>
    <path d="m94 45 18-14 22 5 9 15-14 14-19-1-8 18-16-8 3-17Zm52-3 27 3-2 22-15 19-8-6-6-24Zm-25 44 18-9 10 12-7 14-18-4Z" fill="#fff" opacity=".95"/>
    <circle cx="126" cy="142" r="16" fill="#742cb0"/>
    <path d="M115 165h21l18 28h-46l7-28Z" fill="#742cb0"/>
    <path d="m115 177-15 22m35-18 21 21" stroke="#742cb0" strokeWidth="12" strokeLinecap="round"/>
    <path d="M44 203h111v10H44zM51 178h42v25H51z" fill="#742cb0"/>
  </svg>;
}
function Lupa() {return <svg viewBox="0 0 70 75" fill="none" aria-hidden="true"><circle cx="28" cy="28" r="23" stroke="currentColor" strokeWidth="6"/><circle cx="28" cy="28" r="12" stroke="currentColor" strokeWidth="3"/><path d="m45 47 19 20" stroke="currentColor" strokeWidth="9" strokeLinecap="round"/></svg>}
function Relogio() {return <svg viewBox="0 0 42 42" fill="none" aria-hidden="true"><circle cx="21" cy="22" r="16" stroke="currentColor" strokeWidth="3"/><path d="M21 10v12l8 7M15 3h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>}
function SacoDinheiro() {return <svg viewBox="0 0 85 96" fill="none" aria-hidden="true"><path d="M29 8c4 7 8 9 13 9s9-2 13-9l-5 22C66 45 77 65 67 81c-7 11-42 12-49-1-10-17 3-39 20-50L29 8Z" fill="#7830b1"/><path d="M35 22h19" stroke="#ffd34d" strokeWidth="6" strokeLinecap="round"/><text x="42" y="68" fill="#ffd34d" fontSize="37" textAnchor="middle" fontWeight="900">$</text></svg>}
function GraficoSubida(){return <svg viewBox="0 0 125 100" fill="none" aria-hidden="true"><rect x="10" y="65" width="20" height="28" rx="8" fill="#cb8bef"/><rect x="42" y="48" width="20" height="45" rx="8" fill="#a35bdd"/><rect x="74" y="30" width="20" height="63" rx="8" fill="#cf8dec"/><path d="m8 47 34-25 20 11 43-28m-20 0h20v20" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function RendaPessoas(){return <div className="rd-renda-pessoas" aria-hidden="true"><div><Pessoa cor="#7330b1"/><span>R$ 2.973</span></div><i/><div><Pessoa cor="#17385f" modelo="calca"/><span>R$ 3.735</span></div></div>}
function Habitantes({mulheres,homens}:{mulheres:string;homens:string}) {return <div className="rd-habitantes"><div className="rd-habitantes-fig"><Pessoa cor="#7732b3"/><Pessoa cor="#43b9e5" modelo="calca"/></div><div className="rd-habitantes-numeros"><div><b>{mulheres}</b><span>Mulheres</span></div><div><b>{homens}</b><span>Homens</span></div></div></div>}

export default function RadarInfografico() {
 return <div className="rd-painel" aria-label="Infográfico Radar de Dados">
  <h3 className="rd-title">INFOGRÁFICO <span>|</span> RADAR DE DADOS</h3>
  <div className="rd-grade">
   <article className="rd-bloco rd-mundo">
    <h4>ÍNDICE GLOBAL DE DISPARIDADE DE GÊNERO</h4>
    <div className="rd-mundo-layout"><div className="rd-mundo-numeros"><h5>BRASIL</h5><strong>70º</strong><p>País no mundo <small>(entre 146 países)</small></p><strong>16º</strong><p>País na América Latina</p></div><BandeiraMundo/></div>
    <small className="rd-fonte">Fonte: Global Gender Gap Report 2024, World Economic Forum</small>
   </article>
   <article className="rd-bloco rd-populacao">
    <h4>POPULAÇÃO</h4>
    <div className="rd-local"><span className="rd-pin">●</span> BRASIL</div>
    <Habitantes mulheres="51,5%" homens="48,5%"/>
    <div className="rd-local rd-local-rio"><span className="rd-pin">●</span> MUNICÍPIO DO RIO</div>
    <div className="rd-rio-percent"><span>Mulheres: <b>53,2%</b></span><span>Homens: <b>46,8%</b></span></div>
    <div className="rd-idosas"><div className="rd-idosas-fig"><Pessoa cor="#17385f" pequena/><Pessoa cor="#17385f" modelo="calca" pequena/></div><div><b>60%</b><span>da população idosa são mulheres</span></div></div>
    <small className="rd-fonte">Fonte: Instituto Brasileiro de Geografia e Estatística (IBGE)</small>
   </article>
   <article className="rd-bloco rd-violencia">
    <h4>VIOLÊNCIA DOMÉSTICA E FAMILIAR</h4>
    <p className="rd-intro-violencia"><b>▶ 23,6 milhões</b> de brasileiras relataram sofrer violência em 2025<br/><strong>1 EM CADA 4 MULHERES</strong></p>
    <div className="rd-quatro-mulheres" aria-hidden="true"><Pessoa cor="#c48ae8"/><Pessoa cor="#be82e9"/><Pessoa cor="#7130b3"/><Pessoa cor="#c48ae8"/></div>
    <div className="rd-violencia-percent"><p><b>27%</b> das brasileiras sofreram violência de gênero em 2025</p><div><b>30%</b></div><p>Média mundial segundo a OMS</p></div>
    <div className="rd-faixa-rj">RJ é o 3º estado com<br/> mais casos no país</div>
    <p className="rd-mais-rj">Mais de <b>2,5 milhões</b> de mulheres no Rio de Janeiro</p>
    <div className="rd-testemunhas"><div><Lupa/><p><b>7 em cada 10</b> casos tiveram testemunhas</p></div><div><Pessoa cor="#b777df" pequena/><p><b>71%</b> dessas agressões com testemunhas foram presenciadas por crianças</p></div></div>
    <small className="rd-fonte">Fonte: Observatório da Mulher contra a Violência / Senado Federal</small>
   </article>
   <article className="rd-bloco rd-feminicidio">
    <h4>FEMINICÍDIO</h4>
    <div className="rd-femi-grid"><div className="rd-femi-esquerda"><div className="rd-losango"><b>1.470</b><span>vítimas<br/>no país</span></div><p>EM MÉDIA <b>4</b><br/><strong>MULHERES ASSASSINADAS POR DIA</strong></p><hr/><h5>104 CASOS<br/>EM 2025</h5><p>Rio de Janeiro: 2º estado com mais vítimas no Brasil</p></div>
     <div className="rd-femi-direita"><p>uma mulher assassinada</p><div className="rd-relogios">{Array.from({length:6},(_,i)=><Relogio key={i}/>)}</div><p>a cada<br/><b>6 horas</b></p><hr/><div className="rd-subida"><GraficoSubida/><div><b>535 CASOS</b><span>EM 2015</span><b>1.470 CASOS</b><span>EM 2025</span></div></div></div>
    </div>
    <p className="rd-taxa">Taxa por 100 mil habitantes: <b>RJ 1,35</b> · <b>Brasil 1,67</b></p>
    <small className="rd-fonte">Fonte: Sistema Nacional de Informações de Segurança Pública (SINESP/MJSP)</small>
   </article>
   <article className="rd-bloco rd-renda">
    <h4>DISPARIDADE DE RENDA</h4>
    <div className="rd-renda-grade"><div className="rd-renda-resumo"><span className="rd-renda-setas">↑<br/>↓</span><p>No Brasil, mulheres recebem <b>quase R$ 10 mil a menos por ano</b></p></div>
    <div className="rd-renda-meio"><RendaPessoas/><p>Rendimento médio mensal<br/><b>Diferença de R$ 762 por mês</b></p></div>
    <div className="rd-renda-saco"><SacoDinheiro/><p>Diferença equivalente a <b>54% de um salário mínimo</b></p></div>
    <div className="rd-renda-municipio"><b>MUNICÍPIO DO RIO</b><strong>R$ 1.458</strong><span>a menos por mês para as mulheres</span><small>Equivalente a 1 salário mínimo por mês. A cada dois meses trabalhados, o homem recebe 1 salário mínimo a mais.</small></div></div>
    <small className="rd-fonte">Fonte: Instituto Brasileiro de Geografia e Estatística (IBGE)</small>
   </article>
  </div>
 </div>;
}
