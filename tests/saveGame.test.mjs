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
