import { useMemo, useState } from "react";
import { createInitialState } from "./data/scenario";
import { advanceOneDay, formatDate, formatMoney, formatNumber } from "./game/simulation";
import type { GameState } from "./game/types";
import { loadGame, saveGame } from "./persistence/saveGame";
import WorldMap from "./map/WorldMap";
import StatCard from "./components/StatCard";

export default function App() {
 const [state,setState]=useState<GameState>(()=>createInitialState());
 const [notice,setNotice]=useState("Selecione territórios no mapa e avance o tempo para iniciar a simulação.");
 const [busy,setBusy]=useState(false);
 const selected=state.territories.find(t=>t.id===state.selectedTerritoryId)??state.territories[0];
 const selectedCountry=state.countries.find(c=>c.id===selected?.countryId)??state.countries[0];
 const player=state.countries.find(c=>c.isPlayer)??state.countries[0];
 const balance=player.dailyIncome-player.dailyExpense;
 const countries=state.countries;
 const selectTerritory=(id:string)=>{const t=state.territories.find(x=>x.id===id);if(!t)return;setState(s=>({...s,selectedTerritoryId:id,selectedCountryId:t.countryId}));};
 const nextDay=()=>{setState(s=>advanceOneDay(s));setNotice("Simulação avançou um dia. Orçamento e indicadores foram atualizados.");};
 const newCampaign=()=>{setState(createInitialState());setNotice("Nova campanha iniciada. O salvamento anterior continua disponível até ser sobrescrito.");};
 async function save(){setBusy(true);try{await saveGame(state);setNotice("Campanha salva neste navegador.");}catch(e){setNotice("Não foi possível salvar: "+(e instanceof Error?e.message:"erro desconhecido"));}finally{setBusy(false);}}
 async function load(){setBusy(true);try{const saved=await loadGame();if(saved){setState(saved);setNotice("Campanha carregada.");}else setNotice("Nenhum salvamento encontrado neste navegador.");}catch(e){setNotice("Não foi possível carregar: "+(e instanceof Error?e.message:"erro desconhecido"));}finally{setBusy(false);}}
 return <main className="app-shell">
  <header className="topbar"><div className="brand"><div className="brand-mark">AH</div><div><div className="brand-title">AGE OF HISTORY</div><div className="brand-subtitle">Protótipo estratégico · v0.1</div></div></div><div className="campaign-meta"><span className="status-dot"/> Campanha local <span className="meta-divider"/>{formatDate(state.date)}<span className="meta-divider"/>Dia {state.day+1}</div></header>
  <section className="commandbar"><div><span className="eyebrow">CENÁRIO DE TESTE</span><h1>{state.campaignName}</h1></div><div className="command-actions"><button className="button secondary" disabled={busy} onClick={newCampaign}>Nova campanha</button><button className="button secondary" disabled={busy} onClick={()=>void load()}>Carregar</button><button className="button secondary" disabled={busy} onClick={()=>void save()}>{busy?"Processando…":"Salvar campanha"}</button><button className="button primary" disabled={busy} onClick={nextDay}>Avançar 1 dia <span>→</span></button></div></section>
  <section className="status-strip" aria-live="polite"><span className="status-icon">i</span>{notice}</section>
  <section className="dashboard-grid">
   <div className="panel map-panel"><div className="panel-header"><div><span className="eyebrow">VISÃO TERRITORIAL</span><h2>Mapa político</h2></div><span className="panel-tag">6 territórios · 3 países</span></div><div className="map-wrap"><WorldMap state={state} onSelectTerritory={selectTerritory}/></div><div className="map-legend">{countries.map(c=><div className="legend-item" key={c.id}><span className="legend-swatch" style={{backgroundColor:"#"+c.color.toString(16).padStart(6,"0")}}/>{c.name}{c.isPlayer&&<span className="player-chip">Jogador</span>}</div>)}</div></div>
   <aside className="side-column">
    <section className="panel"><div className="panel-header"><div><span className="eyebrow">TERRITÓRIO SELECIONADO</span><h2>{selected?.name??"Nenhum território"}</h2></div><span className="terrain-icon">⌖</span></div><div className="country-ribbon"><span className="country-color" style={{backgroundColor:"#"+selectedCountry.color.toString(16).padStart(6,"0")}}/>{selectedCountry.name}</div><div className="detail-list"><div><span>Terreno</span><strong>{selected?.terrain}</strong></div><div><span>População local</span><strong>{formatNumber(selected?.population??0)}</strong></div><div><span>Produção local</span><strong>{formatNumber(selected?.production??0)} un./dia</strong></div><div><span>Estabilidade nacional</span><strong>{selectedCountry.stability}/100</strong></div></div></section>
    <section className="panel"><div className="panel-header"><div><span className="eyebrow">PAÍS DO JOGADOR</span><h2>{player.name}</h2></div><span className="player-chip">Controlado por você</span></div><div className="stats-grid"><StatCard label="Tesouro" value={formatMoney(player.treasury)} detail="Saldo disponível"/><StatCard label="Balanço diário" value={(balance>=0?"+":"−")+formatMoney(Math.abs(balance))} detail="Receita − despesas" accent={balance>=0?"#76d6a3":"#ff8d8d"}/><StatCard label="População" value={formatNumber(player.population)} detail="Habitantes"/><StatCard label="Produção" value={formatNumber(player.production)+" un."} detail="Índice agregado"/></div><div className="budget-row"><div><span>Receita diária</span><strong>{formatMoney(player.dailyIncome)}</strong></div><div><span>Despesa diária</span><strong>{formatMoney(player.dailyExpense)}</strong></div></div></section>
    <section className="panel"><div className="panel-header"><div><span className="eyebrow">REGISTRO DA CAMPANHA</span><h2>Atividade recente</h2></div></div><div className="event-list">{state.events.slice(0,4).map(e=><article className="event-item" key={e.id}><span className="event-day">D{e.day+1}</span><div><strong>{e.title}</strong><p>{e.description}</p></div></article>)}</div></section>
   </aside>
  </section><footer className="footer"><span>AGE OF HISTORY · FUNDAÇÃO JOGÁVEL</span><span>Dados fictícios · Salvamento neste navegador</span></footer>
 </main>;
}
