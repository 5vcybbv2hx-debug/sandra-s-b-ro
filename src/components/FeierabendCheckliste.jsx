import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = ['Alles dokumentiert', 'Morgen vorbereitet (Aufgaben gesetzt)', 'Zeiterfassung vollständig', 'Arbeitsplatz aufgeräumt'];

export default function FeierabendCheckliste({ open, onClose }) {
  const [checked, setChecked] = useState([false, false, false, false]);
  const allChecked = checked.every(Boolean);

  const toggle = (i) => setChecked((prev) => prev.map((v, idx) => idx === i ? !v : v));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-center">🌅 Feierabend-Checkliste</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {ITEMS.map((item, i) => (
            <button key={i} onClick={() => toggle(i)} className={cn('w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors min-h-[48px] text-left', checked[i] ? 'border-brand bg-brand-light' : 'border-border')}>
              <div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0', checked[i] ? 'bg-brand border-brand' : 'border-border')}>{checked[i] && <Check className="w-4 h-4 text-white" />}</div>
              <span className={cn('font-medium', checked[i] && 'text-brand-dark')}>{item}</span>
            </button>
          ))}
        </div>
        <DialogFooter><Button onClick={onClose} className={cn('min-h-[48px] w-full', allChecked ? 'bg-status-abgeschlossen hover:bg-green-600 text-white' : 'bg-brand hover:bg-brand-dark text-white')}>{allChecked ? 'Schönen Feierabend! 🎉' : 'Feierabend'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}