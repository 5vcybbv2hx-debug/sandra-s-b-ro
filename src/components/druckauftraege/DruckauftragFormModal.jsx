import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';

const FORMATE = ['A4', 'A3', 'A2', 'A1', 'A0'];
const ARTEN = ['S/W', 'Farbig', 'Plot'];

export default function DruckauftragFormModal({ onClose, onSaved, editItem, projekte }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projekt_id: '', datum: todayISO(), format: 'A4', exemplare: 1, art: 'S/W', notiz: '',
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        projekt_id: editItem.projekt_id || '', datum: editItem.datum || todayISO(),
        format: editItem.format || 'A4', exemplare: editItem.exemplare || 1,
        art: editItem.art || 'S/W', notiz: editItem.notiz || '',
      });
    }
  }, [editItem]);

  const handleSubmit = async () => {
    if (!form.projekt_id) { toast.error('Projekt ist erforderlich'); return; }
    setSaving(true);
    try {
      const payload = { ...form, exemplare: Number(form.exemplare) || 1 };
      if (editItem) {
        await base44.entities.Druckauftrag.update(editItem.id, payload);
        toast.success('Aktualisiert');
      } else {
        await base44.entities.Druckauftrag.create(payload);
        toast.success('Erstellt');
      }
      onSaved(); onClose();
    } catch { toast.error('Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editItem ? 'Bearbeiten' : 'Neuer Druckauftrag'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Projekt *</Label>
            <Select value={form.projekt_id || '_none'} onValueChange={v => setForm(f => ({ ...f, projekt_id: v === '_none' ? '' : v }))}>
              <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt wählen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Kein Projekt</SelectItem>
                {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Datum</Label><Input type="date" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} className="min-h-[48px]" /></div>
            <div><Label>Exemplare</Label><Input type="number" min="1" value={form.exemplare} onChange={e => setForm(f => ({ ...f, exemplare: e.target.value }))} className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Format</Label><Select value={form.format} onValueChange={v => setForm(f => ({ ...f, format: v }))}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{FORMATE.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Art</Label><Select value={form.art} onValueChange={v => setForm(f => ({ ...f, art: v }))}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{ARTEN.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Notiz</Label><Textarea value={form.notiz} onChange={e => setForm(f => ({ ...f, notiz: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving} className="min-h-[48px] bg-brand hover:bg-brand-dark text-white gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editItem ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}