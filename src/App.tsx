import { useCallback, useEffect, useState } from "react";
import { createInitialState } from "./data/scenario";
import { advanceOneDay } from "./game/simulation";
import type { GameState } from "./game/types";
import { loadGame, saveGame } from "./persistence/saveGame";
import HomePage from "./pages/HomePage";
import GameplayPage from "./pages/GameplayPage";
import { importTerritoriesFromGeoJSON } from "./map/geoJson";

type Page = "home" | "gameplay";
function currentPage(): Page {
  return window.location.pathname.replace(/\/+$/, "") === "/gameplay" ? "gameplay" : "home";
}

export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [notice, setNotice] = useState("Selecione territórios no mapa e avance o tempo para iniciar a simulação.");
  const [busy, setBusy] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(0);

  useEffect(() => {
    const onPopState = () => setPage(currentPage());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // A velocidade altera apenas a cadência dos ticks; cada tick continua sendo exatamente um dia.
  useEffect(() => {
    if (page !== "gameplay" || timeSpeed === 0 || busy) return;
    const intervalMs = 2000 / timeSpeed;
    const timer = window.setInterval(() => setState(current => advanceOneDay(current)), intervalMs);
    return () => window.clearInterval(timer);
  }, [page, timeSpeed, busy]);

  const navigate = useCallback((next: Page) => {
    const path = next === "gameplay" ? "/gameplay" : "/";
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setPage(next);
    if (next === "home") setTimeSpeed(0);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const importGeoJSON = async (file: File) => {
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const territories = importTerritoriesFromGeoJSON(parsed, new Set(state.countries.map(country => country.id)));
      setState(current => ({ ...current, territories, selectedTerritoryId: territories[0].id, selectedCountryId: territories[0].countryId }));
      setTimeSpeed(0);
      setNotice(`Mapa importado: ${territories.length} territórios carregados de ${file.name}. A simulação foi pausada.`);
    } catch (error) {
      setNotice("Falha ao importar GeoJSON: " + (error instanceof Error ? error.message : "arquivo inválido"));
    } finally { setBusy(false); }
  };

  const selectTerritory = (id: string) => {
    const territory = state.territories.find(item => item.id === id);
    if (!territory) return;
    setState(s => ({ ...s, selectedTerritoryId: id, selectedCountryId: territory.countryId }));
  };
  const startCampaign = () => {
    setState(createInitialState());
    setTimeSpeed(0);
    setNotice("Nova campanha iniciada. Selecione territórios no mapa e avance o tempo.");
    navigate("gameplay");
  };
  const nextDay = () => {
    setState(s => advanceOneDay(s));
    setNotice("A simulação avançou um dia. Orçamento e indicadores foram atualizados.");
  };
  const newCampaign = () => {
    setState(createInitialState());
    setTimeSpeed(0);
    setNotice("Nova campanha iniciada. O salvamento anterior permanece disponível até ser sobrescrito.");
  };
  async function save() {
    setBusy(true);
    try { await saveGame(state); setNotice("Campanha salva neste navegador."); }
    catch (error) { setNotice("Não foi possível salvar: " + (error instanceof Error ? error.message : "erro desconhecido")); }
    finally { setBusy(false); }
  }
  async function load() {
    setBusy(true);
    try {
      const saved = await loadGame();
      if (saved) {
        setState(saved);
        setTimeSpeed(0);
        setNotice("Campanha carregada em pausa.");
        navigate("gameplay");
      } else setNotice("Nenhum salvamento encontrado neste navegador. Inicie uma nova campanha.");
    } catch (error) {
      setNotice("Não foi possível carregar: " + (error instanceof Error ? error.message : "erro desconhecido"));
    } finally { setBusy(false); }
  }

  if (page === "home") return <HomePage onStart={startCampaign} onContinue={() => void load()} />;
  return <GameplayPage state={state} notice={notice} busy={busy} timeSpeed={timeSpeed} onSetTimeSpeed={setTimeSpeed} onHome={() => navigate("home")} onNewCampaign={newCampaign} onLoad={() => void load()} onSave={() => void save()} onNextDay={nextDay} onSelectTerritory={selectTerritory} onImportGeoJSON={file => void importGeoJSON(file)} />;
}
