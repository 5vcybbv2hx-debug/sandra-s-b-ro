import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AnsprechpartnerModal({ open, onClose, onCreated, editPerson, presetFirmaId }) {
  const [form, setForm] = useState({ vorname: '', nachname: '', firma_id: '', rolle: '', telefon: '', mobil: '', email: '', bevorzugter_kontaktweg: 'Telefon', notizen: '' });
  const [firmen, setFirmen] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Firma.list('-firmenname', 200).then(setFirmen).catch(() => {});
      setForm(editPerson || { vorname: '', nachname: '', firma_id: presetFirmaId || '', rolle: '', telefon: '', mobil: '', email: '', bevorzugter_kontaktweg: 'Telefon', notizen: '' });
    }
  }, [open, editPerson, presetFirmaId]);

  const handleSave = async () => {
    if (!form.vorname.trim() || !form.nachname.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, firma_id: form.firma_id || undefined };
      if (editPerson) { await base44.entities.Ansprechpartner.update(editPerson.id, payload); toast.success('Person aktualisiert'); }
      else { await base44.entities.Ansprechpartner.create(payload); toast.success('Person erstellt'); }
      onCreated(); onClose();
    } catch (e) { toast.error('Fehler beim Speichern'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editPerson ? 'Person bearbeiten' : 'Neuer Ansprechpartner'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vorname *</Label><Input value={form.vorname} onChange={(e) => setForm({ ...form, vorname: e.target.value })} className="min-h-[48px]" autoFocus /></div>
            <div><Label>Nachname *</Label><Input value={form.nachname} onChange={(e) => setForm({ ...form, nachname: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Firma</Label><Select value={form.firma_id || '_none'} onValueChange={(v) => setForm({ ...form, firma_id: v === '_none' ? '' : v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Keine Firma (Privatperson)" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine Firma (Privatperson)</SelectItem>{firmen.map((f) => <SelectItem key={f.id} value={f.id}>{f.firmenname}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Rolle</Label><Input value={form.rolle} onChange={(e) => setForm({ ...form, rolle: e.target.value })} placeholder="z.B. Projektleiter" className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefon</Label><Input value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })} className="min-h-[48px]" /></div>
            <div><Label>Mobil</Label><Input value={form.mobil} onChange={(e) => setForm({ ...form, mobil: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>E-Mail</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="min-h-[48px]" /></div>
            <div><Label>Bevorzugter Kontaktweg</Label><Select value={form.bevorzugter_kontaktweg} onValueChange={(v) => setForm({ ...form, bevorzugter_kontaktweg: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Telefon">Telefon</SelectItem><SelectItem value="E-Mail">E-Mail</SelectItem><SelectItem value="WhatsApp">WhatsApp</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Notizen</Label><Textarea value={form.notizen} onChange={(e) => setForm({ ...form, notizen: e.target.value })} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button>
          <Button onClick={handleSave} disabled={!form.vorname.trim() || !form.nachname.trim() || saving} className="min-h-[48px] bg-accent hover:bg-accent-dark text-white">{saving ? 'Speichert...' : 'Speichern'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}