'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/': 'Log Calories',
  '/report': 'Report',
  '/categories': 'Categories',
  '/settings': 'Settings',
};

export default function TopBar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? 'Calorie Tracker';

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        <Link
          href="/settings"
          aria-label="Settings"
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 active:bg-gray-200"
        >
          ⚙️
        </Link>
      </div>
    </header>
  );
}
