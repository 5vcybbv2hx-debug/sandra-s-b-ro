import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTimer } from '@/lib/TimerContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate, formatDuration, todayISO } from '@/lib/format';
import { toast } from 'sonner';

export default function ProjektZeiten({ projekt }) {
  const { activeTimer, elapsed, startTimer, stopTimer } = useTimer();
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timerDesc, setTimerDesc] = useState('');
  const [manual, setManual] = useState({ datum: todayISO(), stunden: '', beschreibung: '' });

  useEffect(() => {
    loadEintraege();
  }, [projekt.id]);

  const loadEintraege = async () => {
    try {
      const data = await base44.entities.Zeiteintrag.filter({ projekt_id: projekt.id }, '-datum', 200);
      setEintraege(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
        datum: manual.datum,
        stunden: parseFloat(manual.stunden),
        beschreibung: manual.beschreibung,
        erfassungsart: 'Manuell',
      });
      setManual({ datum: todayISO(), stunden: '', beschreibung: '' });
      loadEintraege();
      toast.success('Zeiteintrag gespeichert');
    } catch (e) {
      toast.error('Fehler');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Zeiteintrag.delete(id);
    loadEintraege();
  };

  const gesamtStunden = eintraege.reduce((sum, e) => sum + (e.stunden || 0), 0);
  const gesamtBetrag =
    projekt.abrechnungsart === 'Pauschal' ? projekt.pauschalbetrag : gesamtStunden * projekt.stundensatz;
  const isThisProjectTimer = activeTimer?.projekt_id === projekt.id;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-cardbg rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">Gesamtstunden</p>
          <p className="text-2xl font-bold text-brand-dark">{gesamtStunden.toFixed(2)} h</p>
        </div>
        <div className="bg-cardbg rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">
            {projekt.abrechnungsart === 'Pauschal' ? 'Pauschalbetrag' : 'Betrag'}
          </p>
          <p className="text-2xl font-bold text-brand-dark">{formatCurrency(gesamtBetrag)}</p>
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
        <p className="font-medium mb-3">Zeiteinträge ({eintraege.length})</p>
        {loading ? (
          <p className="text-muted-foreground">Lade...</p>
        ) : (
          <div className="space-y-2">
            {eintraege.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {e.stunden} h
                    {e.erfassungsart === 'Timer' && <span className="text-xs text-brand ml-1">⏱</span>}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatDate(e.datum)}
                    {e.beschreibung && ` · ${e.beschreibung}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-muted-foreground hover:text-destructive p-2 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {eintraege.length === 0 && (
              <p className="text-muted-foreground text-sm">Noch keine Zeiteinträge.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}