'use client';

import { useEffect, useState } from 'react';
import { defaultMetricColor } from '@/lib/metrics';
import {
  addDayType,
  addMetric,
  getDayTypes,
  getDefaultDayTypeId,
  getMetrics,
  removeDayType,
  removeMetric,
  saveDayTypes,
  setDefaultDayTypeId,
  updateDayType,
  updateMetric,
} from '@/lib/storage';
import { DayType, Metric } from '@/lib/types';

const COLOR_PRESETS = [
  '#1fb567',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#ef4444',
  '#d97706',
  '#10b981',
  '#64748b',
];

export default function TargetConfigPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [dayTypes, setDayTypes] = useState<DayType[]>([]);
  const [defaultDayTypeId, setDefaultDayTypeIdState] = useState('');

  const [metricLabel, setMetricLabel] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [metricDirection, setMetricDirection] = useState<'min' | 'max'>('max');
  const [metricColor, setMetricColor] = useState(COLOR_PRESETS[2]); // amber by default
  const [metricError, setMetricError] = useState('');

  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [editMetricLabel, setEditMetricLabel] = useState('');
  const [editMetricUnit, setEditMetricUnit] = useState('');
  const [editMetricDirection, setEditMetricDirection] = useState<'min' | 'max'>('max');
  const [editMetricColor, setEditMetricColor] = useState(COLOR_PRESETS[0]);
  const [editMetricError, setEditMetricError] = useState('');

  const [dayTypeName, setDayTypeName] = useState('');
  const [dayTypeColor, setDayTypeColor] = useState(COLOR_PRESETS[0]);
  const [dayTypeTargets, setDayTypeTargets] = useState<Record<string, string>>({});
  const [dayTypeError, setDayTypeError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0]);
  const [editTargets, setEditTargets] = useState<Record<string, string>>({});

  function reload() {
    const loadedMetrics = getMetrics();
    setMetrics(loadedMetrics);
    setDayTypes(getDayTypes());
    setDefaultDayTypeIdState(getDefaultDayTypeId());
    setDayTypeTargets(
      Object.fromEntries(loadedMetrics.map((m) => [m.id, '']))
    );
  }

  useEffect(() => {
    reload();
  }, []);

  function handleAddMetric(ev: React.FormEvent) {
    ev.preventDefault();
    setMetricError('');
    const label = metricLabel.trim();
    const unit = metricUnit.trim();
    if (!label) {
      setMetricError('Please enter a metric name.');
      return;
    }
    if (!unit) {
      setMetricError('Please enter a unit (e.g. kcal, g, ml).');
      return;
    }
    const updated = addMetric(label, unit, metricDirection, metricColor);
    setMetrics(updated);
    setMetricLabel('');
    setMetricUnit('');
    setMetricDirection('max');
    setMetricColor(COLOR_PRESETS[2]);
    setDayTypeTargets((prev) => ({ ...prev, [updated[updated.length - 1].id]: '' }));
  }

  function startEditMetric(m: Metric) {
    setEditingMetricId(m.id);
    setEditMetricLabel(m.label);
    setEditMetricUnit(m.unit);
    setEditMetricDirection(m.direction);
    setEditMetricColor(m.color || defaultMetricColor(m.id));
    setEditMetricError('');
  }

  function cancelEditMetric() {
    setEditingMetricId(null);
  }

  function handleSaveEditMetric(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editingMetricId) return;
    const label = editMetricLabel.trim();
    const unit = editMetricUnit.trim();
    if (!label) {
      setEditMetricError('Please enter a metric name.');
      return;
    }
    if (!unit) {
      setEditMetricError('Please enter a unit.');
      return;
    }
    const updated = updateMetric(editingMetricId, {
      label,
      unit,
      direction: editMetricDirection,
      color: editMetricColor,
    });
    setMetrics(updated);
    setEditingMetricId(null);
  }

  function handleRemoveMetric(id: string) {
    const updated = removeMetric(id);
    setMetrics(updated);
    const cleaned = getDayTypes().map((d) => {
      const { [id]: _, ...rest } = d.targets;
      return { ...d, targets: rest };
    });
    saveDayTypes(cleaned);
    setDayTypes(cleaned);
  }

  function parseTargets(raw: Record<string, string>): Record<string, number> | null {
    const targets: Record<string, number> = {};
    for (const m of metrics) {
      const val = Number(raw[m.id]);
      if (!Number.isFinite(val) || val < 0) {
        return null;
      }
      if (val > 0) targets[m.id] = val;
    }
    if (Object.keys(targets).length === 0) return null;
    return targets;
  }

  function handleAddDayType(ev: React.FormEvent) {
    ev.preventDefault();
    setDayTypeError('');
    const name = dayTypeName.trim();
    if (!name) {
      setDayTypeError('Please enter a day type name (e.g. Gym Day).');
      return;
    }
    if (dayTypes.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      setDayTypeError('That day type already exists.');
      return;
    }
    const targets = parseTargets(dayTypeTargets);
    if (!targets) {
      setDayTypeError('Set at least one valid target value.');
      return;
    }
    setDayTypes(addDayType(name, dayTypeColor, targets));
    setDayTypeName('');
    setDayTypeColor(COLOR_PRESETS[0]);
    setDayTypeTargets(Object.fromEntries(metrics.map((m) => [m.id, ''])));
  }

  function startEdit(dayType: DayType) {
    setEditingId(dayType.id);
    setEditName(dayType.name);
    setEditColor(dayType.color);
    setEditTargets(
      Object.fromEntries(
        metrics.map((m) => [m.id, dayType.targets[m.id] !== undefined ? String(dayType.targets[m.id]) : ''])
      )
    );
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleSaveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    const targets = parseTargets(editTargets);
    if (!targets) {
      setDayTypeError('Each day type needs at least one valid target.');
      return;
    }
    setDayTypeError('');
    setDayTypes(updateDayType(editingId, { name, color: editColor, targets }));
    setEditingId(null);
  }

  function handleRemoveDayType(id: string) {
    if (dayTypes.length <= 1) {
      window.alert('You need at least one day type.');
      return;
    }
    const ok = window.confirm('Remove this day type? Days assigned to it will fall back to the default.');
    if (!ok) return;
    setDayTypes(removeDayType(id));
    if (defaultDayTypeId === id) {
      const next = getDefaultDayTypeId();
      setDefaultDayTypeIdState(next);
    }
  }

  function handleDefaultChange(id: string) {
    setDefaultDayTypeId(id);
    setDefaultDayTypeIdState(id);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Metrics</h2>
        <p className="mb-3 text-xs text-gray-400">
          Define what you track. Each metric becomes a key in your day-type targets — add whatever
          you want (calories, fiber, steps, etc.).
        </p>
        <form onSubmit={handleAddMetric} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
              <input
                type="text"
                value={metricLabel}
                onChange={(e) => setMetricLabel(e.target.value)}
                placeholder="e.g. Oil"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Unit</label>
              <input
                type="text"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                placeholder="e.g. g, kcal, ml"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Goal type</label>
              <select
                value={metricDirection}
                onChange={(e) => setMetricDirection(e.target.value as 'min' | 'max')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="max">Max (stay under)</option>
                <option value="min">Min (reach at least)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setMetricColor(c)}
                  aria-label={`Select color ${c}`}
                  className={`h-7 w-7 rounded-full border-2 ${
                    metricColor === c ? 'border-gray-900 ring-2 ring-gray-300' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {metricError && <p className="text-xs font-medium text-red-600">{metricError}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white active:bg-brand-600"
          >
            Add Metric
          </button>
        </form>
        {metrics.length > 0 && (
          <ul className="mt-4 space-y-2">
            {metrics.map((m) => (
              <li
                key={m.id}
                className="rounded-lg bg-gray-50 p-3 text-sm"
              >
                {editingMetricId === m.id ? (
                  <form onSubmit={handleSaveEditMetric} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="mb-0.5 block text-[11px] text-gray-500">Metric Name</label>
                        <input
                          type="text"
                          value={editMetricLabel}
                          onChange={(e) => setEditMetricLabel(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] text-gray-500">Unit</label>
                        <input
                          type="text"
                          value={editMetricUnit}
                          onChange={(e) => setEditMetricUnit(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] text-gray-500">Goal Type</label>
                        <select
                          value={editMetricDirection}
                          onChange={(e) => setEditMetricDirection(e.target.value as 'min' | 'max')}
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          <option value="max">Max (stay under)</option>
                          <option value="min">Min (reach at least)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            type="button"
                            key={c}
                            onClick={() => setEditMetricColor(c)}
                            aria-label={`Choose color ${c}`}
                            className={`h-6 w-6 rounded-full border-2 ${
                              editMetricColor === c ? 'border-gray-900 ring-2 ring-gray-300' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    {editMetricError && (
                      <p className="text-xs font-medium text-red-600">{editMetricError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditMetric}
                        className="flex-1 rounded-lg bg-gray-200 py-1.5 text-xs font-semibold text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-black/10 shadow-xs"
                        style={{ backgroundColor: m.color }}
                      />
                      <div>
                        <span className="font-medium text-gray-800">{m.label}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {m.unit} · {m.direction === 'max' ? 'stay under' : 'reach at least'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditMetric(m)}
                        className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-white"
                      >
                        Edit
                      </button>
                      {!['calories', 'protein', 'carbs', 'water'].includes(m.id) && (
                        <button
                          onClick={() => handleRemoveMetric(m.id)}
                          aria-label={`Remove ${m.label}`}
                          className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Day Types</h2>
        <p className="mb-3 text-xs text-gray-400">
          Each day type is a named set of targets — e.g. Gym Day vs Rest Day. On the Add page you
          pick which type today is.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-gray-500">Default day type</label>
          <select
            value={defaultDayTypeId}
            onChange={(e) => handleDefaultChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {dayTypes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-gray-400">
            Used when you haven&apos;t picked a type for a given day.
          </p>
        </div>

        <form onSubmit={handleAddDayType} className="space-y-3 rounded-lg border border-dashed border-gray-200 p-3">
          <p className="text-xs font-semibold text-gray-500">Add day type</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
            <input
              type="text"
              value={dayTypeName}
              onChange={(e) => setDayTypeName(e.target.value)}
              placeholder="e.g. Gym Day"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setDayTypeColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${
                    dayTypeColor === c ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((m) => (
              <div key={m.id}>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  {m.label} ({m.unit})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={dayTypeTargets[m.id] ?? ''}
                  onChange={(e) =>
                    setDayTypeTargets((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>
          {dayTypeError && <p className="text-xs font-medium text-red-600">{dayTypeError}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white active:bg-brand-600"
          >
            Add Day Type
          </button>
        </form>

        <ul className="mt-4 space-y-3">
          {dayTypes.map((d) => (
            <li key={d.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              {editingId === d.id ? (
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`h-6 w-6 rounded-full border-2 ${
                          editColor === c ? 'border-gray-900' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {metrics.map((m) => (
                      <div key={m.id}>
                        <label className="mb-0.5 block text-[11px] text-gray-500">
                          {m.label} ({m.unit})
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          value={editTargets[m.id] ?? ''}
                          onChange={(e) =>
                            setEditTargets((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="flex-1 rounded-lg bg-gray-200 py-2 text-xs font-semibold text-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-sm font-medium text-gray-800">{d.name}</span>
                      {d.id === defaultDayTypeId && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                          default
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(d)}
                        className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveDayType(d.id)}
                        aria-label={`Remove ${d.name}`}
                        className="rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {metrics
                      .filter((m) => d.targets[m.id] !== undefined)
                      .map((m) => (
                        <span
                          key={m.id}
                          className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-600"
                        >
                          {m.label}: {d.targets[m.id]}
                          {m.unit}
                        </span>
                      ))}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
