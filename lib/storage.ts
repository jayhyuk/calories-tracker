import { Category, CURRENT_SCHEMA_VERSION, Entry, ExportedData, Goals, TrackerData } from './types';

const CATEGORIES_KEY = 'calorie-tracker:categories';
const ENTRIES_KEY = 'calorie-tracker:entries';
const GOALS_KEY = 'calorie-tracker:goals';

const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 150,
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'breakfast', name: 'Breakfast', color: '#f59e0b' },
  { id: 'lunch', name: 'Lunch', color: '#1fb567' },
  { id: 'dinner', name: 'Dinner', color: '#3b82f6' },
  { id: 'snack', name: 'Snack', color: '#a855f7' },
  { id: 'drink', name: 'Drink', color: '#06b6d4' },
];

function isBrowser() {
  return typeof window !== 'undefined';
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getCategories(): Category[] {
  if (!isBrowser()) return DEFAULT_CATEGORIES;
  const existing = window.localStorage.getItem(CATEGORIES_KEY);
  if (!existing) {
    window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return safeParse<Category[]>(existing, DEFAULT_CATEGORIES);
}

export function saveCategories(categories: Category[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function addCategory(name: string, color: string): Category[] {
  const categories = getCategories();
  const newCategory: Category = {
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
    name,
    color,
  };
  const updated = [...categories, newCategory];
  saveCategories(updated);
  return updated;
}

export function removeCategory(id: string): Category[] {
  const categories = getCategories().filter((c) => c.id !== id);
  saveCategories(categories);
  return categories;
}

export function getEntries(): Entry[] {
  if (!isBrowser()) return [];
  const existing = window.localStorage.getItem(ENTRIES_KEY);
  return safeParse<Entry[]>(existing, []);
}

export function saveEntries(entries: Entry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function addEntry(entry: Omit<Entry, 'id' | 'createdAt'>): Entry[] {
  const entries = getEntries();
  const newEntry: Entry = {
    ...entry,
    id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
    createdAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...entries];
  saveEntries(updated);
  return updated;
}

export function removeEntry(id: string): Entry[] {
  const entries = getEntries().filter((e) => e.id !== id);
  saveEntries(entries);
  return entries;
}

export function updateEntry(id: string, patch: Partial<Entry>): Entry[] {
  const entries = getEntries().map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveEntries(entries);
  return entries;
}

export function getGoals(): Goals {
  if (!isBrowser()) return DEFAULT_GOALS;
  const existing = window.localStorage.getItem(GOALS_KEY);
  if (!existing) {
    window.localStorage.setItem(GOALS_KEY, JSON.stringify(DEFAULT_GOALS));
    return DEFAULT_GOALS;
  }
  return safeParse<Goals>(existing, DEFAULT_GOALS);
}

export function saveGoals(goals: Goals): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function exportAllData(): ExportedData {
  return {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    categories: getCategories(),
    entries: getEntries(),
    goals: getGoals(),
  };
}

export function importAllData(data: TrackerData, mode: 'replace' | 'merge' = 'replace'): void {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.entries)) {
    throw new Error('Invalid data format: expected { categories: [], entries: [] }');
  }

  if (mode === 'replace') {
    saveCategories(data.categories);
    saveEntries(data.entries);
    if (data.goals) saveGoals(data.goals);
    return;
  }

  // merge mode: de-duplicate by id
  const existingCategories = getCategories();
  const mergedCategoriesMap = new Map(existingCategories.map((c) => [c.id, c]));
  for (const c of data.categories) mergedCategoriesMap.set(c.id, c);
  saveCategories(Array.from(mergedCategoriesMap.values()));

  const existingEntries = getEntries();
  const mergedEntriesMap = new Map(existingEntries.map((e) => [e.id, e]));
  for (const e of data.entries) mergedEntriesMap.set(e.id, e);
  saveEntries(Array.from(mergedEntriesMap.values()));

  if (data.goals) saveGoals(data.goals);
}

export function clearAllData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CATEGORIES_KEY);
  window.localStorage.removeItem(ENTRIES_KEY);
  window.localStorage.removeItem(GOALS_KEY);
}
