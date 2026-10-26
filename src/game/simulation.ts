import type { GameEvent, GameState, ScheduledGameEvent } from "./types";

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
  if (current.pendingDecision) return current;
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

  const dueEvents = (next.eventQueue ?? []).filter(event => event.dueDay <= next.day)
    .sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const processedIds = new Set<string>();
  for (const scheduled of dueEvents) {
    processedIds.add(scheduled.id);
    const event: GameEvent = { id: scheduled.id, day: next.day, title: scheduled.title, description: scheduled.description };
    if (scheduled.requiresDecision) {
      next.pendingDecision = event;
      break;
    }
    next.events.unshift(event);
  }
  next.eventQueue = (next.eventQueue ?? []).filter(event => !processedIds.has(event.id));

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


/** Adiciona um evento futuro com identidade estável e ordenação determinística. */
export function queueGameEvent(current: GameState, event: ScheduledGameEvent): GameState {
  if (!event.id.trim() || !event.title.trim()) throw new Error("Evento precisa de identificador e título.");
  if (!Number.isInteger(event.dueDay) || event.dueDay < current.day) throw new Error("O dia do evento precisa ser um dia inteiro igual ou posterior ao dia atual.");
  if (!Number.isFinite(event.priority)) throw new Error("A prioridade do evento precisa ser um número finito.");
  if (typeof event.requiresDecision !== "boolean" || typeof event.description !== "string") throw new Error("Dados do evento inválidos.");
  const queue = current.eventQueue ?? [];
  if (queue.some(item => item.id === event.id) || current.events.some(item => item.id === event.id) || current.pendingDecision?.id === event.id) {
    throw new Error("Já existe um evento com este identificador.");
  }
  const next = structuredClone(current);
  next.eventQueue = [...queue, structuredClone(event)].sort((a, b) => a.dueDay - b.dueDay || b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return next;
}

/** Confirma a decisão pendente e registra-a no histórico antes de retomar o tempo. */
export function resolvePendingDecision(current: GameState): GameState {
  if (!current.pendingDecision) return current;
  const next = structuredClone(current);
  const decision = next.pendingDecision;
  if (!decision) return current;
  next.events.unshift(decision);
  next.pendingDecision = undefined;
  next.events = next.events.slice(0, 12);
  return next;
}
