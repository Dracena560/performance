import type { HealthEvent } from './domain';

export type MealPeriod = 'morning' | 'afternoon' | 'night';
export type MealPattern = {
  id: string;
  name: string;
  mealType: string;
  period: MealPeriod;
  items: Extract<HealthEvent['data'], { kind: 'meal' }>['items'];
  estimated: boolean;
  uses: number;
  lastUsed: string;
};

function periodFor(timestamp: string): MealPeriod {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date(timestamp)));
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

function patternId(name: string, mealType: string, period: MealPeriod, items: MealPattern['items']) {
  return [period, mealType.trim().toLocaleLowerCase('pt-BR'), name.trim().toLocaleLowerCase('pt-BR'), ...items.map(item => `${item.name.trim().toLocaleLowerCase('pt-BR')}|${Math.round(item.grams * 10) / 10}`)].join('::');
}

// Meals sent by GPT/MCP may omit food_id; the event schema requires it as nullable.
function normalizeItems(items: MealPattern['items']): MealPattern['items'] {
  return items.map(item => ({ ...item, food_id: item.food_id ?? null, nutrition: item.nutrition ?? {} }));
}

/** Groups exact meal combinations from the event history; it never invents ingredients. */
export function mealPatterns(events: HealthEvent[]): MealPattern[] {
  const unique = [...new Map(events.map(event => [event.id, event])).values()];
  const grouped = new Map<string, MealPattern>();
  for (const event of unique) {
    if (event.type !== 'meal' || event.data.kind !== 'meal' || event.data.items.length === 0) continue;
    const period = periodFor(event.timestamp);
    const name = event.data.name.trim() || event.data.meal_type.trim() || 'Refeição';
    const id = patternId(name, event.data.meal_type, period, event.data.items);
    const current = grouped.get(id);
    if (current) {
      current.uses += 1;
      if (event.timestamp > current.lastUsed) current.lastUsed = event.timestamp;
    } else grouped.set(id, { id, name, mealType: event.data.meal_type, period, items: normalizeItems(event.data.items), estimated: event.estimated, uses: 1, lastUsed: event.timestamp });
  }
  return [...grouped.values()].sort((a, b) => b.uses - a.uses || b.lastUsed.localeCompare(a.lastUsed) || a.name.localeCompare(b.name, 'pt-BR'));
}

export function mealPatternItems(pattern: MealPattern) {
  return pattern.items.map(item => `${item.name} · ${Number.isInteger(item.grams) ? item.grams : item.grams.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} g`).join(', ');
}
