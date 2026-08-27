'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addEntry,
  getCategories,
  getEntries,
  getGoals,
  removeEntry,
} from '@/lib/storage';
import { Category, Entry, Goals } from '@/lib/types';

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
  const [goals, setGoals] = useState<Goals>({ calories: 2000, protein: 150 });
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [time, setTime] = useState(() => toLocalDatetimeInputValue(new Date()));
  const [error, setError] = useState('');

  useEffect(() => {
    const cats = getCategories();
    setCategories(cats);
    setCategoryId(cats[0]?.id ?? '');
    setEntries(getEntries());
    setGoals(getGoals());
  }, []);

  const todayEntries = useMemo(
    () => entries.filter((e) => isSameDay(e.time, new Date().toISOString())),
    [entries]
  );

  const todayTotals = useMemo(() => {
    return todayEntries.reduce(
      (acc, e) => {
        acc.calories += Number(e.calories) || 0;
        acc.protein += Number(e.protein) || 0;
        return acc;
      },
      { calories: 0, protein: 0 }
    );
  }, [todayEntries]);

  const remainingCalories = goals.calories - todayTotals.calories;
  const remainingProtein = goals.protein - todayTotals.protein;
  const caloriesPct = goals.calories > 0 ? Math.min(100, (todayTotals.calories / goals.calories) * 100) : 0;
  const proteinPct = goals.protein > 0 ? Math.min(100, (todayTotals.protein / goals.protein) * 100) : 0;

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
      time: isoTime,
    });
    setEntries(updated);
    setName('');
    setCalories('');
    setProtein('');
    setTime(toLocalDatetimeInputValue(new Date()));
  }

  function handleDelete(id: string) {
    setEntries(removeEntry(id));
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
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-brand-500 p-4 text-white shadow-sm">
          <p className="text-xs font-medium opacity-90">Today's Calories</p>
          <p className="mt-1 text-2xl font-bold">{todayTotals.calories}</p>
          <p className="mt-1 text-[11px] opacity-90">of {goals.calories} kcal goal</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/30">
            <div
              className="h-1.5 rounded-full bg-white"
              style={{ width: `${caloriesPct}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-gray-900 p-4 text-white shadow-sm">
          <p className="text-xs font-medium opacity-90">Today's Protein</p>
          <p className="mt-1 text-2xl font-bold">{todayTotals.protein}g</p>
          <p className="mt-1 text-[11px] opacity-90">of {goals.protein}g goal</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/30">
            <div
              className="h-1.5 rounded-full bg-brand-400"
              style={{ width: `${proteinPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Remaining Today
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p className={remainingCalories >= 0 ? 'text-gray-700' : 'text-red-600'}>
            {remainingCalories >= 0 ? (
              <>
                <span className="font-bold">{remainingCalories}</span> kcal left to eat
              </>
            ) : (
              <>
                <span className="font-bold">{Math.abs(remainingCalories)}</span> kcal over goal
              </>
            )}
          </p>
          <p className={remainingProtein >= 0 ? 'text-gray-700' : 'text-brand-700'}>
            {remainingProtein >= 0 ? (
              <>
                <span className="font-bold">{remainingProtein}g</span> protein left to eat
              </>
            ) : (
              <>
                <span className="font-bold">{Math.abs(remainingProtein)}g</span> protein over goal
              </>
            )}
          </p>
        </div>
      </div>

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

        <div className="grid grid-cols-2 gap-3">
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

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Today's Entries</h2>
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
                      <p className="text-gray-400">{e.protein}g protein</p>
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
