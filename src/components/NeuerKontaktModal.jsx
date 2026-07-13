import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function NeuerKontaktModal({ open, onClose, onCreated, editKontakt }) {
  const [form, setForm] = useState({ name: '', firma: '', rolle: 'Bauherr', telefon: '', email: '', adresse: '', notizen: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editKontakt || { name: '', firma: '', rolle: 'Bauherr', telefon: '', email: '', adresse: '', notizen: '' });
  }, [open, editKontakt]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editKontakt) { await base44.entities.Kontakt.update(editKontakt.id, form); toast.success('Aktualisiert'); }
      else { await base44.entities.Kontakt.create(form); toast.success('Kontakt erstellt'); }
      onCreated(); onClose();
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editKontakt ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="min-h-[48px]" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Firma</Label><Input value={form.firma} onChange={(e) => setForm({ ...form, firma: e.target.value })} className="min-h-[48px]" /></div>
            <div><Label>Rolle</Label><Select value={form.rolle} onValueChange={(v) => setForm({ ...form, rolle: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Bauherr">Bauherr</SelectItem><SelectItem value="Architekt">Architekt</SelectItem><SelectItem value="Bauträger">Bauträger</SelectItem><SelectItem value="Behörde">Behörde</SelectItem><SelectItem value="Sonstiges">Sonstiges</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefon</Label><Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} className="min-h-[48px]" /></div>
            <div><Label>E-Mail</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div><Label>Adresse</Label><Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="min-h-[48px]" /></div>
          <div><Label>Notizen</Label><Textarea value={form.notizen} onChange={(e) => setForm({ ...form, notizen: e.target.value })} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving} className="min-h-[48px] bg-brand hover:bg-brand-dark text-white">{saving ? 'Speichert...' : 'Speichern'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}