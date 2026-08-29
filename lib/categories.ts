import { Category } from './types';

/** Meal categories inferred from time of day (local time). */
const MEAL_SLOTS = [
  { untilHour: 11, keywords: ['breakfast', 'morning', 'brunch', 'bfast'] },
  { untilHour: 16, keywords: ['lunch', 'noon', 'midday', 'afternoon'] },
  { untilHour: 24, keywords: ['dinner', 'diner', 'supper', 'evening', 'night'] },
] as const;

function matchesCategory(c: Category, keywords: readonly string[]): boolean {
  const id = c.id.toLowerCase().trim();
  const name = c.name.toLowerCase().trim();
  // Exact match first
  if (keywords.some((k) => id === k || name === k)) {
    return true;
  }
  // Substring match
  return keywords.some((k) => id.includes(k) || name.includes(k));
}

/** Picks breakfast before 11am (morning), lunch 11am–4pm (noon), dinner after 4pm (>= 16:00). */
export function categoryIdForTime(date: Date, categories: Category[]): string {
  if (categories.length === 0) return '';
  const hour = date.getHours();
  const slot =
    hour < 11 ? MEAL_SLOTS[0] : hour < 16 ? MEAL_SLOTS[1] : MEAL_SLOTS[2];
  const match = categories.find((c) => matchesCategory(c, slot.keywords));
  return match?.id ?? categories[0].id;
}

