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
  /** ISO datetime string, editable by the user (defaults to "now" at creation time) */
  time: string;
  createdAt: string;
}

export interface Goals {
  calories: number;
  protein: number;
}

export interface TrackerData {
  categories: Category[];
  entries: Entry[];
  goals: Goals;
}

export const CURRENT_SCHEMA_VERSION = 1;

export interface ExportedData extends TrackerData {
  version: number;
  exportedAt: string;
}
