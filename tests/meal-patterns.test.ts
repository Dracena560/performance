import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mealPatternItems, mealPatterns } from '../lib/meal-patterns';
import type { HealthEvent } from '../lib/domain';

const meal = (id: string, timestamp: string, name = 'Café da manhã', grams = 80): HealthEvent => ({
  id, local_date: timestamp.slice(0, 10), timestamp, timezone: 'Europe/London', type: 'meal', source: 'manual', measurement_type: 'measured', estimated: false, notes: '',
  data: { kind: 'meal', name, meal_type: name, hunger: null, satiety: null, items: [{ food_id: null, name: 'Sourdough', grams, nutrition: {} }] }
});

test('meal patterns group matching history and keep variations in their period', () => {
  const first = meal('one', '2026-10-18T07:30:00.000Z');
  const second = meal('two', '2026-10-19T07:45:00.000Z');
  const variation = meal('three', '2026-10-20T07:45:00.000Z', 'Café da manhã', 100);
  const lunch = meal('four', '2026-10-20T12:30:00.000Z', 'Almoço');
  const patterns = mealPatterns([first, second, first, variation, lunch]);
  assert.equal(patterns.length, 3);
  assert.equal(patterns[0].uses, 2);
  assert.equal(patterns[0].period, 'morning');
  assert.equal(mealPatternItems(patterns[0]), 'Sourdough · 80 g');
  assert.equal(patterns.find(pattern => pattern.name === 'Almoço')?.period, 'afternoon');
});
