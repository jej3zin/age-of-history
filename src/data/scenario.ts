import type { Country, GameState, Territory } from "../game/types";

const countries: Country[] = [
  { id: "aurora", name: "República de Aurora", color: 0xd98b45, treasury: 125000, dailyIncome: 8200, dailyExpense: 6900, population: 2450000, production: 5400, stability: 72, isPlayer: true },
  { id: "brumaria", name: "Reino de Brumária", color: 0x5e8fc4, treasury: 98000, dailyIncome: 7100, dailyExpense: 6600, population: 1980000, production: 4300, stability: 66, isPlayer: false },
  { id: "solmar", name: "União de Solmar", color: 0x62a889, treasury: 110000, dailyIncome: 7600, dailyExpense: 7200, population: 2210000, production: 4900, stability: 78, isPlayer: false }
];
const territories: Territory[] = [
  { id: "aurora-norte", name: "Vale do Norte", countryId: "aurora", regionName: "Região Central", cities: [{ id: "aurora-norte-capital", name: "Aurora Alta", population: 320000 }, { id: "aurora-norte-rio", name: "Porto do Rio", population: 145000 }], points: [[80,80],[300,60],[330,190],[230,240],[90,205]], center: [200,150], population: 820000, production: 1900, terrain: "Planícies" },
  { id: "aurora-sul", name: "Costa Dourada", countryId: "aurora", regionName: "Região Costeira", cities: [{ id: "aurora-sul-capital", name: "Porto Dourado", population: 285000 }, { id: "aurora-sul-serra", name: "Serra Clara", population: 110000 }], points: [[90,205],[230,240],[330,190],[350,335],[210,370],[105,320]], center: [220,295], population: 760000, production: 1700, terrain: "Costa e colinas" },
  { id: "brumaria-oeste", name: "Marchas Ocidentais", countryId: "brumaria", regionName: "Províncias da Marcha", cities: [{ id: "brumaria-oeste-capital", name: "Vigília", population: 260000 }, { id: "brumaria-oeste-forte", name: "Forte Cinzento", population: 95000 }], points: [[300,60],[470,70],[510,185],[420,235],[330,190]], center: [410,145], population: 710000, production: 1500, terrain: "Colinas" },
  { id: "brumaria-leste", name: "Terras Nebulosas", countryId: "brumaria", regionName: "Região Nebulosa", cities: [{ id: "brumaria-leste-capital", name: "Névoa Alta", population: 230000 }, { id: "brumaria-leste-lago", name: "Lago Frio", population: 88000 }], points: [[470,70],[650,100],[670,230],[550,270],[510,185]], center: [570,175], population: 650000, production: 1400, terrain: "Florestas" },
  { id: "solmar-norte", name: "Baía do Sol", countryId: "solmar", regionName: "Costa de Solmar", cities: [{ id: "solmar-norte-capital", name: "Baía Clara", population: 310000 }, { id: "solmar-norte-ilha", name: "Ilha Serena", population: 72000 }], points: [[420,235],[510,185],[550,270],[530,360],[400,365],[350,335]], center: [455,300], population: 740000, production: 1600, terrain: "Costa" },
  { id: "solmar-sul", name: "Campos do Sul", countryId: "solmar", regionName: "Planalto Meridional", cities: [{ id: "solmar-sul-capital", name: "Campo Solar", population: 275000 }, { id: "solmar-sul-rural", name: "Santa Colheita", population: 120000 }], points: [[550,270],[670,230],[700,350],[610,405],[530,360]], center: [610,325], population: 730000, production: 1700, terrain: "Campos e planalto" }
];
export function createInitialState(): GameState {
  return {
    schemaVersion: 1, campaignName: "Campanha de demonstração", date: "1836-01-01", day: 0,
    scenarioId: "prototype-world", mode: "history", gameVersion: "0.1.0",
    selectedCountryId: "aurora", selectedTerritoryId: "aurora-norte",
    countries: structuredClone(countries), territories: structuredClone(territories),
    events: [{ id: "start", day: 0, title: "Uma nova campanha", description: "A República de Aurora inicia o ano com instituições estáveis e um orçamento limitado." }]
  };
}
