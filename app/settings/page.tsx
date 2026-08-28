'use client';

import { useRef, useState } from 'react';
import { clearAllData, exportAllData, importAllData } from '@/lib/storage';

export default function SettingsPage() {
  const [copyStatus, setCopyStatus] = useState('');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExportJson(): string {
    return JSON.stringify(exportAllData(), null, 2);
  }

  async function handleCopy() {
    const json = handleExportJson();
    try {
      await navigator.clipboard.writeText(json);
      setCopyStatus('Copied to clipboard!');
    } catch {
      setCopyStatus('Copy failed. Please select and copy manually.');
    }
    setTimeout(() => setCopyStatus(''), 2500);
  }

  function handleDownload() {
    const json = handleExportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calorie-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function runImport(json: string, mode: 'replace' | 'merge') {
    setImportStatus(null);
    try {
      const parsed = JSON.parse(json);
      importAllData(parsed, mode);
      setImportStatus({ type: 'success', msg: 'Data imported successfully. Reloading…' });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setImportStatus({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Failed to import data.',
      });
    }
  }

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setImportText(text);
    };
    reader.readAsText(file);
    ev.target.value = '';
  }

  function handleClearAll() {
    const ok = window.confirm(
      'This will permanently delete all categories and entries stored in this browser. Continue?'
    );
    if (!ok) return;
    clearAllData();
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Daily targets</h2>
        <p className="mb-3 text-xs text-gray-400">
          Targets are configured per day type (Gym Day, Rest Day, etc.) on the Targets page.
          Old exports with a single global goal are automatically migrated on import.
        </p>
        <a
          href="/target-config"
          className="block w-full rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white active:bg-brand-600"
        >
          Open Target Config
        </a>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Export data</h2>
        <p className="mb-3 text-xs text-gray-400">
          Back up everything stored on this device as JSON.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white active:bg-brand-600"
          >
            📋 Copy JSON
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white active:bg-gray-700"
          >
            ⬇️ Download
          </button>
        </div>
        {copyStatus && <p className="mt-2 text-xs font-medium text-brand-600">{copyStatus}</p>}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-gray-400">Show raw JSON</summary>
          <textarea
            readOnly
            value={handleExportJson()}
            className="mt-2 h-40 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 font-mono text-[10px] leading-snug"
          />
        </details>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-gray-700">Import data</h2>
        <p className="mb-3 text-xs text-gray-400">
          Paste exported JSON below, or upload a file, then choose how to import it.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"categories": [...], "entries": [...]}'
          className="h-32 w-full rounded-lg border border-gray-300 p-2 font-mono text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <div className="mt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => runImport(importText, 'merge')}
            disabled={!importText.trim()}
            className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Merge
          </button>
          <button
            onClick={() => runImport(importText, 'replace')}
            disabled={!importText.trim()}
            className="flex-1 rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Replace All
          </button>
        </div>
        {importStatus && (
          <p
            className={`mt-2 text-xs font-medium ${
              importStatus.type === 'success' ? 'text-brand-600' : 'text-red-600'
            }`}
          >
            {importStatus.msg}
          </p>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-red-600">Danger zone</h2>
        <p className="mb-3 text-xs text-gray-400">
          Permanently erase all categories and entries from this browser's local storage.
        </p>
        <button
          onClick={handleClearAll}
          className="w-full rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600"
        >
          Clear All Data
        </button>
      </section>
    </div>
  );
}
