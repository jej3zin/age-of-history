import test from "node:test";
import assert from "node:assert/strict";
import { migrateStoredRecord, parseCampaignFile, parseRawSaveRecoveryFile, serializeCampaign } from "../src/persistence/saveGame.ts";

function campaign(overrides = {}) {
  return {
    schemaVersion: 1,
    campaignName: "Campanha teste",
    date: "1444-01-01",
    day: 0,
    selectedCountryId: "c1",
    selectedTerritoryId: "t1",
    countries: [{
      id: "c1", name: "Aurora", color: 0xffffff, treasury: 100,
      dailyIncome: 10, dailyExpense: 4, population: 100000,
      production: 100, stability: 50, isPlayer: true,
    }],
    territories: [{
      id: "t1", name: "Capital", countryId: "c1",
      points: [[0, 0], [10, 0], [10, 10], [0, 10]],
      center: [5, 5], population: 1000, production: 10, terrain: "planície",
      polygons: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
      polygonHoles: [[]],
    }],
    events: [{ id: "start", day: 0, title: "Início", description: "Começo da campanha." }],
    ...overrides,
  };
}

test("exporta e importa campanha mantendo os dados e removendo metadados locais", () => {
  const source = campaign({ lastSavedAt: "2026-01-01T00:00:00.000Z" });
  const exported = serializeCampaign(source);
  const imported = parseCampaignFile(exported);
  assert.equal(imported.campaignName, source.campaignName);
  assert.deepEqual(imported.countries, source.countries);
  assert.deepEqual(imported.territories, source.territories);
  assert.equal(imported.lastSavedAt, undefined);
  assert.equal(JSON.parse(exported).format, "age-of-history-campaign");
});

test("rejeita JSON malformado", () => {
  assert.throws(() => parseCampaignFile("{nope"), /JSON válido/);
});

test("rejeita formato e versão de exportação incompatíveis", () => {
  assert.throws(() => parseCampaignFile(JSON.stringify({ format: "outro", formatVersion: 1, state: campaign() })), /não é uma exportação/);
  assert.throws(() => parseCampaignFile(JSON.stringify({ format: "age-of-history-campaign", formatVersion: 99, state: campaign() })), /não suportada/);
});

test("rejeita referências territoriais e seleção inválidas", () => {
  const missingCountry = campaign({ territories: [{ ...campaign().territories[0], countryId: "ausente" }] });
  assert.throws(() => parseCampaignFile(JSON.stringify({ format: "age-of-history-campaign", formatVersion: 1, state: missingCountry })), /Campanha inválida/);
  const badSelection = campaign({ selectedCountryId: "ausente" });
  assert.throws(() => parseCampaignFile(JSON.stringify({ format: "age-of-history-campaign", formatVersion: 1, state: badSelection })), /Campanha inválida/);
});

test("rejeita buracos geométricos malformados", () => {
  const invalid = campaign({ territories: [{ ...campaign().territories[0], polygonHoles: [[[[1, 1], [2, 2]]]] }] });
  assert.throws(() => parseCampaignFile(JSON.stringify({ format: "age-of-history-campaign", formatVersion: 1, state: invalid })), /Campanha inválida/);
});


test("migra registros antigos com metadados padrão sem perder a campanha", () => {
  const legacy = campaign({ lastSavedAt: "2026-01-01T00:00:00.000Z" });
  const migrated = migrateStoredRecord(legacy);
  assert.equal(migrated.campaignName, legacy.campaignName);
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.mode, "history");
  assert.equal(migrated.scenarioId, "legacy-unknown");
  assert.equal(migrated.gameVersion, "unknown");
});

test("rejeita versão de esquema não suportada sem modificar o registro recebido", () => {
  const legacy = campaign({ schemaVersion: 99 });
  const before = structuredClone(legacy);
  assert.throws(() => migrateStoredRecord(legacy), /registro original foi preservado/);
  assert.deepEqual(legacy, before);
});


test("rejeita versão local desconhecida sem alterar o registro original", () => {
  const legacy = campaign({ storageVersion: 42 });
  const before = structuredClone(legacy);
  assert.throws(() => migrateStoredRecord(legacy), /Versão do registro local não suportada/);
  assert.deepEqual(legacy, before);
});

test("recupera campanha válida de exportação bruta sem alterar o envelope original", () => {
  const rawRecord = { ...campaign(), storageVersion: 1, saveMeta: { id: "save-test", name: "Teste" } };
  const envelope = {
    format: "age-of-history-raw-save-recovery",
    exportedAt: "2026-01-01T00:00:00.000Z",
    recordId: "save-test",
    warning: "raw",
    record: rawRecord,
  };
  const before = structuredClone(envelope);
  const recovered = parseRawSaveRecoveryFile(JSON.stringify(envelope));
  assert.equal(recovered.campaignName, "Campanha teste");
  assert.equal(recovered.schemaVersion, 1);
  assert.equal(recovered.saveMeta, undefined);
  assert.deepEqual(envelope, before);
});

