import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { getDefaultStundensatz } from '@/lib/settings';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';

const PHASES = ['Entwurf', 'Baugesuch', 'Werkplanung'];
const BAUVORHABEN = ['Einfamilienhaus', 'Doppelhaushälfte', 'Mehrfamilienhaus', 'Umbau', 'Anbau', 'Gewerbebau', 'Sonstiges'];

export default function NeuesProjektModal({ onClose, onCreated }) {
  const [firmen, setFirmen] = useState([]);
  const [ansprechpartner, setAnsprechpartner] = useState([]);
  const [erfahrungswerte, setErfahrungswerte] = useState([]);
  const [form, setForm] = useState({
    projekt_name: '', firma_id: '', hauptansprechpartner_id: '',
    kunde_name: '', kunde_firma: '', kunde_telefon: '', kunde_email: '',
    projektart: 'Sonstiges', bauvorhaben: '', status: 'Anfrage', phase: 'Entwurf',
    stundensatz: getDefaultStundensatz(), abrechnungsart: 'Stündlich', pauschalbetrag: 0,
    startdatum: todayISO(), deadline: '', deadline_entwurf: '', deadline_baugesuch: '', deadline_werkplanung: '',
    gesamtbudget_stunden: 0, phase_entwurf_geplante_stunden: 0, phase_baugesuch_geplante_stunden: 0, phase_werkplanung_geplante_stunden: 0,
    beschreibung: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Firma.list('-firmenname', 200).then(setFirmen).catch(() => {});
    base44.entities.Ansprechpartner.list('-nachname', 200).then(setAnsprechpartner).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.bauvorhaben) base44.entities.Phasen_Erfahrungswerte.filter({ projektart: form.bauvorhaben }).then(setErfahrungswerte).catch(() => setErfahrungswerte([]));
    else setErfahrungswerte([]);
  }, [form.bauvorhaben]);

  const onFirmaChange = (fid) => setForm({ ...form, firma_id: fid, hauptansprechpartner_id: '' });
  const filteredAnsprechpartner = form.firma_id ? ansprechpartner.filter((a) => a.firma_id === form.firma_id) : ansprechpartner;

  const applyErfahrungswert = (e) => {
    setForm({ ...form, [`phase_${e.phase.toLowerCase()}_geplante_stunden`]: e.durchschnitt_stunden });
    toast.success(`${e.phase}: ${e.durchschnitt_stunden} h übernommen`);
  };

  const handleSave = async () => {
    if (!form.projekt_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        stundensatz: Number(form.stundensatz) || 0,
        pauschalbetrag: Number(form.pauschalbetrag) || 0,
        gesamtbudget_stunden: Number(form.gesamtbudget_stunden) || 0,
        phase_entwurf_geplante_stunden: Number(form.phase_entwurf_geplante_stunden) || 0,
        phase_baugesuch_geplante_stunden: Number(form.phase_baugesuch_geplante_stunden) || 0,
        phase_werkplanung_geplante_stunden: Number(form.phase_werkplanung_geplante_stunden) || 0,
        firma_id: form.firma_id || undefined,
        hauptansprechpartner_id: form.hauptansprechpartner_id || undefined,
        ansprechpartner_id: (!form.firma_id && form.hauptansprechpartner_id) ? form.hauptansprechpartner_id : undefined,
      };
      await base44.entities.Projekt.create(payload);
      toast.success('Projekt erstellt'); onCreated(); onClose();
    } catch (e) { toast.error('Fehler beim Erstellen'); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Neues Projekt</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Projektname *</Label><Input value={form.projekt_name} onChange={(e) => setForm({ ...form, projekt_name: e.target.value })} placeholder="z.B. Grundriss Müller" className="min-h-[48px]" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Firma</Label><Select value={form.firma_id || '_none'} onValueChange={(v) => onFirmaChange(v === '_none' ? '' : v)}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Firma wählen" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine Firma (Privat)</SelectItem>{firmen.map((f) => <SelectItem key={f.id} value={f.id}>{f.firmenname}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Hauptansprechpartner</Label><Select value={form.hauptansprechpartner_id || '_none'} onValueChange={(v) => setForm({ ...form, hauptansprechpartner_id: v === '_none' ? '' : v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Person wählen" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine</SelectItem>{filteredAnsprechpartner.map((a) => <SelectItem key={a.id} value={a.id}>{a.vorname} {a.nachname}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Projektart</Label><Select value={form.projektart} onValueChange={(v) => setForm({ ...form, projektart: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{['Grundriss', 'Schnitt', 'Ansicht', 'Eingabeplanung', 'Genehmigungsplanung', 'Ausführungsplanung', 'Sonstiges'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Bauvorhaben</Label><Select value={form.bauvorhaben} onValueChange={(v) => setForm({ ...form, bauvorhaben: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Wählen" /></SelectTrigger><SelectContent>{BAUVORHABEN.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{['Anfrage', 'Aktiv', 'Wartend', 'Abgeschlossen', 'Archiviert'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Aktuelle Phase</Label><Select value={form.phase} onValueChange={(v) => setForm({ ...form, phase: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{PHASES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {erfahrungswerte.length > 0 && (
            <div className="p-3 bg-brand-light rounded-xl space-y-2">
              <p className="text-sm font-medium text-brand-dark">💡 Erfahrungswerte für "{form.bauvorhaben}"</p>
              {erfahrungswerte.map((e) => (<div key={e.id} className="flex items-center justify-between text-sm"><span>{e.phase}: {e.min_stunden}–{e.max_stunden} h (Ø {e.durchschnitt_stunden} h, aus {e.anzahl_projekte} Projekten)</span><button onClick={() => applyErfahrungswert(e)} className="text-brand font-medium hover:underline shrink-0">Übernehmen</button></div>))}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">Phasen-Planung</p>
            {PHASES.map((phase) => (<div key={phase} className="grid grid-cols-2 gap-2 items-end"><div><Label className="text-xs">{phase} Deadline</Label><Input type="date" value={form[`deadline_${phase.toLowerCase()}`]} onChange={(e) => setForm({ ...form, [`deadline_${phase.toLowerCase()}`]: e.target.value })} className="min-h-[40px] text-sm" /></div><div><Label className="text-xs">{phase} geplante h</Label><Input type="number" value={form[`phase_${phase.toLowerCase()}_geplante_stunden`]} onChange={(e) => setForm({ ...form, [`phase_${phase.toLowerCase()}_geplante_stunden`]: e.target.value })} className="min-h-[40px] text-sm" /></div></div>))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Abrechnungsart</Label><Select value={form.abrechnungsart} onValueChange={(v) => setForm({ ...form, abrechnungsart: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Stündlich">Stündlich</SelectItem><SelectItem value="Pauschal">Pauschal</SelectItem></SelectContent></Select></div>
            <div><Label>{form.abrechnungsart === 'Pauschal' ? 'Pauschalbetrag (€)' : 'Stundensatz (€)'}</Label><Input type="number" value={form.abrechnungsart === 'Pauschal' ? form.pauschalbetrag : form.stundensatz} onChange={(e) => setForm({ ...form, [form.abrechnungsart === 'Pauschal' ? 'pauschalbetrag' : 'stundensatz']: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Startdatum</Label><Input type="date" value={form.startdatum} onChange={(e) => setForm({ ...form, startdatum: e.target.value })} className="min-h-[48px]" /></div><div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="min-h-[48px]" /></div></div>
          <div><Label>Beschreibung</Label><Textarea value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button><Button onClick={handleSave} disabled={!form.projekt_name.trim() || saving} className="min-h-[48px] bg-brand hover:bg-brand-dark text-white">{saving ? 'Speichert...' : 'Erstellen'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}