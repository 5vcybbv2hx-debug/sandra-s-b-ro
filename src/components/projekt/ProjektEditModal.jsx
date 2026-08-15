import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const STATUS = ['Anfrage', 'Aktiv', 'Wartend', 'Abgeschlossen', 'Abgebrochen', 'Archiviert'];
const PROJEKTART = ['Wohnbau', 'Gewerbebau', 'Öffentliches Bauvorhaben', 'Umbau/Sanierung', 'Sonstiges'];

export default function ProjektEditModal({ open, onClose, onSaved, editProjekt }) {
  const [form, setForm] = useState({});
  const [firmen, setFirmen] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Firma.list('-name', 200).then(setFirmen).catch(() => {});
      setForm(editProjekt || {});
    }
  }, [open, editProjekt]);

  const handleSave = async () => {
    if (!form.projekt_name?.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Projekt.update(editProjekt.id, {
        projekt_name: form.projekt_name,
        firma_id: form.firma_id || undefined,
        status: form.status,
        projektart: form.projektart,
        stundensatz: form.stundensatz || 0,
        deadline: form.deadline || undefined,
        beschreibung: form.beschreibung || '',
      });
      toast.success('Projekt aktualisiert');
      onSaved(); onClose();
    } catch (e) { toast.error('Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Projekt bearbeiten</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Projektname *</Label><Input value={form.projekt_name || ''} onChange={e => setForm({ ...form, projekt_name: e.target.value })} className="min-h-[48px]" autoFocus /></div>
          <div><Label>Firma</Label><Select value={form.firma_id || '_none'} onValueChange={v => setForm({ ...form, firma_id: v === '_none' ? '' : v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Keine Firma" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine Firma</SelectItem>{firmen.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status || 'Anfrage'} onValueChange={v => setForm({ ...form, status: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Projektart</Label><Select value={form.projektart || 'Sonstiges'} onValueChange={v => setForm({ ...form, projektart: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{PROJEKTART.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Stundensatz (€/h)</Label><Input type="number" value={form.stundensatz ?? ''} onChange={e => setForm({ ...form, stundensatz: parseFloat(e.target.value) || 0 })} className="min-h-[48px]" /></div>
            <div><Label>Deadline</Label><Input type="date" value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div><Label>Beschreibung</Label><Textarea value={form.beschreibung || ''} onChange={e => setForm({ ...form, beschreibung: e.target.value })} rows={3} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button><Button onClick={handleSave} disabled={!form.projekt_name?.trim() || saving} className="min-h-[48px] bg-brand hover:bg-brand-dark text-white">{saving ? 'Speichert...' : 'Speichern'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}