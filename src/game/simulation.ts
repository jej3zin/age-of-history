import type { GameState } from "./types";
function addDays(value: string, days: number) {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function advanceOneDay(current: GameState): GameState {
  const next = structuredClone(current);
  next.day += 1;
  next.date = addDays(next.date, 1);
  for (const country of next.countries) {
    country.treasury += country.dailyIncome - country.dailyExpense;
    country.population += Math.round(country.population * 0.00001);
    country.production = Math.max(0, Math.round(country.production * (1 + (country.stability - 50) / 5000)));
  }
  if (next.day % 30 === 0) {
    next.events.unshift({ id: "monthly-" + next.day, day: next.day, title: "Relatório mensal", description: "O mês terminou em " + next.date + ". Consulte o orçamento e a produção dos países." });
    next.events = next.events.slice(0, 12);
  }
  return next;
}
export const formatMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
export const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
export const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T12:00:00Z"));
