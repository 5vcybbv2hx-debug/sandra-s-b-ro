import { useState } from 'react';
import { Plus, Phone, CheckSquare, Clock, X } from 'lucide-react';
import PhoneModal from './PhoneModal';
import QuickTaskModal from './QuickTaskModal';
import QuickTimeModal from './QuickTimeModal';
import { cn } from '@/lib/utils';

export default function QuickCaptureFAB() {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(null);

  const options = [
    { id: 'phone', label: 'Telefonnotiz', icon: Phone, color: 'bg-accent hover:bg-accent-dark' },
    { id: 'task', label: 'Aufgabe', icon: CheckSquare, color: 'bg-brand hover:bg-brand-dark' },
    { id: 'time', label: 'Stunden buchen', icon: Clock, color: 'bg-status-abgeschlossen hover:bg-green-600' },
  ];

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-3">
        {open && options.map((opt, i) => (
          <button key={opt.id} onClick={() => { setModal(opt.id); setOpen(false); }} className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ animationDelay: `${i * 50}ms` }}>
            <span className="bg-white shadow-md rounded-full px-4 py-2 text-sm font-medium text-foreground">{opt.label}</span>
            <div className={cn('w-12 h-12 rounded-full text-white shadow-lg flex items-center justify-center transition-all', opt.color)}><opt.icon className="w-5 h-5" /></div>
          </button>
        ))}
        <button onClick={() => setOpen(!open)} className={cn('w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95', open ? 'bg-foreground' : 'bg-brand hover:bg-brand-dark')} aria-label="Schnell-Erfassung">
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
      {modal === 'phone' && <PhoneModal open={true} onOpenChange={() => setModal(null)} />}
      {modal === 'task' && <QuickTaskModal open={true} onOpenChange={() => setModal(null)} />}
      {modal === 'time' && <QuickTimeModal open={true} onOpenChange={() => setModal(null)} />}
    </>
  );
}