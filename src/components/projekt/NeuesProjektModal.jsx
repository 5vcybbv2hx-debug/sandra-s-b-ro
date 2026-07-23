import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDefaultStundensatz, getErfahrungswerte, getWeeklyCapacity } from '@/lib/settings';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';

const PHASEN = ['Entwurf', 'Baugesuch', 'Werkplanung'];
const PROJEKTARTEN = ['Grundriss', 'Schnitt', 'Genehmigungsplanung', 'Ausführungsplanung', 'Werkplanung', 'Bestandsaufnahme', 'Sonstiges'];

export default function NeuesProjektModal({ onClose, onCreated }) {
  const [firmen, setFirmen] = useState([]);
  const [ansprechpartner, setAnsprechpartner] = useState([]);
  const [vorlagen, setVorlagen] = useState([]);
  const [form, setForm] = useState({
    projekt_name: '', firma_id: '', haupt_ansprechpartner_id: '', beschreibung: '',
    projektart: 'Sonstiges', status: 'Anfrage', aktuelle_phase: 'Entwurf',
    startdatum: todayISO(), deadline: '', stundensatz: getDefaultStundensatz(),
    abrechnungsart: 'Stündlich', pauschalbetrag: 0, geschaetzte_stunden_gesamt: 0, notizen: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Firma.list('-name', 200).then(setFirmen).catch(() => {});
    base44.entities.Ansprechpartner.list('-nachname', 200).then(setAnsprechpartner).catch(() => {});
    base44.entities.ProjektVorlage.list('-name', 200).then(setVorlagen).catch(() => {});
  }, []);

  const applyVorlage = (vorlageId) => {
    if (!vorlageId || vorlageId === '_none') return;
    const v = vorlagen.find(v => v.id === vorlageId);
    if (!v) return;
    const totalStunden = (v.geschaetzte_stunden_entwurf || 0) + (v.geschaetzte_stunden_baugesuch || 0) + (v.geschaetzte_stunden_werkplanung || 0);
    setForm(f => ({
      ...f,
      projektart: v.projektart || f.projektart,
      stundensatz: v.standard_stundensatz || f.stundensatz,
      abrechnungsart: v.abrechnungsart || f.abrechnungsart,
      geschaetzte_stunden_gesamt: totalStunden,
    }));
    toast.success(`Vorlage "${v.name}" angewendet`);
  };

  const filteredAP = form.firma_id ? ansprechpartner.filter((a) => a.firma_id === form.firma_id) : ansprechpartner;
  const erfahrungswerte = getErfahrungswerte();
  const erfahrungKey = form.projektart && form.aktuelle_phase ? `${form.projektart}_${form.aktuelle_phase}` : '';
  const erfahrungswert = erfahrungswerte[erfahrungKey];

  const onFirmaChange = (fid) => setForm({ ...form, firma_id: fid, haupt_ansprechpartner_id: '' });

  const handleSave = async () => {
    if (!form.projekt_name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, stundensatz: Number(form.stundensatz) || 0, pauschalbetrag: Number(form.pauschalbetrag) || 0, geschaetzte_stunden_gesamt: Number(form.geschaetzte_stunden_gesamt) || 0, firma_id: form.firma_id || undefined, haupt_ansprechpartner_id: form.haupt_ansprechpartner_id || undefined };
      const projekt = await base44.entities.Projekt.create(payload);
      for (const phase of PHASEN) { await base44.entities.Projektphase.create({ projekt_id: projekt.id, phase, status: phase === form.aktuelle_phase ? 'Aktiv' : 'Offen', stunden_geschaetzt: erfahrungswerte[`${form.projektart}_${phase}`] || 0 }); }
      toast.success('Projekt erstellt'); onCreated(); onClose();
    } catch (e) { toast.error('Fehler beim Erstellen'); } finally { setSaving(false); }
  };

  const capacityWarning = (() => { const cap = getWeeklyCapacity(); const geschaetzt = Number(form.geschaetzte_stunden_gesamt) || 0; if (geschaetzt > cap * 2) return `⚠️ Geschätzte ${geschaetzt} h übersteigen ca. ${cap * 2} h Kapazität (2 Wochen)`; return null; })();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Neues Projekt</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {vorlagen.length > 0 && (
            <div>
              <Label>Vorlage verwenden</Label>
              <Select value="_none" onValueChange={applyVorlage}>
                <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Keine Vorlage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Keine Vorlage</SelectItem>
                  {vorlagen.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Projektname *</Label><Input value={form.projekt_name} onChange={(e) => setForm({ ...form, projekt_name: e.target.value })} className="min-h-[48px]" autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Firma</Label><Select value={form.firma_id || '_none'} onValueChange={(v) => onFirmaChange(v === '_none' ? '' : v)}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Firma wählen" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine Firma</SelectItem>{firmen.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Hauptansprechpartner</Label><Select value={form.haupt_ansprechpartner_id || '_none'} onValueChange={(v) => setForm({ ...form, haupt_ansprechpartner_id: v === '_none' ? '' : v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Person wählen" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine</SelectItem>{filteredAP.map((a) => <SelectItem key={a.id} value={a.id}>{a.vorname} {a.nachname}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Projektart</Label><Select value={form.projektart} onValueChange={(v) => setForm({ ...form, projektart: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{PROJEKTARTEN.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Aktuelle Phase</Label><Select value={form.aktuelle_phase} onValueChange={(v) => setForm({ ...form, aktuelle_phase: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{PHASEN.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {erfahrungswert !== undefined && (<div className="p-3 bg-brand-light rounded-xl"><p className="text-sm text-brand-dark">💡 Erfahrungswert: {form.projektart} {form.aktuelle_phase} ca. {erfahrungswert} h</p></div>)}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{['Anfrage', 'Aktiv', 'Wartend', 'Abgeschlossen', 'Archiviert'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Geschätzte Stunden Gesamt</Label><Input type="number" value={form.geschaetzte_stunden_gesamt} onChange={(e) => setForm({ ...form, geschaetzte_stunden_gesamt: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          {capacityWarning && <p className="text-sm text-amber-600 font-medium">{capacityWarning}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Abrechnungsart</Label><Select value={form.abrechnungsart} onValueChange={(v) => setForm({ ...form, abrechnungsart: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Stündlich">Stündlich</SelectItem><SelectItem value="Pauschal">Pauschal</SelectItem></SelectContent></Select></div>
            <div><Label>{form.abrechnungsart === 'Pauschal' ? 'Pauschalbetrag (€)' : 'Stundensatz (€)'}</Label><Input type="number" value={form.abrechnungsart === 'Pauschal' ? form.pauschalbetrag : form.stundensatz} onChange={(e) => setForm({ ...form, [form.abrechnungsart === 'Pauschal' ? 'pauschalbetrag' : 'stundensatz']: e.target.value })} className="min-h-[48px]" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Startdatum</Label><Input type="date" value={form.startdatum} onChange={(e) => setForm({ ...form, startdatum: e.target.value })} className="min-h-[48px]" /></div><div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="min-h-[48px]" /></div></div>
          <div><Label>Beschreibung</Label><Input value={form.beschreibung} onChange={(e) => setForm({ ...form, beschreibung: e.target.value })} className="min-h-[48px]" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button><Button onClick={handleSave} disabled={!form.projekt_name.trim() || saving} className="min-h-[48px] bg-brand hover:bg-brand-dark text-white">{saving ? 'Speichert...' : 'Erstellen'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';