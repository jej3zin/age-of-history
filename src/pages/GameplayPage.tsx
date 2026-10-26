import { useState } from "react";
import type { GameState } from "../game/types";
import { formatDate, formatMoney, formatNumber } from "../game/simulation";
import { useEffect } from "react";
import type { SaveSlot } from "../persistence/saveGame";
import WorldMap from "../map/WorldMap";
import StatCard from "../components/ui/StatCard";
import Header from "../components/header/Header";

type Props = {
  state: GameState;
  notice: string;
  busy: boolean;
  timeSpeed: number;
  onSetTimeSpeed: (speed: number) => void;
  onHome: () => void;
  onNewCampaign: () => void;
  onLoad: () => void;
  onSave: () => void;
  onNextDay: () => void;
  onSelectTerritory: (id: string) => void;
  onImportGeoJSON: (file: File) => void;
  onExportCampaign: () => void;
  onImportCampaign: (file: File) => void;
  saveSlots: SaveSlot[];
  onRefreshSaveSlots: () => void;
  onSaveSlot: (name: string) => void;
  onLoadSlot: (id: string) => void;
  onRenameSlot: (id: string, name: string) => void;
  onDeleteSlot: (id: string) => void;
  onExportRawSave: (id: string) => void;
  onImportRawRecovery: (file: File) => void;
  onResolveDecision: () => void;
};

