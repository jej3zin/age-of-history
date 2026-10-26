export interface Country {
  id: string; name: string; color: number; treasury: number;
  dailyIncome: number; dailyExpense: number; population: number;
  production: number; stability: number; isPlayer: boolean;
}
export interface Territory {
  id: string; name: string; countryId: string; points: [number, number][];
  center: [number, number]; population: number; production: number; terrain: string;
  regionName?: string;
  cities?: { id: string; name: string; population: number }[];
}
export interface GameEvent { id: string; day: number; title: string; description: string; }
export interface GameState {
  schemaVersion: 1; campaignName: string; date: string; day: number;
  selectedCountryId: string; selectedTerritoryId: string;
  countries: Country[]; territories: Territory[]; events: GameEvent[];
  lastSavedAt?: string;
}
