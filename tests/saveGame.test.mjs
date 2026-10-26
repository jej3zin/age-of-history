import test from "node:test";
import assert from "node:assert/strict";
import { parseCampaignFile, serializeCampaign } from "../src/persistence/saveGame.ts";

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