export default function GameplayPage({
  state, notice, busy, timeSpeed, onSetTimeSpeed, onHome, onNewCampaign,
  onLoad, onSave, onNextDay, onSelectTerritory, onImportGeoJSON, onExportCampaign, onImportCampaign,
  saveSlots, onRefreshSaveSlots, onSaveSlot, onLoadSlot, onRenameSlot, onDeleteSlot, onExportRawSave, onImportRawRecovery, onResolveDecision,
}: Props) {
  const [infoPanel, setInfoPanel] = useState<"territory" | "country" | null>(null);
  const [inspectedCountryId, setInspectedCountryId] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [slotPanelOpen, setSlotPanelOpen] = useState(false);
  useEffect(() => { onRefreshSaveSlots(); }, [onRefreshSaveSlots]);
  const selected = state.territories.find((territory) => territory.id === state.selectedTerritoryId) ?? state.territories[0];
  const selectedCountry = state.countries.find((country) => country.id === selected?.countryId) ?? state.countries[0];
  const inspectedCountry = state.countries.find((country) => country.id === inspectedCountryId) ?? selectedCountry;
  const countryColor = (color: number) => "#" + color.toString(16).padStart(6, "0");

  return (
    <main className="app-shell gameplay-shell">
      <Header variant="gameplay" onHome={onHome} campaignDate={formatDate(state.date)} day={state.day + 1} />

      <section className="commandbar">
        <div><span className="eyebrow">SALA DE COMANDO</span><h1>{state.campaignName}</h1></div>
        <div className="command-actions">
          <button className="button secondary" disabled={busy} onClick={onHome}>Menu inicial</button>
          <button className="button secondary" disabled={busy} onClick={onNewCampaign}>Nova campanha</button>
          <button className="button secondary" disabled={busy} onClick={onLoad}>Carregar</button>
          <button className="button secondary" disabled={busy} onClick={onSave}>Salvar automático</button>
          <button className="button secondary" disabled={busy} onClick={() => setSlotPanelOpen(value => !value)}>Slots ({saveSlots.length})</button>
          <button className="button secondary" disabled={busy} onClick={onExportCampaign}>Exportar JSON</button>
          <label className="button secondary geojson-import" aria-label="Importar campanha JSON">
            Importar campanha
            <input type="file" accept=".json,application/json" disabled={busy} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onImportCampaign(file);
              event.currentTarget.value = "";
            }} />
          </label>
          <label className="button secondary geojson-import" aria-label="Importar mapa GeoJSON">
            Importar mapa
            <input type="file" accept=".json,.geojson,application/geo+json,application/json" disabled={busy} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) onImportGeoJSON(file);
              event.currentTarget.value = "";
            }} />
          </label>
          <button className="button secondary time-toggle" disabled={busy} onClick={() => onSetTimeSpeed(timeSpeed === 0 ? 1 : 0)}>{timeSpeed === 0 ? "▶ Retomar" : "Ⅱ Pausar"}</button>
          {[1, 2, 5].map((speed) => (
            <button key={speed} className={"button " + (timeSpeed === speed ? "primary" : "secondary")} disabled={busy} aria-pressed={timeSpeed === speed} onClick={() => onSetTimeSpeed(speed)}>{speed}×</button>
          ))}
          <button className="button primary" disabled={busy} onClick={onNextDay}>Avançar 1 dia <span>→</span></button>
        </div>
      </section>

      {slotPanelOpen && (
        <section className="panel save-slots-panel">
          <div className="panel-header">
            <div><span className="eyebrow">GERENCIAMENTO DE CAMPANHAS</span><h2>Salvamentos locais</h2></div>
            <button className="button secondary" onClick={() => setSlotPanelOpen(false)}>Fechar ×</button>
          </div>
          <form className="save-slot-create" onSubmit={(event) => { event.preventDefault(); if (saveName.trim()) { onSaveSlot(saveName); setSaveName(""); } }}>
            <input aria-label="Nome do novo salvamento" value={saveName} maxLength={60} onChange={event => setSaveName(event.target.value)} placeholder={state.campaignName + " — Dia " + (state.day + 1)} />
            <button className="button primary" disabled={busy || !saveName.trim()}>Criar salvamento</button>
            <label className="button secondary geojson-import recovery-import">
              Importar arquivo de recuperação
              <input type="file" accept=".json,application/json" disabled={busy} onChange={event => {
                const file = event.currentTarget.files?.[0];
                if (file) onImportRawRecovery(file);
                event.currentTarget.value = "";
              }} />
            </label>
          </form>
          <p className="save-recovery-help">Use esta opção somente com um arquivo “salvamento-bruto” exportado pelo jogo. A recuperação valida os dados e carrega a campanha em memória; ela não altera o slot original. Confira a campanha e salve em um novo slot para manter uma cópia recuperada.</p>
          {saveSlots.length === 0 ? <p>Nenhum salvamento listado ainda. Crie um slot para guardar uma versão independente da campanha.</p> : (
            <div className="save-slot-list">
              {saveSlots.map(slot => (
                <article className="save-slot-row" key={slot.id}>
                  <div className="save-slot-info">
                    <strong>{slot.name}</strong>
                    <span>{slot.campaignName} · {formatDate(slot.date)} · Dia {slot.day + 1}</span>
                    <small>Cenário: {slot.scenarioId} · Modo: {slot.mode} · Versão: {slot.gameVersion}</small>
                    <small>{slot.isCorrupt ? "Salvamento com erro · registro original preservado" : (slot.isAuto ? "Salvamento automático" : "Salvamento manual")} · {slot.savedAt === "Data não registrada" ? slot.savedAt : new Date(slot.savedAt).toLocaleString()}</small>
                    {slot.isCorrupt && <><small className="save-slot-error">{slot.recoveryMessage ?? "Não foi possível validar este salvamento. Ele não foi alterado."}</small><button type="button" className="button secondary" disabled={busy} onClick={() => onExportRawSave(slot.id)}>Exportar dados brutos para recuperação</button></>}
                  </div>
                  <div className="save-slot-actions">
                    <button className="button secondary" disabled={busy || slot.isCorrupt} title={slot.isCorrupt ? "Este salvamento não pode ser carregado até ser recuperável." : undefined} onClick={() => onLoadSlot(slot.id)}>{slot.isCorrupt ? "Indisponível" : "Carregar"}</button>
                    {!slot.isAuto && <button className="button secondary" disabled={busy} onClick={() => { const name = window.prompt("Novo nome do salvamento", slot.name); if (name !== null) onRenameSlot(slot.id, name); }}>Renomear</button>}
                    {!slot.isAuto && <button className="button secondary" disabled={busy} onClick={() => { if (window.confirm("Excluir o salvamento ‘" + slot.name + "’? Esta ação não pode ser desfeita.")) onDeleteSlot(slot.id); }}>Excluir</button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {state.pendingDecision && <section className="panel decision-prompt" role="alertdialog" aria-labelledby="pending-decision-title" aria-describedby="pending-decision-description"><span className="eyebrow">DECISÃO NECESSÁRIA · TEMPO PAUSADO</span><h2 id="pending-decision-title">{state.pendingDecision.title}</h2><p id="pending-decision-description">{state.pendingDecision.description}</p><button type="button" className="button primary" onClick={onResolveDecision}>Confirmar e continuar</button></section>}

      <section className="status-strip" aria-live="polite">
        <span className="status-icon">i</span>{notice} {timeSpeed > 0 && <span className="time-running">· Tempo: {timeSpeed}×</span>}
      </section>

      <section className={"dashboard-grid" + (infoPanel ? " has-info-panel" : " map-focus-mode")}>
        <div className="panel map-panel">
          <div className="panel-header">
            <div><span className="eyebrow">VISÃO TERRITORIAL</span><h2>Mapa político</h2></div>
            <span className="panel-tag">{state.territories.length} territórios · {state.countries.length} países</span>
          </div>
          <div className="map-wrap"><WorldMap state={state} onSelectTerritory={(id) => { onSelectTerritory(id); setInfoPanel("territory"); }} /></div>
          <div className="map-legend">
            {state.countries.map((country) => (
              <button type="button" className={"legend-item country-legend-button" + (infoPanel === "country" && inspectedCountryId === country.id ? " active" : "")} key={country.id} onClick={() => { setInspectedCountryId(country.id); setInfoPanel("country"); }} aria-label={"Ver informações de " + country.name}>
                <span className="legend-swatch" style={{ backgroundColor: countryColor(country.color) }} />
                {country.name}{country.isPlayer && <span className="player-chip">Jogador</span>}
              </button>
            ))}
          </div>
        </div>

        {infoPanel && (
          <aside className="side-column info-panel-open">
            <div className="info-panel-dismiss">
              <span>{infoPanel === "territory" ? "DETALHES DO TERRITÓRIO" : "INFORMAÇÕES DO PAÍS"}</span>
              <button type="button" className="button secondary" onClick={() => setInfoPanel(null)} aria-label="Fechar painel de informações">Fechar ×</button>
            </div>
            {infoPanel === "territory" && (
              <section className="panel">
                <div className="panel-header">
                  <div><span className="eyebrow">TERRITÓRIO SELECIONADO</span><h2>{selected?.name ?? "Nenhum território"}</h2></div>
                  <span className="terrain-icon">⌖</span>
                </div>
                <div className="country-ribbon"><span className="country-color" style={{ backgroundColor: countryColor(selectedCountry.color) }} />{selectedCountry.name}</div>
                <div className="detail-list">
                  <div><span>Região / Estado</span><strong>{selected?.regionName ?? "Não definida"}</strong></div>
                  <div><span>Terreno</span><strong>{selected?.terrain ?? "Não definido"}</strong></div>
                  <div><span>População local</span><strong>{formatNumber(selected?.population ?? 0)}</strong></div>
                  <div><span>Produção local</span><strong>{formatNumber(selected?.production ?? 0)} un./dia</strong></div>
                  <div><span>Estabilidade nacional</span><strong>{selectedCountry.stability}/100</strong></div>
                </div>
                {Boolean(selected?.cities?.length) && (
                  <div className="city-list">
                    <div className="eyebrow">CIDADES / DISTRITOS</div>
                    {selected?.cities?.map((city) => (
                      <div className="city-row" key={city.id}><span>{city.name}</span><strong>{formatNumber(city.population)}</strong></div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {infoPanel === "country" && (
              <section className="panel">
                <div className="panel-header">
                  <div><span className="eyebrow">{inspectedCountry.isPlayer ? "PAÍS DO JOGADOR" : "PAÍS SELECIONADO"}</span><h2>{inspectedCountry.name}</h2></div>
                  {inspectedCountry.isPlayer && <span className="player-chip">Controlado por você</span>}
                </div>
                <div className="stats-grid">
                  <StatCard label="Tesouro" value={formatMoney(inspectedCountry.treasury)} detail="Saldo disponível" />
                  <StatCard label="Balanço diário" value={(inspectedCountry.dailyIncome - inspectedCountry.dailyExpense >= 0 ? "+" : "−") + formatMoney(Math.abs(inspectedCountry.dailyIncome - inspectedCountry.dailyExpense))} detail="Receita − despesas" accent={inspectedCountry.dailyIncome >= inspectedCountry.dailyExpense ? "#76d6a3" : "#ff8d8d"} />
                  <StatCard label="População" value={formatNumber(inspectedCountry.population)} detail="Habitantes" />
                  <StatCard label="Produção" value={formatNumber(inspectedCountry.production) + " un."} detail="Índice agregado" />
                </div>
                <div className="detail-list">
                  <div><span>Estabilidade</span><strong>{inspectedCountry.stability}/100</strong></div>
                  <div><span>Territórios</span><strong>{state.territories.filter((territory) => territory.countryId === inspectedCountry.id).length}</strong></div>
                  <div><span>Receita diária</span><strong>{formatMoney(inspectedCountry.dailyIncome)}</strong></div>
                  <div><span>Despesa diária</span><strong>{formatMoney(inspectedCountry.dailyExpense)}</strong></div>
                </div>
              </section>
            )}
            <section className="panel">
              <div className="panel-header"><div><span className="eyebrow">REGISTRO DA CAMPANHA</span><h2>Atividade recente</h2></div></div>
              <div className="event-list">
                {state.events.slice(0, 4).map((event) => (
                  <article className="event-item" key={event.id}>
                    <span className="event-day">D{event.day + 1}</span>
                    <div><strong>{event.title}</strong><p>{event.description}</p></div>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        )}
      </section>
      <footer className="footer"><span>AGE OF HISTORY · FUNDAÇÃO JOGÁVEL</span><span>Dados fictícios · Salvamento neste navegador</span></footer>
    </main>
  );
}
