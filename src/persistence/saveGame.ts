import type { GameState } from "../game/types";
const DB = "age-of-history-prototype";
const STORE = "campaigns";
const KEY = "autosave";
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const req = indexedDB.open(DB,1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveGame(state: GameState): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve,reject) => {
    const tx = db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put({...structuredClone(state),lastSavedAt:new Date().toISOString()},KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function loadGame(): Promise<GameState|null> {
  const db = await openDb();
  const value = await new Promise<unknown>((resolve,reject) => {
    const req = db.transaction(STORE,"readonly").objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  db.close();
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<GameState>;
  if (state.schemaVersion !== 1 || typeof state.date !== "string" || !Array.isArray(state.countries) || !Array.isArray(state.territories) || !Array.isArray(state.events)) throw new Error("Salvamento inválido ou incompatível.");
  return state as GameState;
}
