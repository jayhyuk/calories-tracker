import {
  Category,
  CURRENT_SCHEMA_VERSION,
  DayAssignments,
  DayType,
  Entry,
  ExportedData,
  FoodTemplate,
  LegacyGoals,
  Metric,
  TrackerData,
  WaterEntry,
} from './types';
import { defaultMetricColor, normalizeMetric } from './metrics';

const CATEGORIES_KEY = 'calorie-tracker:categories';
const ENTRIES_KEY = 'calorie-tracker:entries';
const WATER_ENTRIES_KEY = 'calorie-tracker:water-entries';
const METRICS_KEY = 'calorie-tracker:metrics';
const DAY_TYPES_KEY = 'calorie-tracker:day-types';
const DAY_ASSIGNMENTS_KEY = 'calorie-tracker:day-assignments';
const DEFAULT_DAY_TYPE_ID_KEY = 'calorie-tracker:default-day-type-id';
const FOOD_TEMPLATES_KEY = 'calorie-tracker:food-templates';
/** @deprecated old single global goal, only read once for migration */
const LEGACY_GOALS_KEY = 'calorie-tracker:goals';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'breakfast', name: 'Breakfast', color: '#f59e0b' },
  { id: 'lunch', name: 'Lunch', color: '#1fb567' },
  { id: 'dinner', name: 'Dinner', color: '#3b82f6' },
  { id: 'snack', name: 'Snack', color: '#a855f7' },
  { id: 'drink', name: 'Drink', color: '#06b6d4' },
];

export const DEFAULT_METRICS: Metric[] = [
  { id: 'calories', label: 'Calories', unit: 'kcal', direction: 'max', color: defaultMetricColor('calories') },
  { id: 'protein', label: 'Protein', unit: 'g', direction: 'min', color: defaultMetricColor('protein') },
  { id: 'carbs', label: 'Carbs', unit: 'g', direction: 'max', color: defaultMetricColor('carbs') },
  { id: 'water', label: 'Water', unit: 'ml', direction: 'min', color: defaultMetricColor('water') },
];

const LEGACY_GOALS_DEFAULT: LegacyGoals = { calories: 2000, protein: 150, carbs: 250, water: 2000 };

function defaultDayType(targets: Record<string, number> = { ...LEGACY_GOALS_DEFAULT }): DayType {
  return { id: 'standard', name: 'Standard', color: '#1fb567', targets };
}

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

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function dateKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

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
  const newCategory: Category = { id: newId(), name, color };
  const updated = [...categories, newCategory];
  saveCategories(updated);
  return updated;
}

export function removeCategory(id: string): Category[] {
  const categories = getCategories().filter((c) => c.id !== id);
  saveCategories(categories);
  return categories;
}

// ---------------------------------------------------------------------------
// Food/drink entries
// ---------------------------------------------------------------------------

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
  const newEntry: Entry = { ...entry, id: newId(), createdAt: new Date().toISOString() };
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

// ---------------------------------------------------------------------------
// Food templates
// ---------------------------------------------------------------------------

export function getFoodTemplates(): FoodTemplate[] {
  if (!isBrowser()) return [];
  const existing = window.localStorage.getItem(FOOD_TEMPLATES_KEY);
  return safeParse<FoodTemplate[]>(existing, []);
}

