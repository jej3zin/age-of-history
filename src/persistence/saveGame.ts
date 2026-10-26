import type { GameState } from "../game/types";

const DB = "age-of-history-prototype";
const STORE = "campaigns";
const KEY = "autosave";
const EXPORT_FORMAT = "age-of-history-campaign";
const EXPORT_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Este navegador não oferece IndexedDB."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir o banco local."));
    request.onblocked = () => reject(new Error("O banco está ocupado por outra aba. Feche outras abas do jogo e tente novamente."));
  });
}

const validPosition = (value: unknown): boolean =>
  Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);
const validRing = (value: unknown): boolean =>
  Array.isArray(value) && value.length >= 4 && value.every(validPosition);

function normalizeAndValidate(value: unknown): GameState {
  if (!value || typeof value !== "object") throw new Error("O arquivo não contém uma campanha válida.");
  const state = value as Partial<GameState>;
  const validDate = typeof state.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(state.date) &&
    !Number.isNaN(Date.parse(state.date + "T12:00:00Z")) &&
    new Date(state.date + "T12:00:00Z").toISOString().slice(0, 10) === state.date;

  if (
    state.schemaVersion !== 1 || !validDate ||
    !Number.isInteger(state.day) || (state.day ?? -1) < 0 ||
    typeof state.campaignName !== "string" || !state.campaignName.trim() ||
    !Array.isArray(state.countries) || state.countries.length === 0 ||
    !Array.isArray(state.territories) || state.territories.length === 0 ||
    !Array.isArray(state.events) ||
    typeof state.selectedCountryId !== "string" || typeof state.selectedTerritoryId !== "string" ||
    !state.countries.every(country =>
      country && typeof country.id === "string" && country.id.length > 0 &&
      typeof country.name === "string" && country.name.trim().length > 0 &&
      Number.isFinite(country.color) && Number.isFinite(country.treasury) &&
      Number.isFinite(country.dailyIncome) && Number.isFinite(country.dailyExpense) &&
      Number.isFinite(country.population) && country.population >= 0 &&
      Number.isFinite(country.production) && country.production >= 0 &&
      Number.isFinite(country.stability) && country.stability >= 0 && country.stability <= 100 &&
      typeof country.isPlayer === "boolean"
    ) ||
    new Set(state.countries.map(country => country.id)).size !== state.countries.length ||
    !state.territories.every(territory =>
      territory && typeof territory.id === "string" && territory.id.length > 0 &&
      typeof territory.name === "string" && territory.name.trim().length > 0 &&
      typeof territory.countryId === "string" &&
      Number.isFinite(territory.population) && territory.population >= 0 &&
      Number.isFinite(territory.production) && territory.production >= 0 &&
      Array.isArray(territory.points) && validRing(territory.points) &&
      validPosition(territory.center) && typeof territory.terrain === "string" &&
      (territory.polygons === undefined || (Array.isArray(territory.polygons) && territory.polygons.length > 0 && territory.polygons.every(validRing))) &&
      (territory.polygonHoles === undefined ||
        (Array.isArray(territory.polygonHoles) &&
         territory.polygonHoles.length === (territory.polygons?.length ?? 1) &&
         territory.polygonHoles.every(holes => Array.isArray(holes) && holes.every(validRing)))
      ) &&
      (territory.cities === undefined || (Array.isArray(territory.cities) && territory.cities.every(city =>
        city && typeof city.id === "string" && typeof city.name === "string" &&
        Number.isFinite(city.population) && city.population >= 0
      )))
    ) ||
    new Set(state.territories.map(territory => territory.id)).size !== state.territories.length ||
    !state.territories.every(territory => state.countries!.some(country => country.id === territory.countryId)) ||
    !state.territories.some(territory => territory.id === state.selectedTerritoryId && territory.countryId === state.selectedCountryId) ||
    !state.events.every(event => event && typeof event.id === "string" && Number.isInteger(event.day) &&
      event.day >= 0 && typeof event.title === "string" && typeof event.description === "string")
  ) {
    throw new Error("Campanha inválida ou incompatível. Verifique a versão, a data, os países, os territórios e a seleção.");
  }

  const normalized = structuredClone(state) as GameState;
  if (normalized.citizenProfile) {
    const profile = normalized.citizenProfile as Partial<NonNullable<GameState["citizenProfile"]>>;
    normalized.citizenProfile = {
      name: typeof profile.name === "string" ? profile.name : "Cidadão",
      profession: profile.profession === "Estudante" ? "Estudante" : "Trabalha",
      family: typeof profile.family === "string" ? profile.family : "",
      money: Number.isFinite(profile.money) ? profile.money as number : 500,
      dailyIncome: Number.isFinite(profile.dailyIncome) ? profile.dailyIncome as number : (profile.profession === "Trabalha" ? 150 : 0),
      dailyExpense: Number.isFinite(profile.dailyExpense) ? profile.dailyExpense as number : (profile.profession === "Estudante" ? 100 : 0) + (typeof profile.family === "string" && profile.family ? 75 : 0),
    };
  }
  return normalized;
}

export function serializeCampaign(state: GameState): string {
  const portableState = structuredClone(state);
  delete portableState.lastSavedAt;
  return JSON.stringify({
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    state: portableState,
  }, null, 2);
}

export function parseCampaignFile(text: string): GameState {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  if (!document || typeof document !== "object") throw new Error("Formato de arquivo de campanha inválido.");
  const envelope = document as { format?: unknown; formatVersion?: unknown; state?: unknown };
  if (envelope.format !== EXPORT_FORMAT) throw new Error("Este arquivo não é uma exportação de campanha do Age of History.");
  if (envelope.formatVersion !== EXPORT_VERSION) throw new Error("Versão do arquivo não suportada por esta versão do jogo.");
  return normalizeAndValidate(envelope.state);
}

export async function saveGame(state: GameState): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(
        { ...structuredClone(state), lastSavedAt: new Date().toISOString() }, KEY,
      );
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao gravar a campanha."));
      transaction.onabort = () => reject(transaction.error ?? new Error("O salvamento foi cancelado."));
    });
  } finally { db.close(); }
}

export async function loadGame(): Promise<GameState | null> {
  const db = await openDb();
  let value: unknown;
  try {
    value = await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Falha ao ler a campanha salva."));
      transaction.onabort = () => reject(transaction.error ?? new Error("A leitura do salvamento foi cancelada."));
    });
  } finally { db.close(); }
  if (!value || typeof value !== "object") return null;
  return normalizeAndValidate(value);
}
