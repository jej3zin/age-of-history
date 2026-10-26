import { useMemo, useState } from "react";
import type { GameState } from "../game/types";
import WorldMap from "../map/WorldMap";

type Props = {
  state: GameState;
  onCancel: () => void;
  onConfirm: (setup: { countryId: string; customNation: boolean; customName: string; customColor: string }) => void;
};

export default function CampaignSetupPage({ state, onCancel, onConfirm }: Props) {
  const [countryId, setCountryId] = useState(state.countries[0]?.id ?? "");
  const [customNation, setCustomNation] = useState(false);
  const [customName, setCustomName] = useState("Minha Nação");
  const [customColor, setCustomColor] = useState("#d98b45");
  const [error, setError] = useState("");
  const countries = useMemo(() => state.countries, [state.countries]);

  function submit() {
    if (!countryId) { setError("Escolha uma nação para jogar."); return; }
    if (customNation && !customName.trim()) { setError("Digite um nome para sua nação personalizada."); return; }
    setError("");
    onConfirm({ countryId, customNation, customName: customName.trim(), customColor });
  }

  return <main className="setup-screen">
    <div className="setup-map-background"><WorldMap state={state} onSelectTerritory={() => undefined} /></div>
    <div className="setup-vignette" />
    <header className="setup-topbar"><button className="brand brand-button" onClick={onCancel}><span className="brand-mark">AH</span><span><span className="brand-title">AGE OF HISTORY</span><span className="brand-subtitle">Preparação de campanha</span></span></button><span className="setup-step">NOVA CAMPANHA <b>01 / 01</b></span></header>
    <section className="setup-layout">
      <div className="setup-intro"><span className="eyebrow">ANTES DE ESCREVER A HISTÓRIA</span><h1>Escolha seu<br/><em>lugar no mundo.</em></h1><p>Defina o cenário inicial, escolha quem você vai controlar e prepare sua campanha.</p><div className="setup-world-status"><span className="status-dot"/><span>Mapa padrão carregado</span><span className="setup-separator"/> {state.territories.length} territórios</div></div>
      <section className="setup-card">
        <div className="setup-card-heading"><span className="eyebrow">MODO HISTÓRIA</span><h2>Configure sua nação</h2><p className="setup-hint">Escolha um país existente ou personalize sua identidade para esta campanha.</p></div>
        <div className="setup-field"><label htmlFor="setup-country">Nação que você vai jogar</label><select id="setup-country" value={countryId} onChange={event => setCountryId(event.target.value)}>{countries.map(country => <option key={country.id} value={country.id}>{country.name}</option>)}</select><p className="setup-hint">Escolha qual nação você vai controlar. A personalização vale somente para esta campanha.</p></div>
        <label className="setup-check"><input type="checkbox" checked={customNation} onChange={event => setCustomNation(event.target.checked)}/><span>Personalizar esta nação</span></label>
        {customNation && <div className="setup-custom-fields"><div className="setup-field"><label htmlFor="custom-nation-name">Nome da nação</label><input id="custom-nation-name" value={customName} maxLength={48} onChange={event => setCustomName(event.target.value)} placeholder="Ex.: República de Nova Aurora"/></div><div className="setup-field"><label htmlFor="custom-nation-color">Cor da nação</label><div className="setup-color-row"><input id="custom-nation-color" aria-label="Cor da nação" type="color" value={customColor} onChange={event => setCustomColor(event.target.value)}/><span>{customColor.toUpperCase()}</span><i style={{background:customColor}}/></div></div></div>}
        {error && <p className="setup-error" role="alert">{error}</p>}
        <div className="setup-actions"><button className="button secondary" onClick={onCancel}>Voltar</button><button className="button primary" onClick={submit}>Iniciar campanha <span>→</span></button></div>
      </section>
    </section>
    <footer className="setup-footer"><span>AGE OF HISTORY</span><span>Modo História · Conduza uma nação ao longo do tempo.</span></footer>
  </main>;
}
