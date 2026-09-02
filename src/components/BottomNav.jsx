import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FolderKanban, CalendarDays, Clock, MoreHorizontal, Settings, CheckSquare, Car, Phone, Users, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useTodayEventCount } from '@/lib/useTodayEventCount';

export default function BottomNav() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const todayCount = useTodayEventCount();
  const [mehrOpen, setMehrOpen] = useState(false);

  const adminItems = [
    { to: '/projekte', label: 'Projekte', icon: FolderKanban },
    { to: '/kalender', label: 'Kalender', icon: CalendarDays, badge: todayCount },
    { to: '/abrechnung', label: 'Abrechnung', icon: BarChart3 },
    { to: '/telefon', label: 'Telefon', icon: Phone },
    { to: '/einstellungen', label: 'Einstell.', icon: Settings },
  ];

  const sandraItems = [
    { to: '/', label: 'Heute', icon: Home, end: true },
    { to: '/zeiten', label: 'Zeiten', icon: Clock },
    { to: '/projekte', label: 'Projekte', icon: FolderKanban },
    { to: '/kalender', label: 'Kalender', icon: CalendarDays, badge: todayCount },
  ];

  const mehrItems = [
    { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare },
    { to: '/fahrten', label: 'Fahrten', icon: Car },
    { to: '/telefon', label: 'Telefon', icon: Phone },
    { to: '/kontakte', label: 'Kontakte', icon: Users },
    { to: '/angebote', label: 'Angebote', icon: FileText },
    { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
  ];

  if (isAdmin) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 flex pb-[env(safe-area-inset-bottom)]">
        {adminItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn('flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] justify-center relative', isActive ? 'text-brand' : 'text-muted-foreground')}>
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {item.badge > 0 && <span className="absolute -top-1.5 -right-2 bg-brand text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center leading-tight">{item.badge}</span>}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <>
      {mehrOpen && <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMehrOpen(false)} />}
      {mehrOpen && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
          {mehrItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
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
        {sandraItems.map((item) => (
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
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mehr</span>
        </button>
      </nav>
    </>
  );
}
