import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FolderKanban, Phone, CheckSquare, Wallet, Settings, Users, Clock, Calendar, CalendarDays, Euro, BarChart3, FileText, Car, Shield, UserCog, Printer, LayoutTemplate, HardDrive, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useTodayEventCount } from '@/lib/useTodayEventCount';

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const todayCount = useTodayEventCount();
  const [collapsed, setCollapsed] = useState({ System: true });

  const toggle = (title) => setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  const adminSections = [
    {
      title: 'Schnellzugriff', collapsible: false,
      items: [
        { to: '/', label: 'Dashboard', icon: Home },
        { to: '/projekte', label: 'Projekte', icon: FolderKanban },
        { to: '/kalender', label: 'Kalender', icon: CalendarDays, badge: todayCount },
      ],
    },
    {
      title: 'Verwaltung', collapsible: true,
      items: [
        { to: '/kontakte', label: 'Kontakte', icon: Users },
        { to: '/angebote', label: 'Angebote', icon: FileText },
        { to: '/vertraege', label: 'Verträge', icon: Shield },
        { to: '/mitarbeiter', label: 'Mitarbeiter', icon: UserCog },
      ],
    },
    {
      title: 'Zeit & Geld', collapsible: true,
      items: [
        { to: '/zeiten', label: 'Zeiterfassung', icon: Clock },
        { to: '/abrechnung', label: 'Abrechnung', icon: Euro },
        { to: '/finanzen', label: 'Finanzen', icon: Wallet },
        { to: '/kapazitaet', label: 'Kapazität & Planung', icon: BarChart3 },
      ],
    },
    {
      title: 'Operativ', collapsible: true,
      items: [
        { to: '/telefon', label: 'Telefonnotizen', icon: Phone },
        { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare },
        { to: '/fahrten', label: 'Fahrtenliste', icon: Car },
        { to: '/druckauftraege', label: 'Druckaufträge', icon: Printer },
      ],
    },
    {
      title: 'System', collapsible: true,
      items: [
        { to: '/vorlagen', label: 'Vorlagen', icon: LayoutTemplate },
        { to: '/nas-sync', label: 'NAS Sync', icon: HardDrive },
        { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
      ],
    },
  ];

  const userSections = [
    {
      title: 'Schnellzugriff', collapsible: false,
      items: [
        { to: '/', label: 'Heute', icon: Home },
        { to: '/projekte', label: 'Projekte', icon: FolderKanban },
        { to: '/wochenuebersicht', label: 'Wochenübersicht', icon: Calendar },
        { to: '/kalender', label: 'Kalender', icon: CalendarDays, badge: todayCount },
      ],
    },
    {
      title: 'Verwaltung', collapsible: true,
      items: [
        { to: '/kontakte', label: 'Kontakte', icon: Users },
        { to: '/angebote', label: 'Angebote', icon: FileText },
        { to: '/vertraege', label: 'Verträge', icon: Shield },
        { to: '/mitarbeiter', label: 'Mitarbeiter', icon: UserCog },
      ],
    },
    {
      title: 'Zeit & Geld', collapsible: true,
      items: [
        { to: '/zeiten', label: 'Zeiterfassung', icon: Clock },
        { to: '/abrechnung', label: 'Abrechnung', icon: Euro },
        { to: '/finanzen', label: 'Finanzen', icon: Wallet },
        { to: '/kapazitaet', label: 'Kapazität & Planung', icon: BarChart3 },
      ],
    },
    {
      title: 'Operativ', collapsible: true,
      items: [
        { to: '/telefon', label: 'Telefonnotizen', icon: Phone },
        { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare },
        { to: '/fahrten', label: 'Fahrtenliste', icon: Car },
        { to: '/druckauftraege', label: 'Druckaufträge', icon: Printer },
      ],
    },
    {
      title: 'System', collapsible: true,
      items: [
        { to: '/vorlagen', label: 'Vorlagen', icon: LayoutTemplate },
        { to: '/nas-sync', label: 'NAS Sync', icon: HardDrive },
      ],
    },
  ];

  const sections = isAdmin ? adminSections : userSections;

  const renderItem = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
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
        {sections.map((section) => {
          const isCollapsed = collapsed[section.title];
          const isCollapsible = section.collapsible;
          return (
            <div key={section.title} className="mb-1">
              {isCollapsible ? (
                <button
                  onClick={() => toggle(section.title)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                >
                  {section.title}
                  <ChevronDown
                    className={cn('w-4 h-4 transition-transform duration-200', isCollapsed && 'rotate-180')}
                  />
                </button>
              ) : (
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
              )}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  isCollapsed ? 'max-h-0' : 'max-h-[500px]'
                )}
              >
                <div className="space-y-0.5">{section.items.map(renderItem)}</div>
              </div>
            </div>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{isAdmin ? 'Admin' : 'Nutzerin'}</p>
      </div>
    </aside>
  );
}