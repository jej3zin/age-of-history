import { useCallback, useEffect, useState } from "react";
import { createInitialState } from "./data/scenario";
import { advanceOneDay } from "./game/simulation";
import type { GameState } from "./game/types";
import { loadGame, saveGame } from "./persistence/saveGame";
import HomePage from "./pages/HomePage";
import GameplayPage from "./pages/GameplayPage";

type Page = "home" | "gameplay";
function currentPage(): Page {
  return window.location.pathname.replace(/\/+$/, "") === "/gameplay" ? "gameplay" : "home";
}

export default function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [notice, setNotice] = useState("Selecione territórios no mapa e avance o tempo para iniciar a simulação.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onPopState = () => setPage(currentPage());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((next: Page) => {
    const path = next === "gameplay" ? "/gameplay" : "/";
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setPage(next);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const selectTerritory = (id: string) => {
    const territory = state.territories.find(item => item.id === id);
    if (!territory) return;
    setState(s => ({ ...s, selectedTerritoryId: id, selectedCountryId: territory.countryId }));
  };
  const startCampaign = () => {
    setState(createInitialState());
    setNotice("Nova campanha iniciada. Selecione territórios no mapa e avance o tempo.");
    navigate("gameplay");
  };
  const nextDay = () => {
    setState(s => advanceOneDay(s));
    setNotice("A simulação avançou um dia. Orçamento e indicadores foram atualizados.");
  };
  const newCampaign = () => {
    setState(createInitialState());
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
        setNotice("Campanha carregada.");
        navigate("gameplay");
      } else setNotice("Nenhum salvamento encontrado neste navegador. Inicie uma nova campanha.");
    } catch (error) {
      setNotice("Não foi possível carregar: " + (error instanceof Error ? error.message : "erro desconhecido"));
    } finally { setBusy(false); }
  }

  if (page === "home") return <HomePage onStart={startCampaign} onContinue={() => void load()} />;
  return <GameplayPage state={state} notice={notice} busy={busy} onHome={() => navigate("home")} onNewCampaign={newCampaign} onLoad={() => void load()} onSave={() => void save()} onNextDay={nextDay} onSelectTerritory={selectTerritory} />;
}
