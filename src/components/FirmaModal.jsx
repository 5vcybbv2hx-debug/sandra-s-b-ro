import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const BRANCHEN = ['Architekturbüro', 'Bauträger', 'Bauunternehmen', 'Privatperson', 'Behörde', 'Sonstiges'];

export default function FirmaModal({ open, onClose, onCreated, editFirma }) {
  const [form, setForm] = useState({ name: '', branche: 'Sonstiges', adresse: '', telefon_zentrale: '', email_allgemein: '', notizen: '', aktiv: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(editFirma || { name: '', branche: 'Sonstiges', adresse: '', telefon_zentrale: '', email_allgemein: '', notizen: '', aktiv: true }); }, [open, editFirma]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editFirma) { await base44.entities.Firma.update(editFirma.id, form); toast.success('Firma aktualisiert'); }
      else { await base44.entities.Firma.create(form); toast.success('Firma erstellt'); }
      onCreated(); onClose();
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editFirma ? 'Firma bearbeiten' : 'Neue Firma'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="min-h-[48px]" autoFocus /></div>
          <div><Label>Branche</Label><Select value={form.branche} onValueChange={(v) => setForm({ ...form, branche: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{BRANCHEN.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Adresse</Label><Input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="min-h-[48px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefon Zentrale</Label><Input value={form.telefon_zentrale} onChange={(e) => setForm({ ...form, telefon_zentrale: e.target.value })} className="min-h-[48px]" /></div>
            <div><Label>E-Mail Allgemein</Label><Input value={form.email_allgemein} onChange={(e) => setForm({ ...form, email_allgemein: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div><Label>Notizen</Label><Textarea value={form.notizen} onChange={(e) => setForm({ ...form, notizen: e.target.value })} rows={3} /></div>
          <div className="flex items-center justify-between p-3 bg-cardbg rounded-xl"><Label className="cursor-pointer">Aktiv</Label><Switch checked={form.aktiv} onCheckedChange={(v) => setForm({ ...form, aktiv: v })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button><Button onClick={handleSave} disabled={!form.name.trim() || saving} className="min-h-[48px] bg-brand hover:bg-brand-dark text-white">{saving ? 'Speichert...' : 'Speichern'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';