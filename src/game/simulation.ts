import type { GameState } from "./types";

function addDays(value: string, days: number) {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Ordem determinística do tick: data → economia/população/produção → cadências.
 * Semanal: ajuste de estabilidade; mensal: relatório fiscal; anual: balanço estratégico.
 */
export function advanceOneDay(current: GameState): GameState {
  const next = structuredClone(current);
  next.day += 1;
  next.date = addDays(next.date, 1);

  if (next.citizenProfile) {
    next.citizenProfile.money += next.citizenProfile.dailyIncome - next.citizenProfile.dailyExpense;
  }

  for (const country of next.countries) {
    country.treasury += country.dailyIncome - country.dailyExpense;
    country.population += Math.round(country.population * 0.00001);
    country.production = Math.max(0, Math.round(country.production * (1 + (country.stability - 50) / 5000)));
  }

  if (next.day % 7 === 0) {
    for (const country of next.countries) {
      const balance = country.dailyIncome - country.dailyExpense;
      country.stability = Math.max(0, Math.min(100, country.stability + (balance < 0 ? -1 : balance > 0 ? 1 : 0)));
    }
  }

  if (next.day % 30 === 0) {
    next.events.unshift({ id: "monthly-" + next.day, day: next.day, title: "Relatório mensal", description: "Fechamento de " + next.date + ": tesouros, população e produção foram atualizados." });
  }
  if (next.day % 365 === 0) {
    next.events.unshift({ id: "annual-" + next.day, day: next.day, title: "Balanço anual", description: "Um ano de campanha foi concluído. Revise a estabilidade e a situação econômica dos países." });
  }
  next.events = next.events.slice(0, 12);
  return next;
}

export const formatMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
export const formatNumber = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
export const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T12:00:00Z"));
