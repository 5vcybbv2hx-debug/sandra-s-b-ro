import { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';
import FeierabendCheckModal from './FeierabendCheckModal';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';

export default function FeierabendFAB() {
  const [open, setOpen] = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const hour = new Date().getHours();
  const showBadge = hour >= 16 && !todayDone;

  useEffect(() => {
    base44.entities.FeierabendCheck.filter({ datum: todayISO() }).then(checks => { setTodayDone(checks.some(c => c.bewertung === 'erledigt')); }).catch(() => {});
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed top-4 right-4 md:right-6 z-40 w-11 h-11 rounded-full bg-white border border-border shadow-md hover:shadow-lg flex items-center justify-center transition-all" aria-label="Feierabend-Check">
        <Moon className="w-5 h-5 text-brand" />
        {showBadge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white" />}
      </button>
      <FeierabendCheckModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}