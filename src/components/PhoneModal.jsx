import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';

export default function PhoneModal({ open, onOpenChange }) {
  const [projekte, setProjekte] = useState([]);
  const [kontakte, setKontakte] = useState([]);
  const [form, setForm] = useState({ kontakt_id: '', kontakt_name: '', projekt_id: '', besprochen: '', naechster_schritt: '', termin: '', als_aufgabe: false, typ: 'Eingehend' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([base44.entities.Projekt.filter({ status: 'Aktiv' }).catch(() => []), base44.entities.Kontakt.list('-name', 200).catch(() => [])]).then(([p, k]) => { setProjekte(p); setKontakte(k); });
      setForm({ kontakt_id: '', kontakt_name: '', projekt_id: '', besprochen: '', naechster_schritt: '', termin: '', als_aufgabe: false, typ: 'Eingehend' });
    }
  }, [open]);

  const onKontaktSelect = (kid) => { const k = kontakte.find((x) => x.id === kid); setForm({ ...form, kontakt_id: kid, kontakt_name: k?.name || '' }); };

  const handleSave = async () => {
    if (!form.kontakt_name.trim() && !form.kontakt_id) return;
    setSaving(true);
    try {
      await base44.entities.Telefonnotiz.create({ kontakt_id: form.kontakt_id || undefined, kontakt_name: form.kontakt_name, projekt_id: form.projekt_id || undefined, besprochen: form.besprochen, naechster_schritt: form.naechster_schritt, termin: form.termin || undefined, datum: new Date().toISOString(), typ: form.typ, als_aufgabe_angelegt: form.als_aufgabe });
      if (form.kontakt_id) await base44.entities.Kontakt.update(form.kontakt_id, { letzter_kontakt: todayISO() });
      if (form.als_aufgabe && form.naechster_schritt.trim()) await base44.entities.Aufgabe.create({ titel: form.naechster_schritt, projekt_id: form.projekt_id || undefined, prioritaet: 'B', faellig_am: form.termin || undefined, status: 'Offen', erledigt: false });
      toast.success('Telefonat notiert'); onOpenChange(false);
    } catch (e) { toast.error('Fehler beim Speichern'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2">📞 Telefonat notieren</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kontakt</Label><Select value={form.kontakt_id} onValueChange={onKontaktSelect}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Kontakt wählen" /></SelectTrigger><SelectContent>{kontakte.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}{k.firma && ` · ${k.firma}`}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>oder Name *</Label><Input value={form.kontakt_name} onChange={(e) => setForm({ ...form, kontakt_name: e.target.value })} placeholder="Name" className="min-h-[48px]" /></div>
          </div>
          <div><Label>Projekt (optional)</Label><Select value={form.projekt_id} onValueChange={(v) => setForm({ ...form, projekt_id: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt wählen" /></SelectTrigger><SelectContent>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Besprochen</Label><Textarea value={form.besprochen} onChange={(e) => setForm({ ...form, besprochen: e.target.value })} rows={3} placeholder="Worum ging es?" /></div>
          <div><Label>Nächster Schritt</Label><Textarea value={form.naechster_schritt} onChange={(e) => setForm({ ...form, naechster_schritt: e.target.value })} rows={2} placeholder="Was ist zu tun?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Termin?</Label><Input type="date" value={form.termin} onChange={(e) => setForm({ ...form, termin: e.target.value })} className="min-h-[48px]" /></div>
            <div><Label>Typ</Label><Select value={form.typ} onValueChange={(v) => setForm({ ...form, typ: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Eingehend">Eingehend</SelectItem><SelectItem value="Ausgehend">Ausgehend</SelectItem></SelectContent></Select></div>
          </div>
          <div className="flex items-center justify-between p-3 bg-cardbg rounded-xl"><Label className="cursor-pointer">Als Aufgabe anlegen</Label><Switch checked={form.als_aufgabe} onCheckedChange={(v) => setForm({ ...form, als_aufgabe: v })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[48px]">Abbrechen</Button><Button onClick={handleSave} disabled={(!form.kontakt_name.trim() && !form.kontakt_id) || saving} className="min-h-[48px] bg-accent hover:bg-accent-dark text-white">{saving ? 'Speichert...' : 'Speichern'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}