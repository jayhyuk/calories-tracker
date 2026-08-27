'use client';

import { useEffect, useState } from 'react';
import { addCategory, getCategories, getEntries, removeCategory } from '@/lib/storage';
import { Category } from '@/lib/types';

const COLOR_PRESETS = [
  '#f59e0b',
  '#1fb567',
  '#3b82f6',
  '#a855f7',
  '#06b6d4',
  '#ef4444',
  '#ec4899',
  '#84cc16',
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [usageCount, setUsageCount] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    setCategories(getCategories());
    const entries = getEntries();
    const counts: Record<string, number> = {};
    for (const e of entries) counts[e.categoryId] = (counts[e.categoryId] ?? 0) + 1;
    setUsageCount(counts);
  }, []);

  function handleAdd(ev: React.FormEvent) {
    ev.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a category name.');
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('That category already exists.');
      return;
    }
    setCategories(addCategory(trimmed, color));
    setName('');
  }

  function handleRemove(id: string) {
    const count = usageCount[id] ?? 0;
    if (count > 0) {
      const ok = window.confirm(
        `${count} entr${count === 1 ? 'y' : 'ies'} use this category. Remove it anyway? Existing entries will keep the category id but show as "Uncategorized".`
      );
      if (!ok) return;
    }
    setCategories(removeCategory(id));
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleAdd} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">New category name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dessert"
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
                onClick={() => setColor(c)}
                aria-label={`Choose color ${c}`}
                className={`h-8 w-8 rounded-full border-2 ${
                  color === c ? 'border-gray-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-brand-600"
        >
          Add Category
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-600">Existing Categories</h2>
        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-400">
            No categories yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <span className="text-xs text-gray-400">
                    ({usageCount[c.id] ?? 0} {usageCount[c.id] === 1 ? 'entry' : 'entries'})
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  aria-label="Delete category"
                  className="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
