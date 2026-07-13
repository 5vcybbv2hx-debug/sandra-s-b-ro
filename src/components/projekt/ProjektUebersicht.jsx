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
  const [firmen, setFirmen] = useState([]);
  const [ansprechpartner, setAnsprechpartner] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Firma.list('-firmenname', 200).then(setFirmen).catch(() => {});
    base44.entities.Ansprechpartner.list('-nachname', 200).then(setAnsprechpartner).catch(() => {});
  }, []);

  const onFirmaChange = (fid) => setForm({ ...form, firma_id: fid, hauptansprechpartner_id: '' });
  const filteredAnsprechpartner = form.firma_id ? ansprechpartner.filter((a) => a.firma_id === form.firma_id) : ansprechpartner;

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Projekt.update(projekt.id, {
        ...form,
        stundensatz: Number(form.stundensatz) || 0,
        pauschalbetrag: Number(form.pauschalbetrag) || 0,
        gesamtbudget_stunden: Number(form.gesamtbudget_stunden) || 0,
        firma_id: form.firma_id || undefined,
        hauptansprechpartner_id: form.hauptansprechpartner_id || undefined,
        ansprechpartner_id: (!form.firma_id && form.hauptansprechpartner_id) ? form.hauptansprechpartner_id : (form.ansprechpartner_id || undefined),
      });
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
            <div><Label>Firma</Label><Select value={form.firma_id || '_none'} onValueChange={(v) => onFirmaChange(v === '_none' ? '' : v)}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Firma wählen" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine Firma (Privat)</SelectItem>{firmen.map((f) => <SelectItem key={f.id} value={f.id}>{f.firmenname}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Hauptansprechpartner</Label><Select value={form.hauptansprechpartner_id || '_none'} onValueChange={(v) => setForm({ ...form, hauptansprechpartner_id: v === '_none' ? '' : v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Person wählen" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine</SelectItem>{filteredAnsprechpartner.map((a) => <SelectItem key={a.id} value={a.id}>{a.vorname} {a.nachname}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Bauvorhaben</Label><Select value={form.bauvorhaben || ''} onValueChange={(v) => setForm({ ...form, bauvorhaben: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Wählen" /></SelectTrigger><SelectContent>{BAUVORHABEN.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
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
      <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full">{saving ? 'Speichert...' : 'Änderungen speichern'}</Button>
    </div>
  );
}