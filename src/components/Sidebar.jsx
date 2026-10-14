import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FolderKanban, Clock, CheckSquare, ChevronDown, CalendarDays, Phone, Car, Euro, Wallet, BarChart3, FileText, Users, UserCog, Printer, LayoutTemplate, HardDrive, Settings, Shield, FileSpreadsheet, Calendar, Bot } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useMyTaskCount } from '@/lib/useMyTaskCount';
import { useElara } from '@/lib/ElaraContext';

export default function Sidebar() {
  const { user } = useAuth();
  const myTaskCount = useMyTaskCount();
  const [mehrOpen, setMehrOpen] = useState(false);
  const { openElara } = useElara();

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
    { to: '/kapazitaet', label: 'Kapazität & Planung', icon: BarChart3 },
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

  const renderItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]',
          isActive ? 'bg-brand-light text-brand-dark' : 'text-muted-foreground hover:bg-cardbg hover:text-foreground'
        )
      }
    >
      <item.icon className="w-5 h-5 shrink-0" />
      {item.label}
      {item.badge > 0 && (
        <span className="ml-auto bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {item.badge}
        </span>
      )}
    </NavLink>
  );

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border h-screen sticky top-0 shrink-0">
      <div className="p-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0">
            <span className="text-white font-bold">S</span>
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm leading-tight">Sandra's Büro</p>
            <p className="text-xs text-muted-foreground">Bauplanung</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 overflow-y-auto pb-4">
        <div className="space-y-0.5">{mainItems.map(renderItem)}</div>
        <div className="mt-4">
          <button
            onClick={() => setMehrOpen(!mehrOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
          >
            Mehr
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', mehrOpen && 'rotate-180')} />
          </button>
          <div className={cn('overflow-hidden transition-all duration-200', mehrOpen ? 'max-h-[800px]' : 'max-h-0')}>
            <div className="space-y-0.5">{mehrItems.map(renderItem)}</div>
          </div>
        </div>
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={openElara}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-cardbg hover:text-foreground transition-colors w-full min-h-[44px]"
        >
          <Bot className="w-5 h-5 shrink-0 text-brand" />
          <span>Elara fragen…</span>
        </button>
        <p className="text-xs text-muted-foreground truncate px-3">{user?.email}</p>
      </div>
    </aside>
  );
}