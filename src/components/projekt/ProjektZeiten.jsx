import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useTimer } from '@/lib/TimerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PersonSelect from '@/components/zeiten/PersonSelect';
import { Play, Plus, Trash2 } from 'lucide-react';
import { formatDate, formatDuration, todayISO } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LAST_PERSON_KEY = 'zeiten_letzte_person';

export default function ProjektZeiten({ projekt, zeiten = [], mitarbeiter = [], loading, reload }) {
  const { activeTimer, elapsed, startTimer, stopTimer } = useTimer();
  const [timerDesc, setTimerDesc] = useState('');
  const [manual, setManual] = useState({
    datum: todayISO(),
    mitarbeiter_id: (typeof localStorage !== 'undefined' && localStorage.getItem(LAST_PERSON_KEY)) || '',
    stunden: '',
    beschreibung: '',
  });

  const handleStartTimer = async () => {
    await startTimer(projekt.id, timerDesc);
    setTimerDesc('');
    toast.success('Timer gestartet');
  };

  const handleManualAdd = async () => {
    if (!manual.stunden) return;
    try {
      await base44.entities.Zeiteintrag.create({
        projekt_id: projekt.id,
        mitarbeiter_id: manual.mitarbeiter_id || undefined,
        datum: manual.datum,
        stunden: parseFloat(manual.stunden),
        beschreibung: manual.beschreibung,
        erfassungsart: 'Manuell',
      });
      if (manual.mitarbeiter_id) localStorage.setItem(LAST_PERSON_KEY, manual.mitarbeiter_id);
      setManual({ ...manual, stunden: '', beschreibung: '' });
      reload?.();
      toast.success('Zeiteintrag gespeichert');
    } catch (e) {
      toast.error('Fehler');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Zeiteintrag.delete(id);
    reload?.();
  };

  const sichtbar = zeiten.filter((z) => !z.timer_laeuft);
  const personName = (id) => mitarbeiter.find((m) => m.id === id)?.name || '—';
  const gesamtStunden = sichtbar.reduce((s, z) => s + (Number(z.stunden) || 0), 0);
  const abgerechnetStunden = sichtbar
    .filter((z) => z.ist_abgerechnet)
    .reduce((s, z) => s + (Number(z.stunden) || 0), 0);
  const offenStunden = gesamtStunden - abgerechnetStunden;
  const isThisProjectTimer = activeTimer?.projekt_id === projekt.id;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-cardbg rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">Stunden gesamt</p>
          <p className="text-2xl font-bold text-brand-dark">{gesamtStunden.toFixed(2)} h</p>
        </div>
        <div className="bg-cardbg rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">Abrechenbar (offen)</p>
          <p className="text-2xl font-bold text-brand-dark">{offenStunden.toFixed(2)} h</p>
          {abgerechnetStunden > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{abgerechnetStunden.toFixed(2)} h abgerechnet</p>
          )}
        </div>
      </div>

      <div className="border border-border rounded-2xl p-4">
        {isThisProjectTimer ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand">⏱ Timer läuft für dieses Projekt</p>
              <p className="font-mono text-xl font-bold tabular-nums text-brand-dark">{formatDuration(elapsed)}</p>
            </div>
            <Button variant="destructive" onClick={stopTimer} className="min-h-[48px]">
              Stop
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={timerDesc}
              onChange={(e) => setTimerDesc(e.target.value)}
              placeholder="Beschreibung (optional)"
              className="min-h-[48px] flex-1"
            />
            <Button
              onClick={handleStartTimer}
              className="bg-brand hover:bg-brand-dark text-white min-h-[48px]"
            >
              <Play className="w-4 h-4 mr-1" /> Timer starten
            </Button>
          </div>
        )}
      </div>

      <div className="border border-border rounded-2xl p-4 space-y-3">
        <p className="font-medium">Manuell eintragen</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Datum</Label>
            <Input
              type="date"
              value={manual.datum}
              onChange={(e) => setManual({ ...manual, datum: e.target.value })}
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label>Stunden</Label>
            <Input
              type="number"
              step="0.25"
              value={manual.stunden}
              onChange={(e) => setManual({ ...manual, stunden: e.target.value })}
              placeholder="z.B. 2.5"
              className="min-h-[48px]"
            />
          </div>
        </div>
        <div>
          <Label>Person</Label>
          <PersonSelect
            mitarbeiter={mitarbeiter}
            value={manual.mitarbeiter_id}
            onValueChange={(v) => setManual({ ...manual, mitarbeiter_id: v })}
            placeholder="Person wählen"
            className="min-h-[48px]"
          />
        </div>
        <Input
          value={manual.beschreibung}
          onChange={(e) => setManual({ ...manual, beschreibung: e.target.value })}
          placeholder="Beschreibung"
          className="min-h-[48px]"
        />
        <Button onClick={handleManualAdd} variant="outline" className="min-h-[48px] w-full">
          <Plus className="w-4 h-4 mr-1" /> Hinzufügen
        </Button>
      </div>

      <div>
        <p className="font-medium mb-3">Zeiteinträge ({sichtbar.length})</p>
        {loading ? (
          <p className="text-muted-foreground">Lade...</p>
        ) : sichtbar.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Zeiteinträge.</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="py-2 pr-3 font-medium whitespace-nowrap">Datum</th>
                    <th className="py-2 pr-3 font-medium whitespace-nowrap">Person</th>
                    <th className="py-2 pr-3 font-medium">Beschreibung</th>
                    <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Stunden</th>
                    <th className="py-2 pr-3 font-medium whitespace-nowrap">Abgerechnet</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {sichtbar.map((e) => (
                    <tr key={e.id} className="border-b border-border/40">
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(e.datum)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{personName(e.mitarbeiter_id)}</td>
                      <td className="py-2 pr-3 text-muted-foreground truncate max-w-[240px]">{e.beschreibung || '—'}</td>
                      <td className="py-2 pr-3 text-right font-medium whitespace-nowrap">{e.stunden} h</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', e.ist_abgerechnet ? 'bg-status-abgeschlossen/15 text-status-abgeschlossen' : 'bg-brand-light text-brand-dark')}>
                          {e.ist_abgerechnet ? 'Ja' : 'Nein'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-muted-foreground hover:text-destructive p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {sichtbar.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {e.stunden} h
                      {e.ist_abgerechnet && <span className="ml-1.5 text-[10px] uppercase bg-status-abgeschlossen/15 text-status-abgeschlossen rounded px-1 py-0.5">abgerechnet</span>}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatDate(e.datum)} · {personName(e.mitarbeiter_id)}
                    </p>
                    {e.beschreibung && <p className="text-sm text-muted-foreground truncate">{e.beschreibung}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-muted-foreground hover:text-destructive p-2 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}