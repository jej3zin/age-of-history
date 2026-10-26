import { useCallback, useEffect, useState } from "react";
import { createInitialState } from "./data/scenario";
import { advanceOneDay } from "./game/simulation";
import type { GameState } from "./game/types";
import { loadGame, saveGame } from "./persistence/saveGame";
import HomePage from "./pages/HomePage";
import GameplayPage from "./pages/GameplayPage";
import CampaignSetupPage from "./pages/CampaignSetupPage";
import { importTerritoriesFromGeoJSON } from "./map/geoJson";

type Page = "home" | "setup" | "gameplay";
type CampaignSetup = { mode: "history" | "citizen"; countryId: string; customNation: boolean; customName: string; customColor: string; personName: string; profession: "Estudante" | "Trabalha"; family: string };
function currentPage(): Page {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/gameplay" ? "gameplay" : path === "/setup" ? "setup" : "home";
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

  useEffect(() => {
    if (page !== "gameplay" || timeSpeed === 0 || busy) return;
    const intervalMs = 2000 / timeSpeed;
    const timer = window.setInterval(() => setState(current => advanceOneDay(current)), intervalMs);
    return () => window.clearInterval(timer);
  }, [page, timeSpeed, busy]);

  const navigate = useCallback((next: Page) => {
    const path = next === "gameplay" ? "/gameplay" : next === "setup" ? "/setup" : "/";
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setPage(next);
    if (next !== "gameplay") setTimeSpeed(0);
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
    navigate("setup");
  };

  const confirmCampaign = (setup: CampaignSetup) => {
    const initial = createInitialState();
    const countries = initial.countries.map(country => {
      if (country.id !== setup.countryId) return { ...country, isPlayer: false };
      const color = setup.customNation ? Number.parseInt(setup.customColor.replace("#", ""), 16) : country.color;
      const professionIncome = setup.mode === "citizen" && setup.profession === "Trabalha" ? 150 : 0;
      const professionExpense = setup.mode === "citizen" && setup.profession === "Estudante" ? 100 : 0;
      const familyExpense = setup.mode === "citizen" && setup.family ? 75 : 0;
      return {
        ...country,
        name: setup.customNation ? setup.customName : country.name,
        color,
        isPlayer: true,
        dailyIncome: country.dailyIncome + professionIncome,
        dailyExpense: country.dailyExpense + professionExpense + familyExpense,
      };
    });
    const playableCountry = countries.find(country => country.id === setup.countryId) ?? countries[0];
    const firstTerritory = initial.territories.find(territory => territory.countryId === setup.countryId) ?? initial.territories[0];
    const campaignName = setup.mode === "citizen" ? `${setup.personName} — Modo Cidadão` : `${playableCountry.name} — Nova campanha`;
    const nextState: GameState = {
      ...initial,
      campaignName,
      countries,
      selectedCountryId: setup.countryId,
      selectedTerritoryId: firstTerritory.id,
      events: [{
        id: "start",
        day: 0,
        title: setup.mode === "citizen" ? `A vida de ${setup.personName} começa` : "Uma nova campanha",
        description: setup.mode === "citizen"
          ? `${setup.personName} começa sua jornada em ${playableCountry.name}. Profissão: ${setup.profession}. ${setup.family ? "Família: " + setup.family + "." : "Sem família registrada."}`
          : `${playableCountry.name} inicia uma nova campanha. Você está no comando desta nação.`,
      }],
      ...(setup.mode === "citizen" ? { citizenProfile: { name: setup.personName, profession: setup.profession, family: setup.family } } : {}),
    };
    setState(nextState);
    setTimeSpeed(0);
    setNotice(setup.mode === "citizen" ? "Modo Cidadão iniciado. Profissão e família influenciam o orçamento diário." : "Nova campanha iniciada. Você controla " + playableCountry.name + ".");
    navigate("gameplay");
  };

  const nextDay = () => {
    setState(s => advanceOneDay(s));
    setNotice("A simulação avançou um dia. Orçamento e indicadores foram atualizados.");
  };
  const newCampaign = () => {
    setState(createInitialState());
    setTimeSpeed(0);
    navigate("setup");
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
  if (page === "setup") return <CampaignSetupPage state={createInitialState()} onCancel={() => navigate("home")} onConfirm={confirmCampaign} />;
  return <GameplayPage state={state} notice={notice} busy={busy} timeSpeed={timeSpeed} onSetTimeSpeed={setTimeSpeed} onHome={() => navigate("home")} onNewCampaign={newCampaign} onLoad={() => void load()} onSave={() => void save()} onNextDay={nextDay} onSelectTerritory={selectTerritory} onImportGeoJSON={file => void importGeoJSON(file)} />;
}
