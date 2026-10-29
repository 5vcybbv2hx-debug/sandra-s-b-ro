import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { BEREICHE, PRIORITAETEN, STATUS } from './wunschConstants';

export default function WunschEditModal({ wunsch, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(wunsch ? { ...wunsch } : null); }, [wunsch]);

  if (!wunsch || !form) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.titel?.trim()) { toast.error('Titel ist erforderlich'); return; }
    setSaving(true);
    try {
      await base44.entities.Aenderungswunsch.update(wunsch.id, {
        titel: form.titel.trim(),
        beschreibung: form.beschreibung || '',
        bereich: form.bereich || 'Sonstiges',
        prioritaet: form.prioritaet || 'Normal',
        status: form.status || 'Neu',
        eingereicht_von: form.eingereicht_von || '',
        quelle: form.quelle || '',
        datum: form.datum || '',
      });
      toast.success('Wunsch aktualisiert');
      onSaved();
      onClose();
    } catch { toast.error('Speichern fehlgeschlagen'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!wunsch} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Wunsch bearbeiten</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Titel *</Label><Input value={form.titel || ''} onChange={e => set('titel', e.target.value)} /></div>
          <div><Label>Beschreibung</Label><Textarea rows={3} value={form.beschreibung || ''} onChange={e => set('beschreibung', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bereich</Label>
              <Select value={form.bereich || 'Sonstiges'} onValueChange={v => set('bereich', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BEREICHE.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorität</Label>
              <Select value={form.prioritaet || 'Normal'} onValueChange={v => set('prioritaet', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITAETEN.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || 'Neu'} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Datum</Label><Input type="date" value={form.datum || ''} onChange={e => set('datum', e.target.value)} /></div>
            <div><Label>Eingereicht von</Label><Input value={form.eingereicht_von || ''} onChange={e => set('eingereicht_von', e.target.value)} /></div>
            <div><Label>Quelle</Label><Input value={form.quelle || ''} onChange={e => set('quelle', e.target.value)} placeholder="App, Elara, WhatsApp" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={save} disabled={saving} className="bg-brand hover:bg-brand/90 text-white gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}