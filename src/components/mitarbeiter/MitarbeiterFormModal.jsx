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

export default function MitarbeiterFormModal({ onClose, onSaved, editItem }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', rolle: '', eintrittsdatum: '', austrittsdatum: '',
    status: 'Aktiv', telefon: '', email: '', stundensatz: 0, notizen: '',
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name || '', rolle: editItem.rolle || '',
        eintrittsdatum: editItem.eintrittsdatum || '', austrittsdatum: editItem.austrittsdatum || '',
        status: editItem.status || 'Aktiv', telefon: editItem.telefon || '',
        email: editItem.email || '', stundensatz: editItem.stundensatz || 0,
        notizen: editItem.notizen || '',
      });
    }
  }, [editItem]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Name ist erforderlich'); return; }
    setSaving(true);
    try {
      const payload = { ...form, stundensatz: Number(form.stundensatz) || 0 };
      if (editItem) {
        await base44.entities.Mitarbeiter.update(editItem.id, payload);
        toast.success('Aktualisiert');
      } else {
        await base44.entities.Mitarbeiter.create(payload);
        toast.success('Erstellt');
      }
      onSaved(); onClose();
    } catch { toast.error('Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editItem ? 'Bearbeiten' : 'Neuer Mitarbeiter'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="min-h-[48px]" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Rolle</Label><Input value={form.rolle} onChange={e => setForm(f => ({ ...f, rolle: e.target.value }))} placeholder="z.B. Bürohilfe" className="min-h-[48px]" /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Aktiv">Aktiv</SelectItem><SelectItem value="Inaktiv">Inaktiv</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Eintrittsdatum</Label><Input type="date" value={form.eintrittsdatum} onChange={e => setForm(f => ({ ...f, eintrittsdatum: e.target.value }))} className="min-h-[48px]" /></div>
            <div><Label>Austrittsdatum</Label><Input type="date" value={form.austrittsdatum} onChange={e => setForm(f => ({ ...f, austrittsdatum: e.target.value }))} className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefon</Label><Input value={form.telefon} onChange={e => setForm(f => ({ ...f, telefon: e.target.value }))} className="min-h-[48px]" /></div>
            <div><Label>E-Mail</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="min-h-[48px]" /></div>
          </div>
          <div><Label>Stundensatz (€)</Label><Input type="number" value={form.stundensatz} onChange={e => setForm(f => ({ ...f, stundensatz: e.target.value }))} className="min-h-[48px]" /></div>
          <div><Label>Notizen</Label><Textarea value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} rows={2} /></div>
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