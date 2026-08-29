'use client';

import { useEffect, useMemo, useState } from 'react';
import { categoryIdForTime } from '@/lib/categories';
import {
  actualForMetric,
  entryValuesFromForm,
  foodMetricsForDayType,
  getEntryMetricValue,
  hasWaterTarget,
  isFoodLoggableMetric,
  progressForMetric,
  remainingLabel,
  textColorForBackground,
} from '@/lib/metrics';
import {
  addEntry,
  addFoodTemplate,
  addWaterEntry,
  getCategories,
  getDayTypeForDate,
  getDayTypes,
  getEntries,
  getFoodTemplates,
  getMetrics,
  getWaterEntries,
  removeEntry,
  removeWaterEntry,
  setDayAssignment,
  todayKey,
} from '@/lib/storage';
import { Category, DayType, Entry, FoodTemplate, Metric, WaterEntry } from '@/lib/types';

const WATER_QUICK_ADD_ML = [150, 250, 500];

function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function isSameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function emptyFormValues(metricIds: string[]): Record<string, string> {
  return Object.fromEntries(metricIds.map((id) => [id, '']));
}

export default function AddCaloriePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [foodTemplates, setFoodTemplates] = useState<FoodTemplate[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [dayTypes, setDayTypes] = useState<DayType[]>([]);
  const [todayDayType, setTodayDayType] = useState<DayType | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [time, setTime] = useState(() => toLocalDatetimeInputValue(new Date()));
  const [error, setError] = useState('');
  const [waterAmount, setWaterAmount] = useState('');
  const [waterError, setWaterError] = useState('');

  const formMetrics = useMemo(
    () => (todayDayType ? foodMetricsForDayType(metrics, todayDayType.targets) : []),
    [metrics, todayDayType]
  );

  const showWaterSection = useMemo(
    () => (todayDayType ? hasWaterTarget(todayDayType.targets) : false),
    [todayDayType]
  );

  useEffect(() => {
    const cats = getCategories();
    const now = new Date();
    setCategories(cats);
    setCategoryId(categoryIdForTime(now, cats));
    setEntries(getEntries());
    setFoodTemplates(getFoodTemplates());
    setWaterEntries(getWaterEntries());
    const loadedMetrics = getMetrics();
    setMetrics(loadedMetrics);
    setDayTypes(getDayTypes());
    const dayType = getDayTypeForDate(todayKey());
    setTodayDayType(dayType);
    setMetricValues(emptyFormValues(foodMetricsForDayType(loadedMetrics, dayType.targets).map((m) => m.id)));
  }, []);

  useEffect(() => {
    if (!todayDayType) return;
    setMetricValues((prev) => {
      const ids = foodMetricsForDayType(metrics, todayDayType.targets).map((m) => m.id);
      const next = emptyFormValues(ids);
      for (const id of ids) {
        if (prev[id] !== undefined) next[id] = prev[id];
      }
      return next;
    });
  }, [todayDayType, metrics]);

  const todayEntries = useMemo(
    () => entries.filter((e) => isSameDay(e.time, new Date().toISOString())),
    [entries]
  );

  const todayWaterEntries = useMemo(
    () => waterEntries.filter((e) => isSameDay(e.time, new Date().toISOString())),
    [waterEntries]
  );

  const metricProgress = useMemo(() => {
    if (!todayDayType) return [];
    return metrics
      .map((metric) => {
        const target = todayDayType.targets[metric.id];
        const actual = actualForMetric(metric.id, todayEntries, todayWaterEntries);
        const progress = progressForMetric(metric, actual, target);
        return progress ? { metric, ...progress } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [metrics, todayDayType, todayEntries, todayWaterEntries]);

  function handleDayTypeChange(dayTypeId: string) {
    setDayAssignment(todayKey(), dayTypeId);
    const selected = dayTypes.find((d) => d.id === dayTypeId) ?? getDayTypeForDate(todayKey());
    setTodayDayType(selected);
  }

  function handleTimeChange(value: string) {
    setTime(value);
    const picked = new Date(value);
    if (!Number.isNaN(picked.getTime())) {
      setCategoryId(categoryIdForTime(picked, categories));
    }
  }

  function handleTemplateChange(templateId: string) {
    if (!templateId) return;
    const template = foodTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setName(template.name);
    setCategoryId(template.categoryId);
    setMetricValues((prev) => {
      const next = { ...prev };
      for (const metric of formMetrics) {
        next[metric.id] = template.values[metric.id] !== undefined ? String(template.values[metric.id]) : '';
      }
      return next;
    });
  }

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? 'Uncategorized';
  }

  function categoryColor(id: string) {
    return categories.find((c) => c.id === id)?.color ?? '#9ca3af';
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter a food/drink name.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    const numericValues = entryValuesFromForm(metricValues);

    for (const m of formMetrics) {
      const num = numericValues[m.id] ?? 0;
      if (!Number.isFinite(num) || num < 0) {
        setError(`Please enter a valid ${m.label.toLowerCase()} amount.`);
        return;
      }
    }

    const isoTime = new Date(time).toISOString();
    const updated = addEntry({
      name: name.trim(),
      categoryId,
      calories: numericValues.calories ?? 0,
      protein: numericValues.protein ?? 0,
      carbs: numericValues.carbs ?? 0,
      values: numericValues,
      time: isoTime,
    });
    setEntries(updated);
    setName('');
    setMetricValues(emptyFormValues(formMetrics.map((m) => m.id)));
    const resetDate = new Date();
    setTime(toLocalDatetimeInputValue(resetDate));
    setCategoryId(categoryIdForTime(resetDate, categories));
  }

  function handleDelete(id: string) {
    setEntries(removeEntry(id));
  }

  function handleSaveTemplate(entry: Entry) {
    const values = {
      ...(entry.values ?? {}),
      calories: getEntryMetricValue(entry, 'calories'),
      protein: getEntryMetricValue(entry, 'protein'),
      carbs: getEntryMetricValue(entry, 'carbs'),
    };
    setFoodTemplates(
      addFoodTemplate({ name: entry.name, categoryId: entry.categoryId, values })
    );
  }

  function handleAddWater(amountMl: number) {
    setWaterError('');
    if (!Number.isFinite(amountMl) || amountMl <= 0) {
      setWaterError('Please enter a valid water amount.');
      return;
    }
    setWaterEntries(addWaterEntry({ amountMl, time: new Date().toISOString() }));
  }

  function handleAddCustomWater(ev: React.FormEvent) {
    ev.preventDefault();
    handleAddWater(Number(waterAmount));
    setWaterAmount('');
  }

  function handleDeleteWater(id: string) {
    setWaterEntries(removeWaterEntry(id));
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
        No categories yet. Go to the{' '}
        <a href="/categories" className="text-brand-600 underline">
          Categories
        </a>{' '}
        tab to add one first.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="mb-1 block text-xs font-medium text-gray-500">Today&apos;s day type</label>
        <select
          value={todayDayType?.id ?? ''}
          onChange={(e) => handleDayTypeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {dayTypes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-gray-400">
          Targets come from this day type. Configure types and metric colors on the{' '}
          <a href="/target-config" className="text-brand-600 underline">
            Targets
          </a>{' '}
          page.
        </p>
      </div>

      {metricProgress.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {metricProgress.map(({ metric, actual, target, pct }) => {
            const textColor = textColorForBackground(metric.color);
            const isLightText = textColor === '#ffffff';
            const trackColor = isLightText ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)';
            const fillColor = isLightText ? '#ffffff' : '#0f172a';
            const subTextColor = isLightText ? 'rgba(255,255,255,0.88)' : 'rgba(15,23,42,0.75)';
            return (
              <div
                key={metric.id}
                className="relative overflow-hidden rounded-xl border border-black/5 p-4 shadow-sm"
                style={{ backgroundColor: metric.color, color: textColor }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: subTextColor }}>
                  Today&apos;s {metric.label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {actual !== null ? actual : '—'}
                  {actual !== null && metric.unit !== 'kcal' ? metric.unit : ''}
                </p>
                <p className="mt-1 text-[11px] font-medium" style={{ color: subTextColor }}>
                  of {target} {metric.unit} target
                </p>
                {actual !== null && (
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: trackColor }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: fillColor }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {metricProgress.length > 0 && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
            Remaining Today
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {metricProgress.map(({ metric, actual, remaining }) => {
              if (actual === null) return null;
              const { text, tone } = remainingLabel(metric, remaining);
              const toneClass =
                tone === 'warn'
                  ? 'text-red-600'
                  : tone === 'good'
                  ? 'text-brand-700'
                  : 'text-gray-700';
              return (
                <p key={metric.id} className={toneClass}>
                  <span className="font-bold">{text}</span> {metric.label.toLowerCase()}
                </p>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        {foodTemplates.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Saved food</label>
            <select
              defaultValue=""
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Choose a saved food...</option>
              {foodTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-gray-400">Fills in the name, category, and nutrition values.</p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grilled chicken breast"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-gray-400">
            Auto-selects breakfast before 11am, lunch 11am–4pm, dinner after 4pm when time changes.
          </p>
        </div>

        {formMetrics.length > 0 ? (
          <div
            className={`grid gap-3 ${
              formMetrics.length >= 3 ? 'grid-cols-3' : formMetrics.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {formMetrics.map((m) => (
              <div key={m.id}>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  {m.label} ({m.unit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={metricValues[m.id] ?? ''}
                  onChange={(e) =>
                    setMetricValues((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            No food metrics targeted for today. Add targets on the Targets page.
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Time</label>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={formMetrics.length === 0}
          className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-brand-600 disabled:opacity-40"
        >
          Add Entry
        </button>
      </form>

      {showWaterSection && (
        <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-600">💧 Water</h2>
            <span className="text-xs text-gray-400">
              {actualForMetric('water', todayEntries, todayWaterEntries) ?? 0}ml today
            </span>
          </div>
          <div className="flex gap-2">
            {WATER_QUICK_ADD_ML.map((ml) => (
              <button
                key={ml}
                type="button"
                onClick={() => handleAddWater(ml)}
                className="flex-1 rounded-lg bg-sky-50 py-2 text-xs font-semibold text-sky-600 active:bg-sky-100"
              >
                +{ml}ml
              </button>
            ))}
          </div>
          <form onSubmit={handleAddCustomWater} className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={waterAmount}
              onChange={(e) => setWaterAmount(e.target.value)}
              placeholder="Custom amount (ml)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white active:bg-sky-600"
            >
              Add
            </button>
          </form>
          {waterError && <p className="text-xs font-medium text-red-600">{waterError}</p>}
          {todayWaterEntries.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {todayWaterEntries
                .slice()
                .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                .map((w) => (
                  <li key={w.id} className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {w.amountMl}ml ·{' '}
                      {new Date(w.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleDeleteWater(w.id)}
                      aria-label="Delete water entry"
                      className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Today&apos;s Entries</h2>
        {todayEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-400">
            No entries yet today.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayEntries
              .slice()
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .map((e) => {
                const nonCalorieMetrics = metrics
                  .filter((m) => isFoodLoggableMetric(m.id) && m.id !== 'calories')
                  .map((m) => ({ metric: m, val: getEntryMetricValue(e, m.id) }))
                  .filter((item) => item.val > 0);

                const calVal = getEntryMetricValue(e, 'calories');

                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: categoryColor(e.categoryId) }}
                        />
                        <p className="truncate text-sm font-medium text-gray-800">{e.name}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {categoryName(e.categoryId)} ·{' '}
                        {new Date(e.time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 pl-2">
                      <div className="text-right text-xs">
                        {calVal > 0 ? (
                          <p className="font-semibold text-gray-800">{calVal} kcal</p>
                        ) : nonCalorieMetrics.length > 0 ? (
                          <p className="font-semibold text-gray-800">
                            {nonCalorieMetrics[0].val}{nonCalorieMetrics[0].metric.unit} {nonCalorieMetrics[0].metric.label}
                          </p>
                        ) : (
                          <p className="font-semibold text-gray-800">0 kcal</p>
                        )}
                        <p className="text-gray-400">
                          {nonCalorieMetrics
                            .map((item) => `${item.val}${item.metric.unit === 'g' ? 'g' : ` ${item.metric.unit}`} ${item.metric.label}`)
                            .join(' · ') || (calVal > 0 ? 'No other metrics' : '')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveTemplate(e)}
                        aria-label={`Save ${e.name} as a food template`}
                        className="rounded-lg px-2 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50"
                      >
                        Save template
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        aria-label="Delete entry"
                        className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
