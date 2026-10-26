import { useMemo, useState } from "react";
import type { GameState } from "../game/types";
import WorldMap from "../map/WorldMap";

type Props = {
  state: GameState;
  onCancel: () => void;
  onConfirm: (setup: { mode: "history" | "citizen"; countryId: string; customNation: boolean; customName: string; customColor: string; personName: string; profession: "Estudante" | "Trabalha"; family: string }) => void;
};

export default function CampaignSetupPage({ state, onCancel, onConfirm }: Props) {
  const [mode, setMode] = useState<"history" | "citizen">("history");
  const [countryId, setCountryId] = useState(state.countries[0]?.id ?? "");
  const [customNation, setCustomNation] = useState(false);
  const [customName, setCustomName] = useState("Minha Nação");
  const [customColor, setCustomColor] = useState("#d98b45");
  const [personName, setPersonName] = useState("");
  const [profession, setProfession] = useState<"Estudante" | "Trabalha">("Trabalha");
  const [family, setFamily] = useState("");
  const [error, setError] = useState("");
  const countries = useMemo(() => state.countries, [state.countries]);

  function submit() {
    if (!countryId) { setError("Escolha uma nação para jogar."); return; }
    if (customNation && !customName.trim()) { setError("Digite um nome para sua nação personalizada."); return; }
    if (mode === "citizen" && !personName.trim()) { setError("Digite o nome da pessoa para iniciar o modo Cidadão."); return; }
    setError("");
    onConfirm({ mode, countryId, customNation, customName: customName.trim(), customColor, personName: personName.trim(), profession, family: family.trim() });
  }

  return <main className="setup-screen">
    <div className="setup-map-background"><WorldMap state={state} onSelectTerritory={() => undefined} /></div>
    <div className="setup-vignette" />
    <header className="setup-topbar"><button className="brand brand-button" onClick={onCancel}><span className="brand-mark">AH</span><span><span className="brand-title">AGE OF HISTORY</span><span className="brand-subtitle">Preparação de campanha</span></span></button><span className="setup-step">NOVA CAMPANHA <b>01 / 01</b></span></header>
    <section className="setup-layout">
      <div className="setup-intro"><span className="eyebrow">ANTES DE ESCREVER A HISTÓRIA</span><h1>Escolha seu<br/><em>lugar no mundo.</em></h1><p>Defina o cenário inicial, escolha quem você vai controlar e prepare sua campanha.</p><div className="setup-world-status"><span className="status-dot"/><span>Mapa padrão carregado</span><span className="setup-separator"/> {state.territories.length} territórios</div></div>
      <section className="setup-card">
        <div className="setup-card-heading"><span className="eyebrow">CONFIGURAÇÃO INICIAL</span><h2>Como você quer jogar?</h2></div>
        <div className="setup-mode-switch" role="group" aria-label="Modo de jogo">
          <button type="button" className={mode === "history" ? "setup-mode active" : "setup-mode"} onClick={() => setMode("history")}><span>♜</span><strong>História</strong><small>Governe uma nação</small></button>
          <button type="button" className={mode === "citizen" ? "setup-mode active" : "setup-mode"} onClick={() => setMode("citizen")}><span>♙</span><strong>Cidadão</strong><small>Viva como uma pessoa</small></button>
        </div>
        <div className="setup-field"><label htmlFor="setup-country">Nação que você vai jogar</label><select id="setup-country" value={countryId} onChange={event => setCountryId(event.target.value)}>{countries.map(country => <option key={country.id} value={country.id}>{country.name}</option>)}</select><p className="setup-hint">Escolha uma nação predefinida ou personalize o país selecionado.</p></div>
        <label className="setup-check"><input type="checkbox" checked={customNation} onChange={event => setCustomNation(event.target.checked)}/><span>Personalizar esta nação</span></label>
        {customNation && <div className="setup-custom-fields"><div className="setup-field"><label htmlFor="custom-nation-name">Nome da nação</label><input id="custom-nation-name" value={customName} maxLength={48} onChange={event => setCustomName(event.target.value)} placeholder="Ex.: República de Nova Aurora"/></div><div className="setup-field"><label htmlFor="custom-nation-color">Cor da nação</label><div className="setup-color-row"><input id="custom-nation-color" aria-label="Cor da nação" type="color" value={customColor} onChange={event => setCustomColor(event.target.value)}/><span>{customColor.toUpperCase()}</span><i style={{background:customColor}}/></div></div></div>}
        {mode === "citizen" && <div className="setup-citizen-section"><div className="setup-section-title"><span className="eyebrow">MODO CIDADÃO</span><h3>Quem é você?</h3></div><div className="setup-field"><label htmlFor="person-name">Nome da pessoa</label><input id="person-name" value={personName} maxLength={64} onChange={event => setPersonName(event.target.value)} placeholder="Digite o nome do personagem"/></div><div className="setup-field"><label htmlFor="person-profession">Profissão</label><select id="person-profession" value={profession} onChange={event => setProfession(event.target.value as "Estudante" | "Trabalha")}><option value="Estudante">Estudante</option><option value="Trabalha">Trabalha</option></select><p className="setup-hint">{profession === "Estudante" ? "Estudante: mais despesas diárias e foco no desenvolvimento." : "Trabalha: gera uma pequena renda adicional por dia."}</p></div><div className="setup-field"><label htmlFor="person-family">Família <span>(opcional)</span></label><input id="person-family" value={family} maxLength={120} onChange={event => setFamily(event.target.value)} placeholder="Vazio = não tem família"/></div></div>}
        {error && <p className="setup-error" role="alert">{error}</p>}
        <div className="setup-actions"><button className="button secondary" onClick={onCancel}>Voltar</button><button className="button primary" onClick={submit}>Iniciar campanha <span>→</span></button></div>
      </section>
    </section>
    <footer className="setup-footer"><span>AGE OF HISTORY</span><span>Suas escolhas definem o começo da campanha.</span></footer>
  </main>;
}
