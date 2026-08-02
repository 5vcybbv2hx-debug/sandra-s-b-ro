import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TimerBanner from './TimerBanner';
import QuickCaptureFAB from './QuickCaptureFAB';
import FeierabendFAB from './FeierabendFAB';
import { useEffect } from 'react';
import { syncSettingsFromServer } from '@/lib/settings';

export default function Layout() {
  useEffect(() => { syncSettingsFromServer(); }, []);
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TimerBanner />
        <main className="flex-1 pb-20 md:pb-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <QuickCaptureFAB />
      <FeierabendFAB />
      <Toaster position="top-center" richColors />
    </div>
  );
}