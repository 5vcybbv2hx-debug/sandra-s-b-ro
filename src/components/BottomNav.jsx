import { NavLink } from 'react-router-dom';
import { Home, FolderKanban, Phone, CheckSquare, Wallet, Settings, Users } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const items = isAdmin ? [
    { to: '/projekte', label: 'Projekte', icon: FolderKanban },
    { to: '/kontakte', label: 'Kontakte', icon: Users },
    { to: '/telefon', label: 'Telefon', icon: Phone },
    { to: '/finanzen', label: 'Finanzen', icon: Wallet },
    { to: '/einstellungen', label: 'Einst.', icon: Settings },
  ] : [
    { to: '/', label: 'Heute', icon: Home },
    { to: '/projekte', label: 'Projekte', icon: FolderKanban },
    { to: '/aufgaben', label: 'Aufgaben', icon: CheckSquare },
    { to: '/kontakte', label: 'Kontakte', icon: Users },
    { to: '/telefon', label: 'Telefon', icon: Phone },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40 flex pb-[env(safe-area-inset-bottom)]">
      {items.map((item) => (<NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => cn('flex-1 flex flex-col items-center gap-1 py-2 min-h-[56px] justify-center', isActive ? 'text-brand' : 'text-muted-foreground')}><item.icon className="w-5 h-5" /><span className="text-[10px] font-medium">{item.label}</span></NavLink>))}
    </nav>
  );
}