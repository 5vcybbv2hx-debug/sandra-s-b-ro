import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function QuickTaskModal({ open, onOpenChange }) {
  const [titel, setTitel] = useState('');
  const [prioritaet, setPrioritaet] = useState('B');
  const [projekt_id, setProjektId] = useState('');
  const [projekte, setProjekte] = useState([]);
  const [saving, setSaving] = useState(false);
  const [faelligAm, setFaelligAm] = useState('');
  const [allEvents, setAllEvents] = useState([]);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => { if (open) { base44.entities.Projekt.filter({ status: 'Aktiv' }, '-updated_date', 50).then(setProjekte).catch(() => {}); base44.entities.KalenderEvent.list('-start_datetime', 200).then(setAllEvents).catch(() => {}); setTitel(''); setPrioritaet('B'); setProjektId(''); setFaelligAm(''); } }, [open]);

  useEffect(() => {
    if (!faelligAm) { setEventCount(0); return; }
    const target = new Date(faelligAm);
    const count = allEvents.filter(e => {
      if (!e.start_datetime || e.sync_status === 'deleted_outlook') return false;
      const d = new Date(e.start_datetime);
      return d.getDate() === target.getDate() && d.getMonth() === target.getMonth() && d.getFullYear() === target.getFullYear();
    }).length;
    setEventCount(count);
  }, [faelligAm, allEvents]);

  const handleSave = async () => {
    if (!titel.trim()) return;
    setSaving(true);
    try { await base44.entities.Aufgabe.create({ titel, prioritaet, projekt_id: projekt_id || undefined, faellig_am: faelligAm || undefined, erledigt: false }); toast.success('Aufgabe angelegt'); onOpenChange(false); }
    catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>✅ Neue Aufgabe</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Titel</Label><Input value={titel} onChange={(e) => setTitel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="min-h-[48px]" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Priorität</Label><Select value={prioritaet} onValueChange={setPrioritaet}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A — Heute</SelectItem><SelectItem value="B">B — Woche</SelectItem><SelectItem value="C">C — Wenn Zeit</SelectItem></SelectContent></Select></div>
            <div><Label>Projekt</Label><Select value={projekt_id || '_none'} onValueChange={(v) => setProjektId(v === '_none' ? '' : v)}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Kein Projekt" /></SelectTrigger><SelectContent><SelectItem value="_none">Kein Projekt</SelectItem>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Fällig am (optional)</Label><Input type="date" value={faelligAm} onChange={(e) => setFaelligAm(e.target.value)} className="min-h-[48px]" /></div>
          {eventCount >= 3 && <p className="text-xs text-amber-600">⚠ An diesem Tag hast du bereits {eventCount} Termine</p>}
        </div>
        <DialogFooter><Button onClick={handleSave} disabled={!titel.trim() || saving} className="min-h-[48px] w-full bg-brand hover:bg-brand-dark text-white">{saving ? 'Speichert...' : 'Speichern'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}