import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FolderKanban, Clock, CheckSquare, MoreHorizontal, X, CalendarDays, Phone, Car, Euro, Wallet, BarChart3, FileText, Users, UserCog, Printer, LayoutTemplate, HardDrive, Settings, Shield, FileSpreadsheet, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMyTaskCount } from '@/lib/useMyTaskCount';

export default function BottomNav() {
  const myTaskCount = useMyTaskCount();
  const [mehrOpen, setMehrOpen] = useState(false);

  const mainItems = [
    { to: '/', label: 'Start', icon: Home, end: true },
    { to: '/projekte', label: 'Projekte', icon: FolderKanban },
    { to: '/zeiten', label: 'Zeiten', icon: Clock },
    { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare, badge: myTaskCount },
  ];

  const mehrItems = [
    { to: '/kalender', label: 'Kalender', icon: CalendarDays },
    { to: '/telefon', label: 'Telefonnotizen', icon: Phone },
    { to: '/fahrten', label: 'Fahrten', icon: Car },
    { to: '/abrechnung', label: 'Abrechnung', icon: Euro },
    { to: '/finanzen', label: 'Finanzen', icon: Wallet },
    { to: '/kapazitaet', label: 'Kapazität', icon: BarChart3 },
    { to: '/rechnungs-matching', label: 'Rechnungs-Matching', icon: FileSpreadsheet },
    { to: '/kontakte', label: 'Kontakte', icon: Users },
    { to: '/angebote', label: 'Angebote', icon: FileText },
    { to: '/vertraege', label: 'Verträge', icon: Shield },
    { to: '/mitarbeiter', label: 'Mitarbeiter', icon: UserCog },
    { to: '/personalfragebogen', label: 'Personalbögen', icon: FileText },
    { to: '/druckauftraege', label: 'Druckaufträge', icon: Printer },
    { to: '/vorlagen', label: 'Vorlagen', icon: LayoutTemplate },
    { to: '/wochenuebersicht', label: 'Wochenübersicht', icon: Calendar },
    { to: '/nas-sync', label: 'NAS Sync', icon: HardDrive },
    { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
  ];

  return (
    <>
      {mehrOpen && <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMehrOpen(false)} />}
      {mehrOpen && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-border overflow-hidden max-h-[60vh] overflow-y-auto">
          {mehrItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMehrOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-5 py-3.5 min-h-[52px] border-b border-border/50 last:border-0',
                isActive ? 'text-brand bg-brand-light' : 'text-foreground hover:bg-cardbg'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 flex pb-[env(safe-area-inset-bottom)]">
        {mainItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn('flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] justify-center relative', isActive ? 'text-brand' : 'text-muted-foreground')}>
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.badge > 0 && <span className="absolute -top-1.5 -right-2 bg-brand text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center leading-tight">{item.badge}</span>}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMehrOpen(!mehrOpen)}
          className={cn('flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] justify-center', mehrOpen ? 'text-brand' : 'text-muted-foreground')}
        >
          {mehrOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </nav>
    </>
  );
}