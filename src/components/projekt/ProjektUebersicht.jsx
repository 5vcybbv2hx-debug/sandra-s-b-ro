import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const PHASES = ['Entwurf', 'Baugesuch', 'Werkplanung'];
const BAUVORHABEN = ['Einfamilienhaus', 'Doppelhaushälfte', 'Mehrfamilienhaus', 'Umbau', 'Anbau', 'Gewerbebau', 'Sonstiges'];

export default function ProjektUebersicht({ projekt, onUpdate }) {
  const [form, setForm] = useState({ ...projekt });
  const [kontakte, setKontakte] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { base44.entities.Kontakt.list('-name', 200).then(setKontakte).catch(() => {}); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Projekt.update(projekt.id, { ...form, stundensatz: Number(form.stundensatz) || 0, pauschalbetrag: Number(form.pauschalbetrag) || 0, gesamtbudget_stunden: Number(form.gesamtbudget_stunden) || 0 });
      toast.success('Gespeichert'); onUpdate();
    } catch (e) { toast.error('Fehler beim Speichern'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Stammdaten</h3>
        <div className="space-y-4">
          <div><Label>Projektname</Label><Input value={form.projekt_name || ''} onChange={(e) => setForm({ ...form, projekt_name: e.target.value })} className="min-h-[48px]" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kontakt</Label><Select value={form.kontakt_id || ''} onValueChange={(v) => setForm({ ...form, kontakt_id: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Kontakt wählen" /></SelectTrigger><SelectContent>{kontakte.map((k) => <SelectItem key={k.id} value={k.id}>{k.name}{k.firma && ` · ${k.firma}`}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Bauvorhaben</Label><Select value={form.bauvorhaben || ''} onValueChange={(v) => setForm({ ...form, bauvorhaben: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Wählen" /></SelectTrigger><SelectContent>{BAUVORHABEN.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Projektart</Label><Select value={form.projektart} onValueChange={(v) => setForm({ ...form, projektart: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{['Grundriss', 'Schnitt', 'Ansicht', 'Eingabeplanung', 'Genehmigungsplanung', 'Ausführungsplanung', 'Sonstiges'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{['Anfrage', 'Aktiv', 'Wartend', 'Abgeschlossen', 'Archiviert'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Phase</Label><Select value={form.phase || 'Entwurf'} onValueChange={(v) => setForm({ ...form, phase: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{PHASES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Abrechnungsart</Label><Select value={form.abrechnungsart} onValueChange={(v) => setForm({ ...form, abrechnungsart: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Stündlich">Stündlich</SelectItem><SelectItem value="Pauschal">Pauschal</SelectItem></SelectContent></Select></div>
            <div><Label>{form.abrechnungsart === 'Pauschal' ? 'Pauschalbetrag (€)' : 'Stundensatz (€/h)'}</Label><Input type="number" value={form.abrechnungsart === 'Pauschal' ? form.pauschalbetrag : form.stundensatz} onChange={(e) => setForm({ ...form, [form.abrechnungsart === 'Pauschal' ? 'pauschalbetrag' : 'stundensatz']: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Startdatum</Label><Input type="date" value={form.startdatum || ''} onChange={(e) => setForm({ ...form, startdatum: e.target.value })} className="min-h-[48px]" /></div><div><Label>Deadline</Label><Input type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="min-h-[48px]" /></div></div>
          <div><Label>Gesamtbudget Stunden</Label><Input type="number" value={form.gesamtbudget_stunden || 0} onChange={(e) => setForm({ ...form, gesamtbudget_stunden: e.target.value })} className="min-h-[48px]" /></div>
          <div><Label>Beschreibung</Label><Textarea value={form.beschreibung || ''} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} rows={3} /></div>
          <div><Label>Notizen</Label><Textarea value={form.notizen || ''} onChange={(e) => setForm({ ...form, notizen: e.target.value })} rows={2} /></div>
        </div>
      </Card>
      <Card className="p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Kontakt</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><div><Label>Kunde Name</Label><Input value={form.kunde_name || ''} onChange={(e) => setForm({ ...form, kunde_name: e.target.value })} className="min-h-[48px]" /></div><div><Label>Firma</Label><Input value={form.kunde_firma || ''} onChange={(e) => setForm({ ...form, kunde_firma: e.target.value })} className="min-h-[48px]" /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Telefon</Label><Input value={form.kunde_telefon || ''} onChange={(e) => setForm({ ...form, kunde_telefon: e.target.value })} className="min-h-[48px]" /></div><div><Label>E-Mail</Label><Input value={form.kunde_email || ''} onChange={(e) => setForm({ ...form, kunde_email: e.target.value })} className="min-h-[48px]" /></div></div>
        </div>
      </Card>
      <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full">{saving ? 'Speichert...' : 'Änderungen speichern'}</Button>
    </div>
  );
}