export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Entry {
  id: string;
  name: string;
  categoryId: string;
  calories: number;
  protein: number;
  carbs: number;
  /** ISO datetime string, editable by the user (defaults to "now" at creation time) */
  time: string;
  createdAt: string;
}

export interface WaterEntry {
  id: string;
  /** amount in milliliters */
  amountMl: number;
  /** ISO datetime string, editable by the user (defaults to "now" at creation time) */
  time: string;
  createdAt: string;
}

/**
 * A trackable nutrition metric definition (e.g. Calories, Protein, Carbs, Water).
 * `direction` controls whether the goal is a minimum you should reach ("min", e.g.
 * protein/water — more is good) or a maximum you shouldn't exceed ("max", e.g.
 * calories/carbs — less is good).
 */
export interface Metric {
  id: string;
  label: string;
  unit: string;
  direction: 'min' | 'max';
}

/**
 * A named daily target profile, e.g. "Gym Day", "Cardio Day", "Rest Day".
 * `targets` is an open key/value map of metricId -> target value, so any
 * metric (including custom ones) can have a target without changing the schema.
 */
export interface DayType {
  id: string;
  name: string;
  color: string;
  targets: Record<string, number>;
}

/** Maps a calendar date (YYYY-MM-DD, local time) to the DayType chosen for that day. */
export type DayAssignments = Record<string, string>;

/** @deprecated Legacy single global goal shape kept only for import migration of old exports. */
export interface LegacyGoals {
  calories: number;
  protein: number;
  carbs: number;
  water: number;
}

export interface TrackerData {
  categories: Category[];
  entries: Entry[];
  waterEntries: WaterEntry[];
  metrics: Metric[];
  dayTypes: DayType[];
  dayAssignments: DayAssignments;
  defaultDayTypeId: string;
  /** @deprecated present only in old exports; migrated into dayTypes on import */
  goals?: LegacyGoals;
}

export const CURRENT_SCHEMA_VERSION = 2;

export interface ExportedData extends TrackerData {
  version: number;
  exportedAt: string;
}
