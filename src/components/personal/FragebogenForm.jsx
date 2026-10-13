import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import SignaturePad from '@/components/personal/SignaturePad';

const DAYS = [['az_mo', 'Mo'], ['az_di', 'Di'], ['az_mi', 'Mi'], ['az_do', 'Do'], ['az_fr', 'Fr'], ['az_sa', 'Sa'], ['az_so', 'So']];

function Field({ label, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function YesNo({ value, onChange, yesLabel = 'Ja' }) {
  return (
    <div className="flex gap-2">
      {[['ja', yesLabel], ['nein', 'Nein']].map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={cn('px-4 min-h-[44px] rounded-lg border text-sm font-medium transition-colors', value === v ? 'bg-brand text-white border-brand' : 'bg-background text-muted-foreground hover:bg-muted')}>
          {l}
        </button>
      ))}
    </div>
  );
}

export default function FragebogenForm({ initial, user, onSaved }) {
  const [f, setF] = useState({ name: user?.full_name || '', ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const text = (k, label, props = {}) => (
    <Field label={label}><Input value={f[k] || ''} onChange={set(k)} className="min-h-[44px]" {...props} /></Field>
  );

  const save = async (submit) => {
    if (submit && (!f.name || !f.bestaetigt || !f.unterschrift)) {
      toast.error('Bitte Name ausfüllen, die Versicherung bestätigen und unterschreiben');
      return;
    }
    setSaving(true);
    const data = {
      ...f,
      email: user?.email,
      status: submit ? 'Eingereicht' : 'Entwurf',
      ...(submit ? { eingereicht_am: new Date().toISOString().split('T')[0] } : {}),
    };
    const saved = f.id
      ? await base44.entities.Personalfragebogen.update(f.id, data)
      : await base44.entities.Personalfragebogen.create(data);
    setSaving(false);
    toast.success(submit ? 'Fragebogen abgeschickt – danke!' : 'Entwurf gespeichert');
    setF((p) => ({ ...p, id: saved.id }));
    onSaved?.(submit);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Persönliche Daten</h2>
        {text('name', 'Name, Vorname')}
        {text('strasse', 'Straße')}
        {text('plz_ort', 'PLZ, Wohnort')}
        {text('nationalitaet', 'Nationalität')}
        {text('ausbildung', 'Schul- und Berufsausbildung')}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Beschäftigung</h2>
        {text('eintritt', 'Eintritt', { type: 'date' })}
        {text('taetigkeit', 'Tätigkeit')}
        {text('wochenstunden', 'Wöchentliche Arbeitszeit (Stunden)')}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {DAYS.map(([k, l]) => (
            <Field key={k} label={l}><Input value={f[k] || ''} onChange={set(k)} inputMode="decimal" className="min-h-[44px]" /></Field>
          ))}
        </div>
        {text('lohn', 'Stundenlohn / Festbetrag')}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Steuer & Versicherung</h2>
        {text('steuer_id', 'Steuer-IdNr.')}
        {text('rv_nummer', 'Rentenversicherungs-Nr.')}
        <p className="text-xs text-muted-foreground">Falls keine Rentenversicherungs-Nr. vorhanden, bitte folgende Angaben:</p>
        {text('geburtsdatum', 'Geburtsdatum', { type: 'date' })}
        {text('geburtsname', 'Geburtsname')}
        {text('geburtsort', 'Geburtsort')}
        {text('krankenkasse', 'Krankenkasse')}
        <Field label="Wird ein Befreiungsantrag in der Rentenversicherung gestellt?">
          <YesNo value={f.befreiungsantrag} onChange={(v) => setF((p) => ({ ...p, befreiungsantrag: v }))} yesLabel="Ja, Antrag beifügen" />
        </Field>
        <Field label="Wird eine versicherungspflichtige Beschäftigung ausgeübt?">
          <YesNo value={f.versicherungspflichtig} onChange={(v) => setF((p) => ({ ...p, versicherungspflichtig: v }))} />
        </Field>
        <Field label="Wird eine weitere geringfügige Beschäftigung ausgeübt?">
          <YesNo value={f.weitere_geringfuegig} onChange={(v) => setF((p) => ({ ...p, weitere_geringfuegig: v }))} />
        </Field>
        {f.weitere_geringfuegig === 'ja' && text('weitere_details', 'Seit wann und mit welchem Verdienst')}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Bankverbindung</h2>
        {text('kreditinstitut', 'Kreditinstitut')}
        {text('iban', 'IBAN')}
        {text('bic', 'BIC')}
      </Card>

      <Card className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          Ich versichere, dass ich die vorstehenden Angaben nach bestem Wissen und Gewissen gemacht habe. Ich verpflichte mich, alle Veränderungen zu den gemachten Angaben unverzüglich meinem Arbeitgeber mitzuteilen. Bei unterbliebenen Angaben, die eine andere Beurteilung meiner Beitrags-, Sozialversicherungs- oder Steuerpflicht nach sich ziehen, kann mich mein Arbeitgeber im Rahmen der gesetzlichen Möglichkeiten regresspflichtig machen.
        </p>
        <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
          <input type="checkbox" checked={!!f.bestaetigt} onChange={(e) => setF((p) => ({ ...p, bestaetigt: e.target.checked }))} className="mt-1 w-5 h-5" />
          <span className="text-sm font-medium">Ich bestätige diese Angaben</span>
        </label>
        {text('ort_datum', 'Ort, Datum')}
        <Field label="Unterschrift">
          <SignaturePad value={f.unterschrift} onChange={(v) => setF((p) => ({ ...p, unterschrift: v }))} />
        </Field>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" disabled={saving} onClick={() => save(false)} className="min-h-[48px] flex-1">Entwurf speichern</Button>
        <Button disabled={saving} onClick={() => save(true)} className="min-h-[48px] flex-1 bg-brand hover:bg-brand-dark text-white">Abschicken</Button>
      </div>
    </div>
  );
}