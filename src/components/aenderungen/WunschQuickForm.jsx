import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { BEREICHE, PRIORITAETEN } from './wunschConstants';

const empty = { titel: '', beschreibung: '', bereich: 'Sonstiges', prioritaet: 'Normal', eingereicht_von: '' };

export default function WunschQuickForm({ defaultName, onCreated }) {
  const [form, setForm] = useState({ ...empty, eingereicht_von: defaultName || '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.titel.trim()) { toast.error('Titel ist erforderlich'); return; }
    setSaving(true);
    try {
      await base44.entities.Aenderungswunsch.create({
        titel: form.titel.trim(),
        beschreibung: form.beschreibung.trim(),
        bereich: form.bereich,
        prioritaet: form.prioritaet,
        eingereicht_von: form.eingereicht_von.trim(),
        status: 'Neu',
        quelle: 'App',
        datum: new Date().toISOString().slice(0, 10),
      });
      toast.success('Wunsch gespeichert');
      setForm({ ...empty, eingereicht_von: defaultName || '' });
      onCreated();
    } catch { toast.error('Speichern fehlgeschlagen'); }
    finally { setSaving(false); }
  };

  return (
    <Card className="p-4 md:p-5">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>Titel *</Label>
            <Input value={form.titel} onChange={e => set('titel', e.target.value)} placeholder="Was soll verbessert werden?" />
          </div>
          <div className="sm:col-span-2">
            <Label>Beschreibung</Label>
            <Textarea rows={2} value={form.beschreibung} onChange={e => set('beschreibung', e.target.value)} placeholder="Details, Beispiele, warum es wichtig ist" />
          </div>
          <div>
            <Label>Bereich</Label>
            <Select value={form.bereich} onValueChange={v => set('bereich', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BEREICHE.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priorität</Label>
            <Select value={form.prioritaet} onValueChange={v => set('prioritaet', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITAETEN.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Eingereicht von</Label>
            <Input value={form.eingereicht_von} onChange={e => set('eingereicht_von', e.target.value)} placeholder="Name" />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-brand hover:bg-brand/90 text-white gap-2 min-h-[44px]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Wunsch speichern
        </Button>
      </form>
    </Card>
  );
}