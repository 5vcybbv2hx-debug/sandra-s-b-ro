import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, Clock, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { getWeeklyCapacity } from '@/lib/settings';

export default function Morgenroutine({ onComplete }) {
  const [step, setStep] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [t, p, zeiten] = await Promise.all([base44.entities.Aufgabe.filter({ erledigt: false }), base44.entities.Projekt.filter({ status: 'Aktiv' }, '-deadline', 50), base44.entities.Zeiteintrag.list('-datum', 500)]);
      setTasks(t.filter((x) => x.prioritaet === 'A'));
      const now = new Date(); const dayOfWeek = (now.getDay() + 6) % 7; const sunday = new Date(now); sunday.setDate(now.getDate() - dayOfWeek + 6); sunday.setHours(23, 59, 59, 999);
      setProjekte(p.filter((pr) => pr.deadline && new Date(pr.deadline) <= sunday));
      const weekEntries = zeiten.filter((e) => { if (!e.datum) return false; const d = new Date(e.datum); const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek); monday.setHours(0, 0, 0, 0); return d >= monday; });
      setWeekHours(weekEntries.reduce((s, e) => s + (e.stunden || 0), 0));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const [weekHours, setWeekHours] = useState(0);
  const capacity = getWeeklyCapacity();
  const utilization = capacity > 0 ? (weekHours / capacity) * 100 : 0;

  const toggleTask = (id) => setSelectedTasks((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev);

  const finish = async () => {
    try { if (selectedTasks.length > 0) await base44.entities.Aufgabe.bulkUpdate(selectedTasks.map((id) => ({ id, heute_fokussiert: true }))); } catch (e) { console.error(e); }
    localStorage.setItem('sandra_morgenroutine', new Date().toISOString().split('T')[0]);
    onComplete();
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl py-8">
        <AnimatePresence mode="wait">
          {step === 0 && (<motion.div key="greeting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center"><p className="text-6xl mb-4">☀️</p><h1 className="text-3xl font-bold mb-2">Guten Morgen, Sandra</h1><p className="text-lg text-muted-foreground mb-8 capitalize">{dateStr}</p><Button size="lg" className="bg-brand hover:bg-brand-dark text-white min-h-[52px] px-10 text-base" onClick={() => setStep(1)}>Tag starten</Button></motion.div>)}
          {step === 1 && (<motion.div key="focus" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}><h2 className="text-2xl font-bold mb-1">Fokus setzen</h2><p className="text-muted-foreground mb-6">Wähle max. 3 A-Aufgaben für heute ({selectedTasks.length}/3)</p>{loading ? <p className="text-muted-foreground text-center py-8">Lade...</p> : <div className="space-y-2 max-h-[40vh] overflow-y-auto">{tasks.map((task) => (<button key={task.id} onClick={() => toggleTask(task.id)} className={cn('w-full text-left p-4 rounded-xl border-2 transition-colors min-h-[48px]', selectedTasks.includes(task.id) ? 'border-brand bg-brand-light' : 'border-border hover:border-brand/50')}><div className="flex items-center gap-3"><div className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0', selectedTasks.includes(task.id) ? 'bg-brand border-brand' : 'border-border')}>{selectedTasks.includes(task.id) && <Check className="w-4 h-4 text-white" />}</div><span className="font-medium">{task.titel}</span></div></button>))}{tasks.length === 0 && <p className="text-muted-foreground text-center py-8">Keine A-Aufgaben offen. 🎉</p>}</div>}<div className="flex justify-between mt-6"><Button variant="outline" onClick={() => setStep(0)} className="min-h-[48px]">Zurück</Button><Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setStep(2)}>Weiter</Button></div></motion.div>)}
          {step === 2 && (<motion.div key="overview" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}><h2 className="text-2xl font-bold mb-1">Überblick</h2><p className="text-muted-foreground mb-6">Deadlines diese Woche & Auslastung</p><div className="space-y-3 mb-4"><div className="p-4 bg-cardbg rounded-xl"><div className="flex items-center justify-between mb-2"><span className="font-medium">Wochenauslastung</span><span className={cn('text-sm font-medium', utilization >= 100 ? 'text-red-500' : utilization >= 80 ? 'text-amber-500' : 'text-status-abgeschlossen')}>{weekHours.toFixed(1)} / {capacity} h</span></div><div className="w-full bg-white rounded-full h-3 overflow-hidden"><div className={cn('h-full rounded-full', utilization >= 100 ? 'bg-red-500' : utilization >= 80 ? 'bg-amber-500' : 'bg-status-abgeschlossen')} style={{ width: `${Math.min(100, utilization)}%` }} /></div></div></div><div className="space-y-2 max-h-[30vh] overflow-y-auto">{projekte.map((p) => { const days = Math.ceil((new Date(p.deadline) - today) / 86400000); return (<div key={p.id} className={cn('flex items-center gap-3 p-3 rounded-xl min-h-[48px]', days <= 2 ? 'bg-red-50' : 'bg-cardbg')}><AlertTriangle className={cn('w-4 h-4 shrink-0', days <= 2 ? 'text-red-500' : 'text-amber-500')} /><div className="flex-1 min-w-0"><p className="font-medium truncate">{p.projekt_name}</p><p className="text-xs text-muted-foreground">{formatDate(p.deadline)} · {days <= 0 ? 'überfällig' : `in ${days} Tagen`}</p></div></div>); })}{projekte.length === 0 && <p className="text-muted-foreground text-center py-4">Keine Deadlines diese Woche.</p>}</div><div className="flex justify-between mt-6"><Button variant="outline" onClick={() => setStep(1)} className="min-h-[48px]">Zurück</Button><Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setStep(3)}>Weiter</Button></div></motion.div>)}
          {step === 3 && (<motion.div key="start" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center"><p className="text-6xl mb-4">🚀</p><h1 className="text-3xl font-bold mb-2">Guten Start!</h1><p className="text-lg text-muted-foreground mb-8">{selectedTasks.length} Aufgabe{selectedTasks.length !== 1 ? 'n' : ''} fokussiert</p><Button size="lg" className="bg-brand hover:bg-brand-dark text-white min-h-[52px] px-10 text-base" onClick={finish}>Los geht's</Button></motion.div>)}
        </AnimatePresence>
      </div>
    </div>
  );
}