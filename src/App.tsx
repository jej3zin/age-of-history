import { useCallback, useEffect, useState } from "react";
import { createInitialState } from "./data/scenario";
import { advanceOneDay } from "./game/simulation";
import type { GameState } from "./game/types";
import { loadGame, saveGame, parseCampaignFile, serializeCampaign, listSaveSlots, saveToSlot, loadSaveSlot, renameSaveSlot, deleteSaveSlot, exportRawSaveRecord } from "./persistence/saveGame";
import type { SaveSlot } from "./persistence/saveGame";
import HomePage from "./pages/HomePage";
import GameplayPage from "./pages/GameplayPage";
import CampaignSetupPage from "./pages/CampaignSetupPage";
import { importTerritoriesFromGeoJSON } from "./map/geoJson";

type Page = "home" | "setup" | "gameplay";
type CampaignSetup = { countryId: string; customNation: boolean; customName: string; customColor: string };
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
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);

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
      return {
        ...country,
        name: setup.customNation ? setup.customName : country.name,
        color,
        isPlayer: true,
      };
    });
    const playableCountry = countries.find(country => country.id === setup.countryId) ?? countries[0];
    const firstTerritory = initial.territories.find(territory => territory.countryId === setup.countryId) ?? initial.territories[0];
    const campaignName = `${playableCountry.name} — Nova campanha`;
    const nextState: GameState = {
      ...initial,
      campaignName,
      countries,
      selectedCountryId: setup.countryId,
      selectedTerritoryId: firstTerritory.id,
      events: [{
        id: "start",
        day: 0,
        title: "Uma nova campanha",
        description: `${playableCountry.name} inicia uma nova campanha. Você está no comando desta nação.`,
      }],
    };
    setState(nextState);
    setTimeSpeed(0);
    setNotice("Modo História iniciado. Você controla " + playableCountry.name + ".");
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
  async function importCampaign(file: File) {
    setBusy(true);
    try {
      const imported = parseCampaignFile(await file.text());
      setState(imported);
      setTimeSpeed(0);
      setNotice(`Campanha importada de ${file.name}. A simulação foi pausada.`);
      navigate("gameplay");
    } catch (error) {
      setNotice("Falha ao importar campanha: " + (error instanceof Error ? error.message : "arquivo inválido"));
    } finally { setBusy(false); }
  }

  function exportCampaign() {
    try {
      const blob = new Blob([serializeCampaign(state)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const safeName = state.campaignName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "campanha";
      anchor.download = `${safeName}-age-of-history.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Exportação da campanha preparada em arquivo JSON.");
    } catch (error) {
      setNotice("Não foi possível exportar: " + (error instanceof Error ? error.message : "erro desconhecido"));
    }
  }

  const refreshSaveSlots = useCallback(() => {
    void listSaveSlots().then(setSaveSlots).catch(error => setNotice("Não foi possível listar salvamentos: " + (error instanceof Error ? error.message : "erro desconhecido")));
  }, []);

  async function createSaveSlot(name: string) {
    setBusy(true);
    try { await saveToSlot(state, name); setNotice("Salvamento criado: " + name.trim()); refreshSaveSlots(); }
    catch (error) { setNotice("Não foi possível criar salvamento: " + (error instanceof Error ? error.message : "erro desconhecido")); }
    finally { setBusy(false); }
  }

  async function loadSlot(id: string) {
    setBusy(true);
    try { const saved = await loadSaveSlot(id); setState(saved); setTimeSpeed(0); setNotice("Salvamento carregado em pausa."); navigate("gameplay"); }
    catch (error) { setNotice("Não foi possível carregar: " + (error instanceof Error ? error.message : "erro desconhecido")); }
    finally { setBusy(false); }
  }

  async function renameSlot(id: string, name: string) {
    try { await renameSaveSlot(id, name); setNotice("Salvamento renomeado."); refreshSaveSlots(); }
    catch (error) { setNotice("Não foi possível renomear: " + (error instanceof Error ? error.message : "erro desconhecido")); }
  }

  async function exportRawSave(id: string) {
    try {
      const raw = await exportRawSaveRecord(id);
      const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `salvamento-bruto-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Cópia bruta exportada. O salvamento original continua intacto.");
    } catch (error) {
      setNotice("Não foi possível exportar os dados brutos: " + (error instanceof Error ? error.message : "erro desconhecido"));
    }
  }

  async function deleteSlot(id: string) {
    try { await deleteSaveSlot(id); setNotice("Salvamento excluído."); refreshSaveSlots(); }
    catch (error) { setNotice("Não foi possível excluir: " + (error instanceof Error ? error.message : "erro desconhecido")); }
  }

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
  return <GameplayPage state={state} notice={notice} busy={busy} timeSpeed={timeSpeed} onSetTimeSpeed={setTimeSpeed} onHome={() => navigate("home")} onNewCampaign={newCampaign} onLoad={() => void load()} onSave={() => void save()} onNextDay={nextDay} onSelectTerritory={selectTerritory} onImportGeoJSON={file => void importGeoJSON(file)} onExportCampaign={exportCampaign} onImportCampaign={file => void importCampaign(file)} saveSlots={saveSlots} onRefreshSaveSlots={refreshSaveSlots} onSaveSlot={name => void createSaveSlot(name)} onLoadSlot={id => void loadSlot(id)} onRenameSlot={(id, name) => void renameSlot(id, name)} onDeleteSlot={id => void deleteSlot(id)} onExportRawSave={id => void exportRawSave(id)} />;
}
