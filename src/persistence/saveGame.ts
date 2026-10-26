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
  scenarioId: string;
  mode: string;
  gameVersion: string;
  difficulty: string;
  aiProfile: string;
  date: string;
  day: number;
  savedAt: string;
  isAuto: boolean;
  isCorrupt?: boolean;
  recoveryMessage?: string;
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

export function migrateStoredRecord(value: unknown): GameState {
  if (!value || typeof value !== "object") throw new Error("O salvamento não contém uma campanha válida.");
  const record = value as Record<string, unknown>;
  // Registros antigos guardavam o estado diretamente; os metadados locais não fazem parte do estado do jogo.
  const stateValue = record.state && record.storageFormat === "age-of-history-save" ? record.state : value;
  const state = stateValue as Partial<GameState>;
  const storageVersion = record.storageVersion;
  if (storageVersion !== undefined && storageVersion !== 1) {
    throw new Error("Versão do registro local não suportada. O salvamento original foi preservado.");
  }
  if (state.schemaVersion !== 1) {
    throw new Error("Este salvamento usa uma versão de esquema não suportada. O registro original foi preservado.");
  }
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
    !state.events.every(event => event && typeof event.id === "string" && event.id.trim().length > 0 &&
      Number.isInteger(event.day) && event.day >= 0 &&
      typeof event.title === "string" && typeof event.description === "string") ||
    new Set(state.events.map(event => event.id)).size !== state.events.length
  ) throw new Error("Campanha inválida ou incompatível. Verifique a versão, a data, os países, os territórios, os eventos e a seleção.");

  if (state.eventQueue !== undefined && (!Array.isArray(state.eventQueue) || !state.eventQueue.every(event =>
    event && typeof event.id === "string" && event.id.trim() && Number.isInteger(event.dueDay) && event.dueDay >= 0 &&
    Number.isFinite(event.priority) && typeof event.title === "string" && event.title.trim() &&
    typeof event.description === "string" && typeof event.requiresDecision === "boolean"
  ) || new Set(state.eventQueue.map(event => event.id)).size !== state.eventQueue.length)) throw new Error("Fila de eventos inválida no salvamento.");
  if (state.pendingDecision !== undefined && (!state.pendingDecision || typeof state.pendingDecision.id !== "string" || !state.pendingDecision.id.trim() ||
    !Number.isInteger(state.pendingDecision.day) || state.pendingDecision.day < 0 || typeof state.pendingDecision.title !== "string" || !state.pendingDecision.title.trim() || typeof state.pendingDecision.description !== "string")) {
    throw new Error("Decisão pendente inválida no salvamento.");
  }
  if (state.pendingDecision && ((state.eventQueue ?? []).some(event => event.id === state.pendingDecision!.id) || (state.events ?? []).some(event => event.id === state.pendingDecision!.id))) {
    throw new Error("A decisão pendente precisa ter um identificador único na campanha.");
  }
  if ((state.eventQueue ?? []).some(event => (state.events ?? []).some(existing => existing.id === event.id))) {
    throw new Error("A fila contém um evento que já está no histórico da campanha.");
  }
  const normalized = structuredClone(state) as GameState & { storageVersion?: unknown; saveMeta?: unknown };
  // Metadados de armazenamento pertencem ao registro IndexedDB, nunca ao estado da campanha.
  delete normalized.storageVersion;
  delete normalized.saveMeta;
  normalized.scenarioId = typeof normalized.scenarioId === "string" && normalized.scenarioId.trim() ? normalized.scenarioId : "legacy-unknown";
  normalized.mode = normalized.mode ?? "history";
  normalized.gameVersion = typeof normalized.gameVersion === "string" && normalized.gameVersion.trim() ? normalized.gameVersion : "unknown";
  normalized.difficulty = ["very-easy", "easy", "normal", "hard", "very-hard"].includes(normalized.difficulty ?? "") ? normalized.difficulty : "normal";
  normalized.aiProfile = typeof normalized.aiProfile === "string" && normalized.aiProfile.trim() ? normalized.aiProfile : "default";
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
    let result: T | undefined;
    let requestFailed = false;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => {
      requestFailed = true;
      reject(request.error ?? new Error("Falha ao acessar os salvamentos."));
    };
    transaction.oncomplete = () => {
      if (!requestFailed) resolve(result as T);
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Falha na transação de salvamento."));
    transaction.onabort = () => reject(transaction.error ?? new Error("A operação de salvamento foi cancelada."));
  });
}

