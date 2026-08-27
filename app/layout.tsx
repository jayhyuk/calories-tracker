import type { Metadata, Viewport } from 'next';
import './globals.css';
import TopBar from '@/components/TopBar';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Calorie Tracker',
  description: 'Track your daily calories, protein, and food categories.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1fb567',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopBar />
        <main className="mx-auto min-h-[calc(100vh-56px)] max-w-md px-4 pb-24 pt-4">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