export function saveFoodTemplates(templates: FoodTemplate[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(FOOD_TEMPLATES_KEY, JSON.stringify(templates));
}

export function addFoodTemplate(template: Omit<FoodTemplate, 'id' | 'createdAt'>): FoodTemplate[] {
  const templates = getFoodTemplates();
  const newTemplate: FoodTemplate = { ...template, id: newId(), createdAt: new Date().toISOString() };
  const updated = [newTemplate, ...templates];
  saveFoodTemplates(updated);
  return updated;
}

export function removeFoodTemplate(id: string): FoodTemplate[] {
  const templates = getFoodTemplates().filter((template) => template.id !== id);
  saveFoodTemplates(templates);
  return templates;
}

// ---------------------------------------------------------------------------
// Water entries
// ---------------------------------------------------------------------------

export function getWaterEntries(): WaterEntry[] {
  if (!isBrowser()) return [];
  const existing = window.localStorage.getItem(WATER_ENTRIES_KEY);
  return safeParse<WaterEntry[]>(existing, []);
}

export function saveWaterEntries(entries: WaterEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(WATER_ENTRIES_KEY, JSON.stringify(entries));
}

export function addWaterEntry(entry: Omit<WaterEntry, 'id' | 'createdAt'>): WaterEntry[] {
  const entries = getWaterEntries();
  const newEntry: WaterEntry = { ...entry, id: newId(), createdAt: new Date().toISOString() };
  const updated = [newEntry, ...entries];
  saveWaterEntries(updated);
  return updated;
}

export function removeWaterEntry(id: string): WaterEntry[] {
  const entries = getWaterEntries().filter((e) => e.id !== id);
  saveWaterEntries(entries);
  return entries;
}

// ---------------------------------------------------------------------------
// Metrics (key/value target definitions — fully user-configurable)
// ---------------------------------------------------------------------------

export function getMetrics(): Metric[] {
  if (!isBrowser()) return DEFAULT_METRICS;
  const existing = window.localStorage.getItem(METRICS_KEY);
  if (!existing) {
    window.localStorage.setItem(METRICS_KEY, JSON.stringify(DEFAULT_METRICS));
    return DEFAULT_METRICS;
  }
  const raw = safeParse<Metric[]>(existing, DEFAULT_METRICS);
  const parsed = raw.map(normalizeMetric);
  if (raw.some((m) => !m.color)) saveMetrics(parsed);
  return parsed;
}

export function saveMetrics(metrics: Metric[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
}

export function addMetric(
  label: string,
  unit: string,
  direction: 'min' | 'max',
  color: string = defaultMetricColor(label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'))
): Metric[] {
  const metrics = getMetrics();
  const id = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || newId();
  const uniqueId = metrics.some((m) => m.id === id) ? `${id}_${newId().slice(0, 4)}` : id;
  const updated = [
    ...metrics,
    { id: uniqueId, label: label.trim(), unit: unit.trim(), direction, color },
  ];
  saveMetrics(updated);
  return updated;
}

export function updateMetric(id: string, patch: Partial<Omit<Metric, 'id'>>): Metric[] {
  const updated = getMetrics().map((m) => (m.id === id ? normalizeMetric({ ...m, ...patch }) : m));
  saveMetrics(updated);
  return updated;
}

export function removeMetric(id: string): Metric[] {
  const metrics = getMetrics().filter((m) => m.id !== id);
  saveMetrics(metrics);
  return metrics;
}

// ---------------------------------------------------------------------------
// Day types (named target profiles, e.g. "Gym Day", "Cardio Day", "Rest Day")
// ---------------------------------------------------------------------------

function migrateLegacyGoalsToDayType(): DayType {
  if (!isBrowser()) return defaultDayType();
  const legacyRaw = window.localStorage.getItem(LEGACY_GOALS_KEY);
  const legacy = safeParse<Partial<LegacyGoals> | null>(legacyRaw, null);
  if (legacy) {
    return defaultDayType({ ...LEGACY_GOALS_DEFAULT, ...legacy });
  }
  return defaultDayType();
}

export function getDayTypes(): DayType[] {
  if (!isBrowser()) return [defaultDayType()];
  const existing = window.localStorage.getItem(DAY_TYPES_KEY);
  if (!existing) {
    const seeded = [migrateLegacyGoalsToDayType()];
    window.localStorage.setItem(DAY_TYPES_KEY, JSON.stringify(seeded));
    if (!window.localStorage.getItem(DEFAULT_DAY_TYPE_ID_KEY)) {
      window.localStorage.setItem(DEFAULT_DAY_TYPE_ID_KEY, seeded[0].id);
    }
    return seeded;
  }
  const parsed = safeParse<DayType[]>(existing, [defaultDayType()]);
  return parsed.length > 0 ? parsed : [defaultDayType()];
}

export function saveDayTypes(dayTypes: DayType[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(DAY_TYPES_KEY, JSON.stringify(dayTypes));
}

export function addDayType(name: string, color: string, targets: Record<string, number>): DayType[] {
  const dayTypes = getDayTypes();
  const updated = [...dayTypes, { id: newId(), name, color, targets }];
  saveDayTypes(updated);
  return updated;
}

export function updateDayType(id: string, patch: Partial<Omit<DayType, 'id'>>): DayType[] {
  const updated = getDayTypes().map((d) => (d.id === id ? { ...d, ...patch } : d));
  saveDayTypes(updated);
  return updated;
}

export function removeDayType(id: string): DayType[] {
  const remaining = getDayTypes().filter((d) => d.id !== id);
  const finalList = remaining.length > 0 ? remaining : [defaultDayType()];
  saveDayTypes(finalList);
  if (getDefaultDayTypeId() === id) {
    setDefaultDayTypeId(finalList[0].id);
  }
  return finalList;
}

export function getDefaultDayTypeId(): string {
  const dayTypes = getDayTypes();
  if (!isBrowser()) return dayTypes[0].id;
  const existing = window.localStorage.getItem(DEFAULT_DAY_TYPE_ID_KEY);
  if (existing && dayTypes.some((d) => d.id === existing)) return existing;
  const fallback = dayTypes[0].id;
  window.localStorage.setItem(DEFAULT_DAY_TYPE_ID_KEY, fallback);
  return fallback;
}

export function setDefaultDayTypeId(id: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEFAULT_DAY_TYPE_ID_KEY, id);
}

// ---------------------------------------------------------------------------
// Day type assignments (which day type applies to a given calendar date)
// ---------------------------------------------------------------------------

export function getDayAssignments(): DayAssignments {
  if (!isBrowser()) return {};
  const existing = window.localStorage.getItem(DAY_ASSIGNMENTS_KEY);
  return safeParse<DayAssignments>(existing, {});
}

export function saveDayAssignments(assignments: DayAssignments): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(DAY_ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

export function setDayAssignment(date: string, dayTypeId: string): DayAssignments {
  const assignments = { ...getDayAssignments(), [date]: dayTypeId };
  saveDayAssignments(assignments);
  return assignments;
}

/** Resolves the DayType that applies to a given date: explicit assignment, else the default. */
export function getDayTypeForDate(date: string): DayType {
  const dayTypes = getDayTypes();
  const assignments = getDayAssignments();
  const assignedId = assignments[date];
  const defaultId = getDefaultDayTypeId();
  const resolvedId = assignedId ?? defaultId;
  return dayTypes.find((d) => d.id === resolvedId) ?? dayTypes[0];
}

// ---------------------------------------------------------------------------
// Export / import / clear
// ---------------------------------------------------------------------------

export function exportAllData(): ExportedData {
  return {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    categories: getCategories(),
    entries: getEntries(),
    waterEntries: getWaterEntries(),
    metrics: getMetrics(),
    dayTypes: getDayTypes(),
    dayAssignments: getDayAssignments(),
    defaultDayTypeId: getDefaultDayTypeId(),
    foodTemplates: getFoodTemplates(),
  };
}

export function importAllData(data: TrackerData, mode: 'replace' | 'merge' = 'replace'): void {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.entries)) {
    throw new Error('Invalid data format: expected { categories: [], entries: [] }');
  }
  const waterEntries = Array.isArray(data.waterEntries) ? data.waterEntries : [];
  const foodTemplates = Array.isArray(data.foodTemplates) ? data.foodTemplates : [];

  // Build the day types / metrics to import, migrating legacy single-goal exports if needed.
  let importedMetrics = Array.isArray(data.metrics) ? data.metrics : null;
  let importedDayTypes = Array.isArray(data.dayTypes) ? data.dayTypes : null;
  let importedDefaultDayTypeId = data.defaultDayTypeId;
  const importedAssignments: DayAssignments =
    data.dayAssignments && typeof data.dayAssignments === 'object' ? data.dayAssignments : {};

  if (!importedDayTypes) {
    // Legacy export shape: { goals: { calories, protein, carbs, water } }
    const legacy = data.goals;
    importedDayTypes = [defaultDayType(legacy ? { ...LEGACY_GOALS_DEFAULT, ...legacy } : undefined)];
    importedDefaultDayTypeId = importedDayTypes[0].id;
  }
  if (!importedMetrics) {
    importedMetrics = DEFAULT_METRICS;
  } else {
    importedMetrics = importedMetrics.map(normalizeMetric);
  }
  if (!importedDefaultDayTypeId) {
    importedDefaultDayTypeId = importedDayTypes[0]?.id ?? defaultDayType().id;
  }

  if (mode === 'replace') {
    saveCategories(data.categories);
    saveEntries(data.entries);
    saveWaterEntries(waterEntries);
    saveMetrics(importedMetrics);
    saveDayTypes(importedDayTypes);
    saveDayAssignments(importedAssignments);
    setDefaultDayTypeId(importedDefaultDayTypeId);
    saveFoodTemplates(foodTemplates);
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

  const existingWaterEntries = getWaterEntries();
  const mergedWaterMap = new Map(existingWaterEntries.map((e) => [e.id, e]));
  for (const e of waterEntries) mergedWaterMap.set(e.id, e);
  saveWaterEntries(Array.from(mergedWaterMap.values()));

  const existingMetrics = getMetrics();
  const mergedMetricsMap = new Map(existingMetrics.map((m) => [m.id, m]));
  for (const m of importedMetrics) mergedMetricsMap.set(m.id, m);
  saveMetrics(Array.from(mergedMetricsMap.values()));

  const existingDayTypes = getDayTypes();
  const mergedDayTypesMap = new Map(existingDayTypes.map((d) => [d.id, d]));
  for (const d of importedDayTypes) mergedDayTypesMap.set(d.id, d);
  saveDayTypes(Array.from(mergedDayTypesMap.values()));

  saveDayAssignments({ ...getDayAssignments(), ...importedAssignments });

  const existingTemplates = getFoodTemplates();
  const mergedTemplatesMap = new Map(existingTemplates.map((template) => [template.id, template]));
  for (const template of foodTemplates) mergedTemplatesMap.set(template.id, template);
  saveFoodTemplates(Array.from(mergedTemplatesMap.values()));
}

export function clearAllData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(CATEGORIES_KEY);
  window.localStorage.removeItem(ENTRIES_KEY);
  window.localStorage.removeItem(WATER_ENTRIES_KEY);
  window.localStorage.removeItem(METRICS_KEY);
  window.localStorage.removeItem(DAY_TYPES_KEY);
  window.localStorage.removeItem(DAY_ASSIGNMENTS_KEY);
  window.localStorage.removeItem(DEFAULT_DAY_TYPE_ID_KEY);
  window.localStorage.removeItem(FOOD_TEMPLATES_KEY);
  window.localStorage.removeItem(LEGACY_GOALS_KEY);
}
