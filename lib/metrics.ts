import { Entry, Metric, WaterEntry } from './types';

/**
 * Known metric ids that map directly to logged data. Any other metric id
 * (custom, user-added) has no automatic "actual" value — it's informational
 * only until a matching data source exists.
 */
export const TRACKED_METRIC_IDS = ['calories', 'protein', 'carbs', 'water'] as const;

const METRIC_CARD_COLORS: Record<string, string> = {
  calories: 'bg-brand-500',
  protein: 'bg-gray-900',
  carbs: 'bg-amber-500',
  water: 'bg-sky-500',
};

export function metricCardColor(id: string): string {
  return METRIC_CARD_COLORS[id] ?? 'bg-violet-500';
}

export function isTrackedMetric(id: string): boolean {
  return (TRACKED_METRIC_IDS as readonly string[]).includes(id);
}

/** Sums the actual value for a metric id from a set of food + water entries, or null if untracked. */
export function actualForMetric(
  metricId: string,
  entries: Entry[],
  waterEntries: WaterEntry[]
): number | null {
  switch (metricId) {
    case 'calories':
      return entries.reduce((sum, e) => sum + (Number(e.calories) || 0), 0);
    case 'protein':
      return entries.reduce((sum, e) => sum + (Number(e.protein) || 0), 0);
    case 'carbs':
      return entries.reduce((sum, e) => sum + (Number(e.carbs) || 0), 0);
    case 'water':
      return waterEntries.reduce((sum, e) => sum + (Number(e.amountMl) || 0), 0);
    default:
      return null;
  }
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
