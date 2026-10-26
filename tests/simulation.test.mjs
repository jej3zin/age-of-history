import test from "node:test";
import assert from "node:assert/strict";
import { advanceOneDay } from "../src/game/simulation.ts";

function state(overrides = {}) {
  return {
    schemaVersion: 1,
    campaignName: "Teste",
    date: "1444-01-01",
    day: 0,
    selectedCountryId: "c1",
    selectedTerritoryId: "t1",
    countries: [{
      id: "c1", name: "País", color: 0xffffff, treasury: 100,
      dailyIncome: 10, dailyExpense: 4, population: 100000,
      production: 100, stability: 50, isPlayer: true,
    }],
    territories: [],
    events: [],
    ...overrides,
  };
}

test("advances date and day by exactly one day", () => {
  const next = advanceOneDay(state());
  assert.equal(next.day, 1);
  assert.equal(next.date, "1444-01-02");
});

test("updates treasury, population and production deterministically", () => {
  const initial = state();
  const first = advanceOneDay(initial);
  const second = advanceOneDay(initial);
  assert.deepEqual(first, second);
  assert.equal(first.countries[0].treasury, 106);
  assert.equal(first.countries[0].population, 100001);
  assert.equal(first.countries[0].production, 100);
  assert.equal(initial.day, 0);
  assert.equal(initial.countries[0].treasury, 100);
});

test("adjusts stability on weekly ticks according to fiscal balance", () => {
  const initial = state({ day: 6 });
  const next = advanceOneDay(initial);
  assert.equal(next.day, 7);
  assert.equal(next.countries[0].stability, 51);
});

test("creates a monthly report every 30 days and caps event history", () => {
  const events = Array.from({ length: 12 }, (_, i) => ({ id: String(i), day: i, title: "Evento", description: "Teste" }));
  const next = advanceOneDay(state({ day: 29, events }));
  assert.equal(next.day, 30);
  assert.equal(next.events.length, 12);
  assert.equal(next.events[0].id, "monthly-30");
});

test("creates an annual report every 365 days", () => {
  const next = advanceOneDay(state({ day: 364 }));
  assert.equal(next.day, 365);
  assert.equal(next.events[0].id, "annual-365");
});


test("runs a long campaign deterministically without invalid numeric state", () => {
  const initial = state({
    countries: [
      { id: "c1", name: "País A", color: 0xffffff, treasury: 100, dailyIncome: 10, dailyExpense: 4, population: 100000, production: 100, stability: 50, isPlayer: true },
      { id: "c2", name: "País B", color: 0xaaaaaa, treasury: 80, dailyIncome: 2, dailyExpense: 6, population: 50000, production: 70, stability: 65, isPlayer: false },
    ],
  });
  const runCampaign = (source) => {
    let current = source;
    for (let day = 0; day < 1000; day += 1) current = advanceOneDay(current);
    return current;
  };
  const first = runCampaign(initial);
  const second = runCampaign(initial);
  assert.deepEqual(first, second);
  assert.equal(first.day, 1000);
  assert.equal(first.date, "1446-09-27");
  assert.equal(first.events.length, 12);
  assert.ok(first.countries.every(country => Number.isFinite(country.treasury) && Number.isFinite(country.population) && Number.isFinite(country.production) && country.stability >= 0 && country.stability <= 100));
  assert.equal(initial.day, 0, "simulation must not mutate its initial state");
});