async function writeRecord(id: string, state: GameState, name: string): Promise<void> {
  // Nunca persistir um estado que não passaria pela mesma validação usada ao carregar.
  const safeState = migrateStoredRecord(state);
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put({
        ...structuredClone(safeState),
        storageVersion: 1,
        saveMeta: { id, name: name.trim(), savedAt: new Date().toISOString(), campaignName: safeState.campaignName, scenarioId: safeState.scenarioId, mode: safeState.mode, gameVersion: safeState.gameVersion, difficulty: safeState.difficulty, aiProfile: safeState.aiProfile },
      }, slotKey(id));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao gravar a campanha."));
      transaction.onabort = () => reject(transaction.error ?? new Error("O salvamento foi cancelado."));
    });
  } finally { db.close(); }
}

export async function saveGame(state: GameState): Promise<void> {
  // A validação acontece antes da transação: um estado inválido não substitui o autosave anterior.
  const safeState = migrateStoredRecord(state);
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(
        { ...structuredClone(safeState), storageVersion: 1, lastSavedAt: new Date().toISOString() }, AUTO_KEY,
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
  return migrateStoredRecord(value);
}

export async function listSaveSlots(): Promise<SaveSlot[]> {
  const db = await openDb();
  let keys: IDBValidKey[];
  let records: unknown[];
  try {
    const transaction = db.transaction(STORE, "readonly");
    const store = transaction.objectStore(STORE);
    [keys, records] = await new Promise<[IDBValidKey[], unknown[]]>((resolve, reject) => {
      const keysRequest = store.getAllKeys();
      const recordsRequest = store.getAll();
      let resultKeys: IDBValidKey[] | undefined;
      let resultRecords: unknown[] | undefined;
      let transactionComplete = false;
      let failed = false;
      const finish = () => {
        if (!failed && transactionComplete && resultKeys !== undefined && resultRecords !== undefined) {
          // Ambos os resultados pertencem a uma transação concluída com sucesso.
          resolve([resultKeys, resultRecords]);
        }
      };
      keysRequest.onsuccess = () => { resultKeys = keysRequest.result; finish(); };
      recordsRequest.onsuccess = () => { resultRecords = recordsRequest.result; finish(); };
      keysRequest.onerror = () => { failed = true; reject(keysRequest.error ?? new Error("Falha ao listar chaves de salvamento.")); };
      recordsRequest.onerror = () => { failed = true; reject(recordsRequest.error ?? new Error("Falha ao listar salvamentos.")); };
      transaction.oncomplete = () => { transactionComplete = true; finish(); };
      transaction.onerror = () => reject(transaction.error ?? new Error("Falha na transação ao listar salvamentos."));
      transaction.onabort = () => reject(transaction.error ?? new Error("A listagem de salvamentos foi cancelada."));
    });
  } finally { db.close(); }
  const slots: SaveSlot[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const key = String(keys[index] ?? "");
    if (!record || typeof record !== "object") continue;
    const item = record as Record<string, unknown>;
    const meta = item.saveMeta as Record<string, unknown> | undefined;
    const isAuto = key === AUTO_KEY;
    const id = isAuto ? AUTO_KEY : key;
    const hasBasicMetadata = typeof item.campaignName === "string" && typeof item.date === "string" && Number.isInteger(item.day);
    let isCorrupt = false;
    let recoveryMessage: string | undefined;
    try { migrateStoredRecord(record); }
    catch (error) {
      isCorrupt = true;
      recoveryMessage = error instanceof Error ? error.message : "Não foi possível validar este registro.";
    }
    // Mantém registros danificados visíveis para que o jogador saiba que existem; nunca os apaga nem os regrava automaticamente.
    slots.push({
      id,
      name: isAuto ? "Salvamento automático" : (typeof meta?.name === "string" ? meta.name : (hasBasicMetadata ? String(item.campaignName) : "Salvamento não identificado")),
      campaignName: hasBasicMetadata ? String(item.campaignName) : "Dados não identificados",
      scenarioId: typeof meta?.scenarioId === "string" ? meta.scenarioId : (typeof item.scenarioId === "string" ? item.scenarioId : "legacy-unknown"),
      mode: typeof meta?.mode === "string" ? meta.mode : (typeof item.mode === "string" ? item.mode : "history"),
      gameVersion: typeof meta?.gameVersion === "string" ? meta.gameVersion : (typeof item.gameVersion === "string" ? item.gameVersion : "unknown"),
      difficulty: typeof meta?.difficulty === "string" ? meta.difficulty : (typeof item.difficulty === "string" ? item.difficulty : "normal"),
      aiProfile: typeof meta?.aiProfile === "string" ? meta.aiProfile : (typeof item.aiProfile === "string" ? item.aiProfile : "default"),
      date: hasBasicMetadata ? String(item.date) : "—",
      day: hasBasicMetadata ? item.day as number : 0,
      savedAt: isAuto && typeof item.lastSavedAt === "string" ? item.lastSavedAt :
        (typeof meta?.savedAt === "string" ? meta.savedAt : "Data não registrada"),
      isAuto,
      isCorrupt,
      recoveryMessage,
    });
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
    id, name: cleanName, campaignName: state.campaignName,
    scenarioId: state.scenarioId ?? "legacy-unknown", mode: state.mode ?? "history", gameVersion: state.gameVersion ?? "unknown", difficulty: state.difficulty ?? "normal", aiProfile: state.aiProfile ?? "default", date: state.date,
    day: state.day, savedAt: new Date().toISOString(), isAuto: false,
  };
}

export async function loadSaveSlot(id: string): Promise<GameState> {
  const db = await openDb();
  let value: unknown;
  try { value = await readRequest(db, "readonly", store => store.get(slotKey(id))); }
  finally { db.close(); }
  return migrateStoredRecord(value);
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

export async function exportRawSaveRecord(id: string): Promise<string> {
  const db = await openDb();
  let value: unknown;
  try { value = await readRequest(db, "readonly", store => store.get(slotKey(id))); }
  finally { db.close(); }
  if (value === undefined) throw new Error("Salvamento não encontrado.");
  try {
    return JSON.stringify({
      format: "age-of-history-raw-save-recovery",
      exportedAt: new Date().toISOString(),
      recordId: id,
      warning: "Registro bruto para diagnóstico/recuperação. Não é uma campanha importável diretamente.",
      record: value,
    }, null, 2);
  } catch {
    throw new Error("Não foi possível serializar o registro bruto para exportação.");
  }
}

/**
 * Valida um envelope exportado para recuperação e extrai uma campanha jogável.
 * O registro original nunca é escrito de volta no IndexedDB por esta função.
 */
export function parseRawSaveRecoveryFile(text: string): GameState {
  let document: unknown;
  try { document = JSON.parse(text); }
  catch { throw new Error("O arquivo de recuperação não é um JSON válido."); }
  if (!document || typeof document !== "object") {
    throw new Error("Formato de recuperação inválido.");
  }
  const envelope = document as { format?: unknown; record?: unknown };
  if (envelope.format !== "age-of-history-raw-save-recovery") {
    throw new Error("Este arquivo não é uma exportação bruta de salvamento do Age of History.");
  }
  if (!envelope.record || typeof envelope.record !== "object") {
    throw new Error("O arquivo de recuperação não contém um registro de salvamento.");
  }
  // A validação acontece antes de descartar os metadados do armazenamento local.
  const recovered = migrateStoredRecord(envelope.record);
  delete (recovered as GameState & { storageVersion?: unknown }).storageVersion;
  delete (recovered as GameState & { saveMeta?: unknown }).saveMeta;
  return recovered;
}

export async function deleteSaveSlot(id: string): Promise<void> {
  if (id === AUTO_KEY) throw new Error("O salvamento automático não pode ser excluído.");
  const db = await openDb();
  try { await readRequest(db, "readwrite", store => store.delete(slotKey(id))); }
  finally { db.close(); }
}

export function serializeCampaign(state: GameState): string {
  // Validate before producing a portable artifact; invalid in-memory state must not become a recovery file.
  const portableState = migrateStoredRecord(state) as GameState & {
    lastSavedAt?: unknown;
    storageVersion?: unknown;
    saveMeta?: unknown;
  };
  delete portableState.lastSavedAt;
  delete portableState.storageVersion;
  delete portableState.saveMeta;
  return JSON.stringify({ format: EXPORT_FORMAT, formatVersion: EXPORT_VERSION, exportedAt: new Date().toISOString(), state: portableState }, null, 2);
}

export function parseCampaignFile(text: string): GameState {
  let document: unknown;
  try { document = JSON.parse(text); } catch { throw new Error("O arquivo não é um JSON válido."); }
  if (!document || typeof document !== "object") throw new Error("Formato de arquivo de campanha inválido.");
  const envelope = document as { format?: unknown; formatVersion?: unknown; state?: unknown };
  if (envelope.format !== EXPORT_FORMAT) throw new Error("Este arquivo não é uma exportação de campanha do Age of History.");
  if (envelope.formatVersion !== EXPORT_VERSION) throw new Error("Versão do arquivo não suportada por esta versão do jogo.");
  return migrateStoredRecord(envelope.state);
}
