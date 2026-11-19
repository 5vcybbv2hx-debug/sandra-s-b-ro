import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PersonSelect from '@/components/zeiten/PersonSelect';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';

const LAST_PERSON_KEY = 'zeiten_letzte_person';
const lastPerson = () => (typeof localStorage !== 'undefined' && localStorage.getItem(LAST_PERSON_KEY)) || '';

export default function QuickTimeModal({ open, onOpenChange }) {
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [mitarbeiter_id, setMitarbeiterId] = useState(lastPerson());
  const [projekt_id, setProjektId] = useState('');
  const [stunden, setStunden] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [projekte, setProjekte] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Projekt.filter({ status: 'Aktiv' }, '-updated_date', 50).then(setProjekte).catch(() => {});
      base44.entities.Mitarbeiter.list('-name', 200).then(setMitarbeiter).catch(() => {});
      setMitarbeiterId(lastPerson());
      setProjektId('');
      setStunden('');
      setBeschreibung('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!mitarbeiter_id || !projekt_id || !stunden) return;
    setSaving(true);
    try {
      await base44.entities.Zeiteintrag.create({ mitarbeiter_id, projekt_id, datum: todayISO(), stunden: parseFloat(stunden), beschreibung: beschreibung || 'Manuell' });
      localStorage.setItem(LAST_PERSON_KEY, mitarbeiter_id);
      toast.success(`${stunden} h gebucht`);
      onOpenChange(false);
    }
    catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>⏱ Stunden buchen</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Person *</Label><PersonSelect mitarbeiter={mitarbeiter} value={mitarbeiter_id} onValueChange={setMitarbeiterId} placeholder="Person wählen" className="min-h-[48px]" /></div>
          <div><Label>Projekt *</Label><Select value={projekt_id} onValueChange={setProjektId}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt wählen" /></SelectTrigger><SelectContent>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Stunden *</Label><Input type="number" step="0.25" value={stunden} onChange={(e) => setStunden(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} placeholder="z.B. 2.5" className="min-h-[48px]" /></div>
          <div><Label>Beschreibung</Label><Input value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} placeholder="Was wurde gemacht?" className="min-h-[48px]" /></div>
        </div>
        <DialogFooter><Button onClick={handleSave} disabled={!mitarbeiter_id || !projekt_id || !stunden || saving} className="min-h-[48px] w-full bg-brand hover:bg-brand-dark text-white">{saving ? 'Speichert...' : 'Buchen'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}