test("rejeita envelope de recuperação inválido ou campanha bruta corrompida", () => {
  assert.throws(() => parseRawSaveRecoveryFile("{bad json"), /JSON válido/);
  assert.throws(() => parseRawSaveRecoveryFile(JSON.stringify({ format: "outro", record: campaign() })), /não é uma exportação bruta/);
  assert.throws(() => parseRawSaveRecoveryFile(JSON.stringify({
    format: "age-of-history-raw-save-recovery",
    record: { ...campaign(), schemaVersion: 77, storageVersion: 1 },
  })), /esquema não suportada/);
});


test("preserva metadados de cenário, modo, versão, dificuldade e perfil de IA no ciclo de exportação", () => {
  const source = campaign({
    scenarioId: "modern-day", mode: "history", gameVersion: "0.1.0",
    difficulty: "hard", aiProfile: "advanced",
    eventQueue: [{ id: "decision-next", dueDay: 5, priority: 10, title: "Decisão", description: "Escolher.", requiresDecision: true }],
    pendingDecision: { id: "decision-now", day: 4, title: "Decisão pendente", description: "Resolver antes de avançar." },
  });
  const imported = parseCampaignFile(serializeCampaign(source));
  assert.equal(imported.scenarioId, "modern-day");
  assert.equal(imported.mode, "history");
  assert.equal(imported.gameVersion, "0.1.0");
  assert.equal(imported.difficulty, "hard");
  assert.equal(imported.aiProfile, "advanced");
  assert.deepEqual(imported.eventQueue, source.eventQueue);
  assert.deepEqual(imported.pendingDecision, source.pendingDecision);
});


test("rejects malformed event queues and pending decisions during import", () => {
  const badQueue = campaign({ eventQueue: [{ id: "x", dueDay: -1, priority: 0, title: "Inválido", description: "", requiresDecision: false }] });
  assert.throws(() => parseCampaignFile(JSON.stringify({ format: "age-of-history-campaign", formatVersion: 1, state: badQueue })), /Fila de eventos inválida/);
  const badDecision = campaign({ pendingDecision: { id: "x", day: -1, title: "Inválida", description: "" } });
  assert.throws(() => parseCampaignFile(JSON.stringify({ format: "age-of-history-campaign", formatVersion: 1, state: badDecision })), /Decisão pendente inválida/);
});


test("remove metadados locais ao normalizar registros do IndexedDB", () => {
  const state = campaign({ scenarioId: "modern-day", mode: "history" });
  const stored = {
    ...state,
    storageVersion: 1,
    saveMeta: { id: "save-test", name: "Backup", savedAt: "2026-10-26T10:00:00.000Z" },
  };
  const loaded = migrateStoredRecord(stored);
  assert.equal(loaded.scenarioId, "modern-day");
  assert.equal("storageVersion" in loaded, false);
  assert.equal("saveMeta" in loaded, false);
  assert.equal("storageVersion" in stored, true, "normalization must not mutate the stored source");
  assert.equal("saveMeta" in stored, true);
});

test("rejects duplicate IDs across event history, queue and pending decision", () => {
  const duplicateQueue = campaign({
    events: [{ id: "same", day: 0, title: "Existente", description: "" }],
    eventQueue: [{ id: "same", dueDay: 1, priority: 0, title: "Duplicado", description: "", requiresDecision: false }],
  });
  assert.throws(() => migrateStoredRecord(duplicateQueue), /já está no histórico/);
  const duplicateDecision = campaign({
    eventQueue: [{ id: "same", dueDay: 1, priority: 0, title: "Na fila", description: "", requiresDecision: false }],
    pendingDecision: { id: "same", day: 0, title: "Pendente", description: "" },
  });
  assert.throws(() => migrateStoredRecord(duplicateDecision), /identificador único/);
});


test("campaign export validates state and excludes local persistence metadata", () => {
  const source = {
    ...campaign({ scenarioId: "modern-day" }),
    lastSavedAt: "2026-10-26T10:00:00.000Z",
    storageVersion: 1,
    saveMeta: { id: "local-only" },
  };
  const parsed = JSON.parse(serializeCampaign(source));
  assert.equal(parsed.state.scenarioId, "modern-day");
  assert.equal("lastSavedAt" in parsed.state, false);
  assert.equal("storageVersion" in parsed.state, false);
  assert.equal("saveMeta" in parsed.state, false);
  assert.equal("storageVersion" in source, true, "export must not mutate source");
  assert.equal("saveMeta" in source, true);
  assert.throws(() => serializeCampaign(campaign({ day: -1 })), /salvamento|campanha válida|campanha inválida/i);
});


test("rejects empty and duplicate IDs inside event history", () => {
  const emptyId = campaign({
    events: [{ id: "  ", day: 0, title: "Inválido", description: "" }],
  });
  assert.throws(() => migrateStoredRecord(emptyId), /Campanha inválida/);

  const duplicateIds = campaign({
    events: [
      { id: "same", day: 0, title: "Primeiro", description: "" },
      { id: "same", day: 1, title: "Segundo", description: "" },
    ],
  });
  assert.throws(() => migrateStoredRecord(duplicateIds), /Campanha inválida/);
});
