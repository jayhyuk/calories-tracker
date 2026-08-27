# Calorie Tracker

A mobile-friendly calorie/protein tracker built with Next.js + Tailwind CSS. All data is stored in the browser's `localStorage` — there is no backend or database.

## Features

- **Add Calories** (main page): log food/drink entries with name, category, calories, protein, and an editable time (defaults to now).
- **Report**: bar chart of calories by category over time, protein trend line, and category totals, filterable by 7/14/30 day ranges.
- **Categories**: add or remove food/drink categories with a color tag.
- **Settings** (gear icon, top right): export all data as JSON (copy to clipboard or download a file) and import JSON back in (merge or replace), plus a "Clear All Data" option.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Framework preset: **Next.js** (auto-detected). No environment variables required.
4. Deploy.

## Data & Privacy

All data lives in your browser's `localStorage` under the keys `calorie-tracker:categories` and `calorie-tracker:entries`. Nothing is sent to a server. Use Settings → Export to back up your data as JSON, and Settings → Import to restore it (e.g. on a new device/browser).
