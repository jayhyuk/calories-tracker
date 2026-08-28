'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  actualForMetric,
  metricCardColor,
  progressForMetric,
  remainingLabel,
} from '@/lib/metrics';
import {
  addEntry,
  addWaterEntry,
  getCategories,
  getDayTypeForDate,
  getDayTypes,
  getEntries,
  getMetrics,
  getWaterEntries,
  removeEntry,
  removeWaterEntry,
  setDayAssignment,
  todayKey,
} from '@/lib/storage';
import { Category, DayType, Entry, Metric, WaterEntry } from '@/lib/types';

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

export default function AddCaloriePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [dayTypes, setDayTypes] = useState<DayType[]>([]);
  const [todayDayType, setTodayDayType] = useState<DayType | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [time, setTime] = useState(() => toLocalDatetimeInputValue(new Date()));
  const [error, setError] = useState('');
  const [waterAmount, setWaterAmount] = useState('');
  const [waterError, setWaterError] = useState('');

  useEffect(() => {
    const cats = getCategories();
    setCategories(cats);
    setCategoryId(cats[0]?.id ?? '');
    setEntries(getEntries());
    setWaterEntries(getWaterEntries());
    setMetrics(getMetrics());
    setDayTypes(getDayTypes());
    setTodayDayType(getDayTypeForDate(todayKey()));
  }, []);

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
    const caloriesNum = Number(calories);
    const proteinNum = Number(protein || 0);
    const carbsNum = Number(carbs || 0);
    if (!Number.isFinite(caloriesNum) || caloriesNum < 0) {
      setError('Please enter a valid calorie amount.');
      return;
    }

    const isoTime = new Date(time).toISOString();
    const updated = addEntry({
      name: name.trim(),
      categoryId,
      calories: caloriesNum,
      protein: proteinNum,
      carbs: carbsNum,
      time: isoTime,
    });
    setEntries(updated);
    setName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setTime(toLocalDatetimeInputValue(new Date()));
  }

  function handleDelete(id: string) {
    setEntries(removeEntry(id));
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
          Targets come from this day type. Configure types on the{' '}
          <a href="/target-config" className="text-brand-600 underline">
            Targets
          </a>{' '}
          page.
        </p>
      </div>

      {metricProgress.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {metricProgress.map(({ metric, actual, target, pct }) => (
            <div
              key={metric.id}
              className={`rounded-xl p-4 text-white shadow-sm ${metricCardColor(metric.id)}`}
            >
              <p className="text-xs font-medium opacity-90">Today&apos;s {metric.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {actual !== null ? actual : '—'}
                {actual !== null && metric.unit !== 'kcal' ? metric.unit : ''}
              </p>
              <p className="mt-1 text-[11px] opacity-90">
                of {target} {metric.unit} target
              </p>
              {actual !== null && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/30">
                  <div className="h-1.5 rounded-full bg-white" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          ))}
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
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Calories (kcal)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Protein (g)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Carbs (g)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Time</label>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-brand-600"
        >
          Add Entry
        </button>
      </form>

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
              .map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
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
                      <p className="font-semibold text-gray-800">{e.calories} kcal</p>
                      <p className="text-gray-400">
                        {e.protein}g P · {e.carbs ?? 0}g C
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      aria-label="Delete entry"
                      className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
