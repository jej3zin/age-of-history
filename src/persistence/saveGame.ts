import type { GameState } from "../game/types";

const DB = "age-of-history-prototype";
const STORE = "campaigns";
const AUTO_KEY = "autosave";
const DB_VERSION = 2;
const EXPORT_FORMAT = "age-of-history-campaign";
const EXPORT_VERSION = 1;

export type SaveSlot = {
  id: string;
  name: string;
  campaignName: string;
  date: string;
  day: number;
  savedAt: string;
  isAuto: boolean;
};

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Este navegador não oferece IndexedDB."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, DB_VERSION);
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
         territory.polygonHoles.every(holes => Array.isArray(holes) && holes.every(validRing)))) &&
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
  ) throw new Error("Campanha inválida ou incompatível. Verifique a versão, a data, os países, os territórios e a seleção.");

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

function slotKey(id: string): string {
  if (id === AUTO_KEY) return AUTO_KEY;
  if (!/^save-[a-z0-9-]{1,80}$/.test(id)) throw new Error("Identificador de salvamento inválido.");
  return id;
}

function readRequest<T>(db: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao acessar os salvamentos."));
    transaction.onabort = () => reject(transaction.error ?? new Error("A operação de salvamento foi cancelada."));
  });
}

async function writeRecord(id: string, state: GameState, name: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put({
        ...structuredClone(state),
        saveMeta: { id, name: name.trim(), savedAt: new Date().toISOString(), campaignName: state.campaignName },
      }, slotKey(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao gravar a campanha."));
      transaction.onabort = () => reject(transaction.error ?? new Error("O salvamento foi cancelado."));
    });
  } finally { db.close(); }
}

export async function saveGame(state: GameState): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(
        { ...structuredClone(state), lastSavedAt: new Date().toISOString() }, AUTO_KEY,
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
  try { value = await readRequest(db, "readonly", store => store.get(AUTO_KEY)); }
  finally { db.close(); }
  if (!value || typeof value !== "object") return null;
  return normalizeAndValidate(value);
}

export async function listSaveSlots(): Promise<SaveSlot[]> {
  const db = await openDb();
  let records: unknown[];
  try { records = await readRequest(db, "readonly", store => store.getAll()) as unknown[]; }
  finally { db.close(); }
  const slots: SaveSlot[] = [];
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const item = record as Record<string, unknown>;
    const meta = item.saveMeta as Record<string, unknown> | undefined;
    if (meta && typeof meta.id === "string" && typeof meta.name === "string" && typeof meta.savedAt === "string" &&
        typeof item.campaignName === "string" && typeof item.date === "string" && Number.isInteger(item.day)) {
      slots.push({
        id: meta.id, name: meta.name, campaignName: item.campaignName,
        date: item.date, day: item.day as number, savedAt: meta.savedAt, isAuto: false,
      });
    } else if (item.campaignName && item.date && Number.isInteger(item.day) &&
        (typeof item.lastSavedAt === "string" || item === records[0])) {
      slots.push({
        id: AUTO_KEY, name: "Salvamento automático", campaignName: String(item.campaignName),
        date: String(item.date), day: item.day as number,
        savedAt: typeof item.lastSavedAt === "string" ? item.lastSavedAt : "Data não registrada", isAuto: true,
      });
    }
  }
  return slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveToSlot(state: GameState, name: string): Promise<SaveSlot> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Informe um nome para o salvamento.");
  if (cleanName.length > 60) throw new Error("O nome do salvamento deve ter no máximo 60 caracteres.");
  const id = "save-" + (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10));
  await writeRecord(id, state, cleanName);
  return {
    id, name: cleanName, campaignName: state.campaignName, date: state.date,
    day: state.day, savedAt: new Date().toISOString(), isAuto: false,
  };
}

export async function loadSaveSlot(id: string): Promise<GameState> {
  const db = await openDb();
  let value: unknown;
  try { value = await readRequest(db, "readonly", store => store.get(slotKey(id))); }
  finally { db.close(); }
  return normalizeAndValidate(value);
}

export async function renameSaveSlot(id: string, name: string): Promise<void> {
  if (id === AUTO_KEY) throw new Error("O salvamento automático não pode ser renomeado.");
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 60) throw new Error("O nome deve ter entre 1 e 60 caracteres.");
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const request = store.get(slotKey(id));
      request.onsuccess = () => {
        if (!request.result || typeof request.result !== "object") { transaction.abort(); reject(new Error("Salvamento não encontrado.")); return; }
        const record = request.result as Record<string, unknown>;
        const meta = record.saveMeta as Record<string, unknown> | undefined;
        if (!meta) { transaction.abort(); reject(new Error("Este salvamento não pode ser renomeado.")); return; }
        store.put({ ...record, saveMeta: { ...meta, name: cleanName } }, id);
      };
      request.onerror = () => reject(request.error ?? new Error("Falha ao localizar o salvamento."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao renomear salvamento."));
    });
  } finally { db.close(); }
}

export async function deleteSaveSlot(id: string): Promise<void> {
  if (id === AUTO_KEY) throw new Error("O salvamento automático não pode ser excluído.");
  const db = await openDb();
  try { await readRequest(db, "readwrite", store => store.delete(slotKey(id))); }
  finally { db.close(); }
}

export function serializeCampaign(state: GameState): string {
  const portableState = structuredClone(state);
  delete portableState.lastSavedAt;
  delete (portableState as GameState & { saveMeta?: unknown }).saveMeta;
  return JSON.stringify({ format: EXPORT_FORMAT, formatVersion: EXPORT_VERSION, exportedAt: new Date().toISOString(), state: portableState }, null, 2);
}

export function parseCampaignFile(text: string): GameState {
  let document: unknown;
  try { document = JSON.parse(text); } catch { throw new Error("O arquivo não é um JSON válido."); }
  if (!document || typeof document !== "object") throw new Error("Formato de arquivo de campanha inválido.");
  const envelope = document as { format?: unknown; formatVersion?: unknown; state?: unknown };
  if (envelope.format !== EXPORT_FORMAT) throw new Error("Este arquivo não é uma exportação de campanha do Age of History.");
  if (envelope.formatVersion !== EXPORT_VERSION) throw new Error("Versão do arquivo não suportada por esta versão do jogo.");
  return normalizeAndValidate(envelope.state);
}
