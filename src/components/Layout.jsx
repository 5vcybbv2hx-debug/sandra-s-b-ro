import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TimerBar from './TimerBar';
import QuickCaptureFAB from './QuickCaptureFAB';
import FeierabendFAB from './FeierabendFAB';
import { useEffect } from 'react';
import FragebogenGate from '@/components/personal/FragebogenGate';
import { syncSettingsFromServer } from '@/lib/settings';
import { ElaraProvider } from '@/lib/ElaraContext';
import ElaraChatPanel from './ElaraChatPanel';

export default function Layout() {
  useEffect(() => { syncSettingsFromServer(); }, []);
  return (
    <ElaraProvider>
      <div className="flex min-h-screen bg-background">
        <FragebogenGate />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TimerBar />
          <main className="flex-1 pb-20 md:pb-8">
            <Outlet />
          </main>
        </div>
        <BottomNav />
        <QuickCaptureFAB />
        <FeierabendFAB />
        <ElaraChatPanel />
        <Toaster position="top-center" richColors />
      </div>
    </ElaraProvider>
  );
}