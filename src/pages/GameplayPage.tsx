import type { GameState } from "../game/types";
import { formatDate, formatMoney, formatNumber } from "../game/simulation";
import WorldMap from "../map/WorldMap";
import StatCard from "../components/StatCard";

type Props = {
  state: GameState;
  notice: string;
  busy: boolean;
  onHome: () => void;
  onNewCampaign: () => void;
  onLoad: () => void;
  onSave: () => void;
  onNextDay: () => void;
  onSelectTerritory: (id: string) => void;
};

export default function GameplayPage({ state, notice, busy, onHome, onNewCampaign, onLoad, onSave, onNextDay, onSelectTerritory }: Props) {
  const selected = state.territories.find(t => t.id === state.selectedTerritoryId) ?? state.territories[0];
  const selectedCountry = state.countries.find(c => c.id === selected?.countryId) ?? state.countries[0];
  const player = state.countries.find(c => c.isPlayer) ?? state.countries[0];
  const balance = player.dailyIncome - player.dailyExpense;

  return <main className="app-shell gameplay-shell">
    <header className="topbar">
      <button className="brand brand-button" onClick={onHome} aria-label="Voltar à página inicial"><div className="brand-mark">AH</div><div><div className="brand-title">AGE OF HISTORY</div><div className="brand-subtitle">Campanha estratégica · v0.1</div></div></button>
      <div className="campaign-meta"><span className="status-dot" /> Campanha local <span className="meta-divider" />{formatDate(state.date)}<span className="meta-divider" />Dia {state.day + 1}</div>
    </header>
    <section className="commandbar"><div><span className="eyebrow">SALA DE COMANDO</span><h1>{state.campaignName}</h1></div><div className="command-actions">
      <button className="button secondary" disabled={busy} onClick={onHome}>Menu inicial</button><button className="button secondary" disabled={busy} onClick={onNewCampaign}>Nova campanha</button><button className="button secondary" disabled={busy} onClick={onLoad}>Carregar</button><button className="button secondary" disabled={busy} onClick={onSave}>{busy ? "Processando…" : "Salvar campanha"}</button><button className="button primary" disabled={busy} onClick={onNextDay}>Avançar 1 dia <span>→</span></button>
    </div></section>
    <section className="status-strip" aria-live="polite"><span className="status-icon">i</span>{notice}</section>
    <section className="dashboard-grid">
      <div className="panel map-panel"><div className="panel-header"><div><span className="eyebrow">VISÃO TERRITORIAL</span><h2>Mapa político</h2></div><span className="panel-tag">6 territórios · 3 países</span></div><div className="map-wrap"><WorldMap state={state} onSelectTerritory={onSelectTerritory} /></div><div className="map-legend">{state.countries.map(c=><div className="legend-item" key={c.id}><span className="legend-swatch" style={{backgroundColor:"#"+c.color.toString(16).padStart(6,"0")}}/>{c.name}{c.isPlayer&&<span className="player-chip">Jogador</span>}</div>)}</div></div>
      <aside className="side-column">
        <section className="panel"><div className="panel-header"><div><span className="eyebrow">TERRITÓRIO SELECIONADO</span><h2>{selected?.name ?? "Nenhum território"}</h2></div><span className="terrain-icon">⌖</span></div><div className="country-ribbon"><span className="country-color" style={{backgroundColor:"#"+selectedCountry.color.toString(16).padStart(6,"0")}}/>{selectedCountry.name}</div><div className="detail-list"><div><span>Terreno</span><strong>{selected?.terrain}</strong></div><div><span>População local</span><strong>{formatNumber(selected?.population ?? 0)}</strong></div><div><span>Produção local</span><strong>{formatNumber(selected?.production ?? 0)} un./dia</strong></div><div><span>Estabilidade nacional</span><strong>{selectedCountry.stability}/100</strong></div></div></section>
        <section className="panel"><div className="panel-header"><div><span className="eyebrow">PAÍS DO JOGADOR</span><h2>{player.name}</h2></div><span className="player-chip">Controlado por você</span></div><div className="stats-grid"><StatCard label="Tesouro" value={formatMoney(player.treasury)} detail="Saldo disponível"/><StatCard label="Balanço diário" value={(balance>=0?"+":"−")+formatMoney(Math.abs(balance))} detail="Receita − despesas" accent={balance>=0?"#76d6a3":"#ff8d8d"}/><StatCard label="População" value={formatNumber(player.population)} detail="Habitantes"/><StatCard label="Produção" value={formatNumber(player.production)+" un."} detail="Índice agregado"/></div><div className="budget-row"><div><span>Receita diária</span><strong>{formatMoney(player.dailyIncome)}</strong></div><div><span>Despesa diária</span><strong>{formatMoney(player.dailyExpense)}</strong></div></div></section>
        <section className="panel"><div className="panel-header"><div><span className="eyebrow">REGISTRO DA CAMPANHA</span><h2>Atividade recente</h2></div></div><div className="event-list">{state.events.slice(0,4).map(e=><article className="event-item" key={e.id}><span className="event-day">D{e.day+1}</span><div><strong>{e.title}</strong><p>{e.description}</p></div></article>)}</div></section>
      </aside>
    </section>
    <footer className="footer"><span>AGE OF HISTORY · FUNDAÇÃO JOGÁVEL</span><span>Dados fictícios · Salvamento neste navegador</span></footer>
  </main>;
}
