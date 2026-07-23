import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PROJEKTARTEN = ['Wohnbau', 'Gewerbebau', 'Öffentliches Bauvorhaben', 'Umbau/Sanierung', 'Sonstiges'];

export default function VorlageFormModal({ onClose, onSaved, editItem }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', projektart: 'Sonstiges', standard_stundensatz: 0,
    geschaetzte_stunden_entwurf: 0, geschaetzte_stunden_baugesuch: 0,
    geschaetzte_stunden_werkplanung: 0, abrechnungsart: 'Stündlich', beschreibung: '',
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name || '', projektart: editItem.projektart || 'Sonstiges',
        standard_stundensatz: editItem.standard_stundensatz || 0,
        geschaetzte_stunden_entwurf: editItem.geschaetzte_stunden_entwurf || 0,
        geschaetzte_stunden_baugesuch: editItem.geschaetzte_stunden_baugesuch || 0,
        geschaetzte_stunden_werkplanung: editItem.geschaetzte_stunden_werkplanung || 0,
        abrechnungsart: editItem.abrechnungsart || 'Stündlich', beschreibung: editItem.beschreibung || '',
      });
    }
  }, [editItem]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Name ist erforderlich'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        standard_stundensatz: Number(form.standard_stundensatz) || 0,
        geschaetzte_stunden_entwurf: Number(form.geschaetzte_stunden_entwurf) || 0,
        geschaetzte_stunden_baugesuch: Number(form.geschaetzte_stunden_baugesuch) || 0,
        geschaetzte_stunden_werkplanung: Number(form.geschaetzte_stunden_werkplanung) || 0,
      };
      if (editItem) {
        await base44.entities.ProjektVorlage.update(editItem.id, payload);
        toast.success('Vorlage aktualisiert');
      } else {
        await base44.entities.ProjektVorlage.create(payload);
        toast.success('Vorlage erstellt');
      }
      onSaved(); onClose();
    } catch { toast.error('Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editItem ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="min-h-[48px]" autoFocus placeholder="z.B. Standard Wohnbau" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Projektart</Label><Select value={form.projektart} onValueChange={v => setForm(f => ({ ...f, projektart: v }))}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{PROJEKTARTEN.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Abrechnungsart</Label><Select value={form.abrechnungsart} onValueChange={v => setForm(f => ({ ...f, abrechnungsart: v }))}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Stündlich">Stündlich</SelectItem><SelectItem value="Pauschal">Pauschal</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Standard-Stundensatz (€)</Label><Input type="number" value={form.standard_stundensatz} onChange={e => setForm(f => ({ ...f, standard_stundensatz: e.target.value }))} className="min-h-[48px]" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>h Entwurf</Label><Input type="number" value={form.geschaetzte_stunden_entwurf} onChange={e => setForm(f => ({ ...f, geschaetzte_stunden_entwurf: e.target.value }))} className="min-h-[48px]" /></div>
            <div><Label>h Baugesuch</Label><Input type="number" value={form.geschaetzte_stunden_baugesuch} onChange={e => setForm(f => ({ ...f, geschaetzte_stunden_baugesuch: e.target.value }))} className="min-h-[48px]" /></div>
            <div><Label>h Werkplanung</Label><Input type="number" value={form.geschaetzte_stunden_werkplanung} onChange={e => setForm(f => ({ ...f, geschaetzte_stunden_werkplanung: e.target.value }))} className="min-h-[48px]" /></div>
          </div>
          <div><Label>Beschreibung</Label><Textarea value={form.beschreibung} onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))} rows={2} /></div>
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