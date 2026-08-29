'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { allTargetsMet, getEntryMetricValue } from '@/lib/metrics';
import {
  getCategories,
  getDayTypeForDate,
  getEntries,
  getMetrics,
  getWaterEntries,
} from '@/lib/storage';
import { Category, DayType, Entry, Metric, WaterEntry } from '@/lib/types';

const RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
];

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ReportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [rangeDays, setRangeDays] = useState(7);

  useEffect(() => {
    setCategories(getCategories());
    setEntries(getEntries());
    setWaterEntries(getWaterEntries());
    setMetrics(getMetrics());
  }, []);

  const days = useMemo(() => {
    const arr: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      arr.push(dayKey(d.toISOString()));
    }
    return arr;
  }, [rangeDays]);

  const filteredEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (rangeDays - 1));
    return entries.filter((e) => new Date(e.time) >= cutoff);
  }, [entries, rangeDays]);

  const filteredWaterEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (rangeDays - 1));
    return waterEntries.filter((e) => new Date(e.time) >= cutoff);
  }, [waterEntries, rangeDays]);

  const caloriesByDay = useMemo(() => {
    return days.map((key) => {
      const row: Record<string, number | string> = { day: dayLabel(key) };
      for (const cat of categories) row[cat.name] = 0;
      for (const e of filteredEntries) {
        if (dayKey(e.time) !== key) continue;
        const cat = categories.find((c) => c.id === e.categoryId);
        const label = cat?.name ?? 'Uncategorized';
        row[label] = (Number(row[label]) || 0) + getEntryMetricValue(e, 'calories');
      }
      return row;
    });
  }, [days, filteredEntries, categories]);

  const proteinByDay = useMemo(() => {
    return days.map((key) => {
      let protein = 0;
      let carbs = 0;
      for (const e of filteredEntries) {
        if (dayKey(e.time) !== key) continue;
        protein += getEntryMetricValue(e, 'protein');
        carbs += getEntryMetricValue(e, 'carbs');
      }
      return { day: dayLabel(key), protein, carbs };
    });
  }, [days, filteredEntries]);

  const waterByDay = useMemo(() => {
    return days.map((key) => {
      let water = 0;
      for (const e of filteredWaterEntries) {
        if (dayKey(e.time) !== key) continue;
        water += Number(e.amountMl) || 0;
      }
      return { day: dayLabel(key), water };
    });
  }, [days, filteredWaterEntries]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, { calories: number; protein: number; carbs: number }> = {};
    for (const e of filteredEntries) {
      const cat = categories.find((c) => c.id === e.categoryId);
      const label = cat?.name ?? 'Uncategorized';
      if (!totals[label]) totals[label] = { calories: 0, protein: 0, carbs: 0 };
      totals[label].calories += getEntryMetricValue(e, 'calories');
      totals[label].protein += getEntryMetricValue(e, 'protein');
      totals[label].carbs += getEntryMetricValue(e, 'carbs');
    }
    return totals;
  }, [filteredEntries, categories]);

  const grandTotal = useMemo(() => {
    const foodTotals = filteredEntries.reduce(
      (acc, e) => {
        acc.calories += getEntryMetricValue(e, 'calories');
        acc.protein += getEntryMetricValue(e, 'protein');
        acc.carbs += getEntryMetricValue(e, 'carbs');
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0 }
    );
    const water = filteredWaterEntries.reduce((sum, e) => sum + (Number(e.amountMl) || 0), 0);
    return { ...foodTotals, water };
  }, [filteredEntries, filteredWaterEntries]);

  type DayStatus = 'complete' | 'missed' | 'no-data';

  const dayStatuses = useMemo(() => {
    const todayKeyStr = dayKey(new Date().toISOString());
    return days.map((key) => {
      const dayType: DayType = getDayTypeForDate(key);
      const dayEntries = filteredEntries.filter((e) => dayKey(e.time) === key);
      const dayWater = filteredWaterEntries.filter((e) => dayKey(e.time) === key);

      let status: DayStatus;
      if (dayEntries.length === 0 && dayWater.length === 0) {
        status = 'no-data';
      } else {
        status = allTargetsMet(metrics, dayType.targets, dayEntries, dayWater)
          ? 'complete'
          : 'missed';
      }

      const totals = dayEntries.reduce(
        (acc, e) => {
          acc.calories += getEntryMetricValue(e, 'calories');
          acc.protein += getEntryMetricValue(e, 'protein');
          acc.carbs += getEntryMetricValue(e, 'carbs');
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0 }
      );
      const water = dayWater.reduce((sum, e) => sum + (Number(e.amountMl) || 0), 0);

      return {
        key,
        label: dayLabel(key),
        dayTypeName: dayType.name,
        totals: { ...totals, water },
        status,
        isToday: key === todayKeyStr,
      };
    });
  }, [days, filteredEntries, filteredWaterEntries, metrics]);

  const dayStatusCounts = useMemo(() => {
    return dayStatuses.reduce(
      (acc, d) => {
        if (d.status === 'complete') acc.complete += 1;
        else if (d.status === 'missed') acc.missed += 1;
        else acc.noData += 1;
        return acc;
      },
      { complete: 0, missed: 0, noData: 0 }
    );
  }, [dayStatuses]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setRangeDays(opt.days)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              rangeDays === opt.days
                ? 'bg-brand-500 text-white'
                : 'bg-white text-gray-500 shadow-sm'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Total Calories</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{grandTotal.calories}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Total Protein</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{grandTotal.protein}g</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Total Carbs</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{grandTotal.carbs}g</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400">Total Water</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{grandTotal.water}ml</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">Goal Completion</h2>
          <span className="text-[11px] text-gray-400">Per-day targets from day types</span>
        </div>
        <div className="mb-3 flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-brand-600">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> {dayStatusCounts.complete}{' '}
            complete
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <span className="h-2 w-2 rounded-full bg-red-400" /> {dayStatusCounts.missed} missed
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <span className="h-2 w-2 rounded-full bg-gray-300" /> {dayStatusCounts.noData} no data
          </span>
        </div>
        <ul className="space-y-1.5">
          {dayStatuses.map((d) => (
            <li
              key={d.key}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                d.status === 'complete'
                  ? 'bg-brand-50'
                  : d.status === 'missed'
                  ? 'bg-red-50'
                  : 'bg-gray-50'
              }`}
            >
              <span className="font-medium text-gray-700">
                {d.label}
                {d.isToday ? ' (today)' : ''}
                <span className="ml-1 font-normal text-gray-400">· {d.dayTypeName}</span>
              </span>
              <span className="text-gray-500">
                {d.status === 'no-data' ? (
                  'No entries'
                ) : (
                  <>
                    {d.totals.calories} kcal · {d.totals.protein}g P · {d.totals.carbs}g C ·{' '}
                    {d.totals.water}ml
                  </>
                )}
              </span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  d.status === 'complete'
                    ? 'bg-brand-500 text-white'
                    : d.status === 'missed'
                    ? 'bg-red-400 text-white'
                    : 'bg-gray-300 text-white'
                }`}
              >
                {d.status === 'complete' ? 'Complete' : d.status === 'missed' ? 'Missed' : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Calories by Category</h2>
        {filteredEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No data in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={caloriesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {categories.map((cat) => (
                <Bar key={cat.id} dataKey={cat.name} stackId="cal" fill={cat.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Protein &amp; Carbs Trend</h2>
        {filteredEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No data in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={proteinByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="protein"
                name="Protein (g)"
                stroke="#1fb567"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="carbs"
                name="Carbs (g)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Water Trend</h2>
        {filteredWaterEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No data in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={waterByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} width={32} />
              <Tooltip />
              <Line type="monotone" dataKey="water" name="Water (ml)" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">Totals by Category</h2>
        {Object.keys(categoryTotals).length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No data in this range.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(categoryTotals).map(([label, totals]) => {
              const cat = categories.find((c) => c.name === label);
              return (
                <li key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: cat?.color ?? '#9ca3af' }}
                    />
                    {label}
                  </span>
                  <span className="text-gray-500">
                    {totals.calories} kcal · {totals.protein}g P · {totals.carbs}g C
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
