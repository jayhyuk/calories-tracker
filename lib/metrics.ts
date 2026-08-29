import { Entry, Metric, WaterEntry } from './types';

/**
 * Known metric ids that map directly to logged data. Any other metric id
 * (custom, user-added) has no automatic "actual" value — it's informational
 * only until a matching data source exists.
 */
export const TRACKED_METRIC_IDS = ['calories', 'protein', 'carbs', 'water'] as const;

/** Metrics that can be logged via the food entry form (not water). */
export const FOOD_LOGGABLE_METRIC_IDS = ['calories', 'protein', 'carbs'] as const;

export const DEFAULT_METRIC_COLORS: Record<string, string> = {
  calories: '#1fb567',
  protein: '#3b82f6',
  carbs: '#f59e0b',
  oil: '#ec4899',
  fat: '#d97706',
  fiber: '#10b981',
  water: '#0284c7',
};

export function defaultMetricColor(id: string): string {
  const cleanId = id.trim().toLowerCase();
  return DEFAULT_METRIC_COLORS[cleanId] ?? '#8b5cf6';
}

export function normalizeMetric(metric: Metric): Metric {
  return {
    ...metric,
    color: metric.color || defaultMetricColor(metric.id),
  };
}

/** Returns white or dark text depending on background luminance. */
export function textColorForBackground(hex: string): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6 && raw.length !== 3) return '#ffffff';
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#0f172a' : '#ffffff';
}

export function isTrackedMetric(id: string): boolean {
  return id !== 'water';
}

export function isFoodLoggableMetric(id: string): boolean {
  return id !== 'water';
}

/** Safely extracts a metric's numeric value from an entry */
export function getEntryMetricValue(entry: Entry, metricId: string): number {
  if (entry.values && typeof entry.values[metricId] === 'number') {
    return Number(entry.values[metricId]) || 0;
  }
  if (metricId === 'calories') return Number(entry.calories) || 0;
  if (metricId === 'protein') return Number(entry.protein) || 0;
  if (metricId === 'carbs') return Number(entry.carbs) || 0;
  return Number((entry as unknown as Record<string, unknown>)[metricId]) || 0;
}

/** Sums the actual value for a metric id from a set of food + water entries. */
export function actualForMetric(
  metricId: string,
  entries: Entry[],
  waterEntries: WaterEntry[]
): number {
  if (metricId === 'water') {
    return waterEntries.reduce((sum, e) => sum + (Number(e.amountMl) || 0), 0);
  }
  return entries.reduce((sum, e) => sum + getEntryMetricValue(e, metricId), 0);
}

export interface MetricProgress {
  actual: number | null;
  target: number;
  pct: number;
  remaining: number;
  met: boolean;
}

/** Computes progress for one metric against its target. Returns null if no target is set. */
export function progressForMetric(
  metric: Metric,
  actual: number | null,
  target: number | undefined
): MetricProgress | null {
  if (target === undefined || !Number.isFinite(target) || target <= 0) return null;
  if (actual === null) {
    return { actual: null, target, pct: 0, remaining: target, met: false };
  }

  const pct = Math.min(100, (actual / target) * 100);
  const remaining = target - actual;

  if (metric.direction === 'max') {
    return { actual, target, pct, remaining, met: actual <= target };
  }
  return { actual, target, pct, remaining, met: actual >= target };
}

/** Human-readable remaining label for a metric row. */
export function remainingLabel(metric: Metric, remaining: number): { text: string; tone: 'ok' | 'warn' | 'good' } {
  const abs = Math.abs(remaining);
  const unit = metric.unit === 'g' ? 'g' : metric.unit === 'ml' ? 'ml' : ` ${metric.unit}`;

  if (metric.direction === 'max') {
    if (remaining >= 0) {
      return { text: `${abs}${unit} left`, tone: 'ok' };
    }
    return { text: `${abs}${unit} over goal`, tone: 'warn' };
  }

  if (remaining >= 0) {
    return { text: `${abs}${unit} left`, tone: 'ok' };
  }
  return { text: `${abs}${unit} over goal`, tone: 'good' };
}

/** Whether all configured targets with tracked actuals are met for the given entries. */
export function allTargetsMet(
  metrics: Metric[],
  targets: Record<string, number>,
  entries: Entry[],
  waterEntries: WaterEntry[]
): boolean {
  for (const metric of metrics) {
    const target = targets[metric.id];
    if (target === undefined) continue;
    const actual = actualForMetric(metric.id, entries, waterEntries);
    if (actual === null) continue;
    const progress = progressForMetric(metric, actual, target);
    if (progress && !progress.met) return false;
  }
  return true;
}

/** Metrics with a target on the given day type, excluding water (logged separately). */
export function foodMetricsForDayType(metrics: Metric[], targets: Record<string, number>): Metric[] {
  return metrics.filter(
    (m) => isFoodLoggableMetric(m.id) && targets[m.id] !== undefined && targets[m.id] > 0
  );
}

export function hasWaterTarget(targets: Record<string, number>): boolean {
  const target = targets.water;
  return target !== undefined && target > 0;
}

export function entryValuesFromForm(
  formValues: Record<string, string>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(formValues)) {
    result[k] = Number(v || 0);
  }
  return result;
}
