import { NavLink } from 'react-router-dom';
import { Home, FolderKanban, Phone, CheckSquare, Wallet, Settings, Users, Clock, Calendar, CalendarDays, Euro, BarChart3, FileText, Car, Shield, UserCog, Printer } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useTodayEventCount } from '@/lib/useTodayEventCount';

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const todayCount = useTodayEventCount();
  const items = isAdmin ? [
    { to: '/projekte', label: 'Projekte', icon: FolderKanban },
    { to: '/kalender', label: 'Kalender', icon: CalendarDays, badge: todayCount },
    { to: '/abrechnung', label: 'Abrechnung', icon: Euro },
    { to: '/kapazitaet', label: 'Kapazität & Planung', icon: BarChart3 },
    { to: '/telefon', label: 'Telefonnotizen', icon: Phone },
    { to: '/kontakte', label: 'Kontakte', icon: Users },
    { to: '/zeiten', label: 'Zeiterfassung', icon: Clock },
    { to: '/finanzen', label: 'Finanzen', icon: Wallet },
    { to: '/angebote', label: 'Angebote', icon: FileText },
    { to: '/fahrten', label: 'Fahrtenliste', icon: Car },
    { to: '/vertraege', label: 'Verträge', icon: Shield },
    { to: '/mitarbeiter', label: 'Mitarbeiter', icon: UserCog },
    { to: '/druckauftraege', label: 'Druckaufträge', icon: Printer },
    { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
  ] : [
    { to: '/', label: 'Heute', icon: Home },
    { to: '/projekte', label: 'Projekte', icon: FolderKanban },
    { to: '/wochenuebersicht', label: 'Wochenübersicht', icon: Calendar },
    { to: '/kalender', label: 'Kalender', icon: CalendarDays, badge: todayCount },
    { to: '/abrechnung', label: 'Abrechnung', icon: Euro },
    { to: '/kapazitaet', label: 'Kapazität & Planung', icon: BarChart3 },
    { to: '/telefon', label: 'Telefonnotizen', icon: Phone },
    { to: '/kontakte', label: 'Kontakte', icon: Users },
    { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare },
    { to: '/zeiten', label: 'Zeiterfassung', icon: Clock },
    { to: '/finanzen', label: 'Finanzen', icon: Wallet },
    { to: '/angebote', label: 'Angebote', icon: FileText },
    { to: '/fahrten', label: 'Fahrtenliste', icon: Car },
    { to: '/vertraege', label: 'Verträge', icon: Shield },
    { to: '/mitarbeiter', label: 'Mitarbeiter', icon: UserCog },
    { to: '/druckauftraege', label: 'Druckaufträge', icon: Printer },
  ];
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-border h-screen sticky top-0 shrink-0">
      <div className="p-6"><div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0"><span className="text-white font-bold">S</span></div><div><p className="font-semibold text-foreground text-sm leading-tight">Sandra's Büro</p><p className="text-xs text-muted-foreground">Bauplanung</p></div></div></div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">{items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[48px]', isActive ? 'bg-brand-light text-brand-dark' : 'text-muted-foreground hover:bg-cardbg hover:text-foreground')}>
          <item.icon className="w-5 h-5 shrink-0" />
          {item.label}
          {item.badge > 0 && (
            <span className="ml-auto bg-brand text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
          )}
        </NavLink>
      ))}</nav>
      <div className="p-4 border-t border-border"><p className="text-xs text-muted-foreground truncate">{user?.email}</p><p className="text-xs text-muted-foreground mt-0.5">{isAdmin ? 'Admin' : 'Nutzerin'}</p></div>
    </aside>
  );
}