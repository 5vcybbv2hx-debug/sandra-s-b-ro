import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, AlertCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todayISO, formatDate } from '@/lib/format';
import { toast } from 'sonner';

const PHASEN = ['Entwurf', 'Baugesuch', 'Werkplanung'];

export default function ProjektPhasen({ projekt, onUpdate }) {
  const [phasen, setPhasen] = useState([]);
  const [zeiten, setZeiten] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickEntry, setQuickEntry] = useState({ phase_id: '', stunden: '', beschreibung: '' });

  useEffect(() => { loadData(); }, [projekt.id]);

  const loadData = async () => {
    try {
      let ph = await base44.entities.Projektphase.filter({ projekt_id: projekt.id }, '-created_date', 20);
      if (ph.length === 0) { ph = await base44.entities.Projektphase.bulkCreate(PHASEN.map((phase) => ({ projekt_id: projekt.id, phase, status: phase === (projekt.aktuelle_phase || 'Entwurf') ? 'Aktiv' : 'Offen', stunden_geschaetzt: 0 }))); }
      setPhasen(ph);
      const z = await base44.entities.Zeiteintrag.filter({ projekt_id: projekt.id }, '-datum', 500);
      setZeiten(z.filter((x) => !x.timer_laeuft));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const phaseStunden = (phaseId) => zeiten.filter((z) => z.phase_id === phaseId).reduce((s, z) => s + (z.stunden || 0), 0);
  const gesamtIst = zeiten.reduce((s, z) => s + (z.stunden || 0), 0);
  const gesamtGeplant = phasen.reduce((s, p) => s + (p.stunden_geschaetzt || 0), 0);

  const updatePhase = async (phaseId, field, value) => {
    await base44.entities.Projektphase.update(phaseId, { [field]: field === 'stunden_geschaetzt' ? Number(value) || 0 : value });
    loadData(); onUpdate();
  };

  const addQuickEntry = async () => {
    if (!quickEntry.stunden || !quickEntry.phase_id) return;
    try { await base44.entities.Zeiteintrag.create({ projekt_id: projekt.id, phase_id: quickEntry.phase_id, datum: todayISO(), stunden: parseFloat(quickEntry.stunden), beschreibung: quickEntry.beschreibung || quickEntry.phase_id }); setQuickEntry({ phase_id: '', stunden: '', beschreibung: '' }); loadData(); toast.success('Stunden gebucht'); }
    catch (e) { toast.error('Fehler'); }
  };

  const daysUntil = (deadline) => { if (!deadline) return null; return Math.ceil((new Date(deadline) - new Date()) / 86400000); };

  if (loading) return <div className="h-32 bg-cardbg rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <Card className={cn('p-5 shadow-sm', gesamtGeplant > 0 && gesamtIst > gesamtGeplant && 'border-2 border-red-400')}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Stundenübersicht</h3>{gesamtGeplant > 0 && gesamtIst > gesamtGeplant && <span className="flex items-center gap-1 text-sm text-red-600 font-medium"><AlertCircle className="w-4 h-4" /> Budget überschritten</span>}</div>
        <div className="flex items-baseline gap-2 mb-3"><span className="text-3xl font-bold text-brand-dark">{gesamtIst.toFixed(1)}</span><span className="text-muted-foreground">/ {gesamtGeplant || '—'} h geplant</span></div>
        {gesamtGeplant > 0 && <div className="w-full bg-cardbg rounded-full h-3 overflow-hidden"><div className={cn('h-full rounded-full', gesamtIst > gesamtGeplant ? 'bg-red-500' : 'bg-brand')} style={{ width: `${Math.min(100, (gesamtIst / gesamtGeplant) * 100)}%` }} /></div>}
      </Card>

      <div className="space-y-3">
        {phasen.map((ph) => {
          const ist = phaseStunden(ph.id);
          const geplant = ph.stunden_geschaetzt || 0;
          const isCurrent = projekt.aktuelle_phase === ph.phase;
          const isOverdue = ph.enddatum_geplant && daysUntil(ph.enddatum_geplant) < 0 && ph.status !== 'Abgeschlossen';
          return (
            <Card key={ph.id} className={cn('p-4 shadow-sm transition-all', isCurrent && 'ring-2 ring-brand', isOverdue && 'border-2 border-red-400')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">{isCurrent && <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />}<h4 className="font-semibold">{ph.phase}</h4></div>
                <Select value={ph.status} onValueChange={(v) => updatePhase(ph.id, 'status', v)}><SelectTrigger className="w-32 h-8 min-h-[32px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Offen">Offen</SelectItem><SelectItem value="Aktiv">Aktiv</SelectItem><SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem></SelectContent></Select>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Geplant (h)</p><Input type="number" defaultValue={geplant} onBlur={(e) => updatePhase(ph.id, 'stunden_geschaetzt', e.target.value)} className="h-9 min-h-[36px] mt-1" key={`g-${ph.id}-${geplant}`} /></div>
                <div><p className="text-xs text-muted-foreground">Gebucht (h)</p><p className="font-bold text-brand-dark mt-2">{ist.toFixed(1)}</p></div>
                <div><p className="text-xs text-muted-foreground">Deadline</p><Input type="date" defaultValue={ph.enddatum_geplant || ''} onBlur={(e) => updatePhase(ph.id, 'enddatum_geplant', e.target.value)} className="h-9 min-h-[36px] mt-1 text-xs" key={`d-${ph.id}-${ph.enddatum_geplant}`} /></div>
              </div>
              {geplant > 0 && <div className="w-full bg-cardbg rounded-full h-2 overflow-hidden mt-2"><div className={cn('h-full rounded-full', ist > geplant ? 'bg-red-500' : 'bg-brand')} style={{ width: `${Math.min(100, (ist / geplant) * 100)}%` }} /></div>}
              {ph.enddatum_geplant && ph.status !== 'Abgeschlossen' && <p className={cn('text-xs font-medium mt-2', isOverdue ? 'text-red-600' : daysUntil(ph.enddatum_geplant) <= 7 ? 'text-amber-600' : 'text-muted-foreground')}><Clock className="w-3 h-3 inline mr-1" />{isOverdue ? `${Math.abs(daysUntil(ph.enddatum_geplant))} Tage überfällig` : daysUntil(ph.enddatum_geplant) === 0 ? 'Heute fällig' : `In ${daysUntil(ph.enddatum_geplant)} Tagen`}</p>}
            </Card>
          );
        })}
      </div>

      <Card className="p-4 shadow-sm">
        <p className="font-medium mb-3">+ Stunden buchen</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={quickEntry.phase_id} onValueChange={(v) => setQuickEntry({ ...quickEntry, phase_id: v })}><SelectTrigger className="min-h-[48px] sm:w-40"><SelectValue placeholder="Phase" /></SelectTrigger><SelectContent>{phasen.map((p) => <SelectItem key={p.id} value={p.id}>{p.phase}</SelectItem>)}</SelectContent></Select>
          <Input type="number" step="0.25" value={quickEntry.stunden} onChange={(e) => setQuickEntry({ ...quickEntry, stunden: e.target.value })} placeholder="Stunden" className="min-h-[48px] sm:w-32" />
          <Input value={quickEntry.beschreibung} onChange={(e) => setQuickEntry({ ...quickEntry, beschreibung: e.target.value })} placeholder="Beschreibung" className="min-h-[48px] flex-1" />
          <Button onClick={addQuickEntry} disabled={!quickEntry.stunden || !quickEntry.phase_id} className="bg-brand hover:bg-brand-dark text-white min-h-[48px]"><Plus className="w-4 h-4" /></Button>
        </div>
      </Card>
    </div>
  );
}