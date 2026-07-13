import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, todayISO } from '@/lib/format';
import { toast } from 'sonner';

const PHASES = ['Entwurf', 'Baugesuch', 'Werkplanung'];

export default function ProjektPhasen({ projekt, onUpdate }) {
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickEntry, setQuickEntry] = useState({ phase: '', stunden: '', beschreibung: '' });

  useEffect(() => { loadEintraege(); }, [projekt.id]);

  const loadEintraege = async () => {
    try { const data = await base44.entities.Zeiteintrag.filter({ projekt_id: projekt.id }, '-datum', 500); setEintraege(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const phaseIstStunden = (phase) => eintraege.filter((e) => e.phase === phase).reduce((sum, e) => sum + (e.stunden || 0), 0);
  const gesamtIst = eintraege.reduce((sum, e) => sum + (e.stunden || 0), 0);
  const gesamtGeplant = (projekt.phase_entwurf_geplante_stunden || 0) + (projekt.phase_baugesuch_geplante_stunden || 0) + (projekt.phase_werkplanung_geplante_stunden || 0);

  const updatePhase = async (phase, field, value) => {
    const fieldName = `phase_${phase.toLowerCase()}_${field === 'status' ? 'status' : 'geplante_stunden'}`;
    await base44.entities.Projekt.update(projekt.id, { [fieldName]: field === 'geplante_stunden' ? Number(value) || 0 : value });
    onUpdate();
  };

  const updateDeadline = async (phase, value) => {
    await base44.entities.Projekt.update(projekt.id, { [`deadline_${phase.toLowerCase()}`]: value });
    onUpdate();
  };

  const addQuickEntry = async () => {
    if (!quickEntry.stunden || !quickEntry.phase) return;
    try {
      await base44.entities.Zeiteintrag.create({ projekt_id: projekt.id, datum: todayISO(), stunden: parseFloat(quickEntry.stunden), beschreibung: quickEntry.beschreibung || quickEntry.phase, erfassungsart: 'Manuell', phase: quickEntry.phase });
      setQuickEntry({ phase: '', stunden: '', beschreibung: '' }); loadEintraege(); toast.success('Stunden gebucht');
    } catch (e) { toast.error('Fehler'); }
  };

  const daysUntil = (deadline) => { if (!deadline) return null; return Math.ceil((new Date(deadline) - new Date()) / 86400000); };

  return (
    <div className="space-y-5">
      <Card className={cn('p-5 shadow-sm', gesamtGeplant > 0 && gesamtIst > gesamtGeplant && 'border-2 border-red-400')}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Stundenübersicht</h3>
          {gesamtGeplant > 0 && gesamtIst > gesamtGeplant && <span className="flex items-center gap-1 text-sm text-red-600 font-medium"><AlertCircle className="w-4 h-4" /> Budget überschritten</span>}
        </div>
        <div className="flex items-baseline gap-2 mb-3"><span className="text-3xl font-bold text-brand-dark">{gesamtIst.toFixed(1)}</span><span className="text-muted-foreground">/ {gesamtGeplant || '—'} h geplant</span></div>
        {gesamtGeplant > 0 && <div className="w-full bg-cardbg rounded-full h-3 overflow-hidden"><div className={cn('h-full rounded-full transition-all', gesamtIst > gesamtGeplant ? 'bg-red-500' : 'bg-brand')} style={{ width: `${Math.min(100, (gesamtIst / gesamtGeplant) * 100)}%` }} /></div>}
      </Card>

      <div className="space-y-3">
        {PHASES.map((phase) => {
          const status = projekt[`phase_${phase.toLowerCase()}_status`] || 'Offen';
          const geplant = projekt[`phase_${phase.toLowerCase()}_geplante_stunden`] || 0;
          const ist = phaseIstStunden(phase);
          const deadline = projekt[`deadline_${phase.toLowerCase()}`];
          const days = daysUntil(deadline);
          const isCurrent = projekt.phase === phase;
          const isOverdue = days !== null && days < 0 && status !== 'Abgeschlossen';
          return (
            <Card key={phase} className={cn('p-4 shadow-sm transition-all', isCurrent && 'ring-2 ring-brand', isOverdue && 'border-2 border-red-400')}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">{isCurrent && <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />}<h4 className="font-semibold">{phase}</h4></div>
                <Select value={status} onValueChange={(v) => updatePhase(phase, 'status', v)}><SelectTrigger className="w-32 h-8 min-h-[32px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Offen">Offen</SelectItem><SelectItem value="In Arbeit">In Arbeit</SelectItem><SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem></SelectContent></Select>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                <div><p className="text-xs text-muted-foreground">Geplant</p><Input key={`${phase}-g-${geplant}`} type="number" defaultValue={geplant} onBlur={(e) => updatePhase(phase, 'geplante_stunden', e.target.value)} className="h-9 min-h-[36px] mt-1" /></div>
                <div><p className="text-xs text-muted-foreground">Gebucht</p><p className="font-bold text-brand-dark mt-2">{ist.toFixed(1)} h</p></div>
                <div><p className="text-xs text-muted-foreground">Deadline</p><Input key={`${phase}-d-${deadline}`} type="date" defaultValue={deadline || ''} onBlur={(e) => updateDeadline(phase, e.target.value)} className="h-9 min-h-[36px] mt-1 text-xs" /></div>
              </div>
              {geplant > 0 && <div className="w-full bg-cardbg rounded-full h-2 overflow-hidden mb-2"><div className={cn('h-full rounded-full', ist > geplant ? 'bg-red-500' : 'bg-brand')} style={{ width: `${Math.min(100, (ist / geplant) * 100)}%` }} /></div>}
              {days !== null && status !== 'Abgeschlossen' && <p className={cn('text-xs font-medium', isOverdue ? 'text-red-600' : days <= 2 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-muted-foreground')}><Clock className="w-3 h-3 inline mr-1" />{isOverdue ? `${Math.abs(days)} Tage überfällig` : days === 0 ? 'Heute fällig' : `In ${days} Tagen fällig`}</p>}
            </Card>
          );
        })}
      </div>

      <Card className="p-4 shadow-sm">
        <p className="font-medium mb-3">+ Stunden buchen</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={quickEntry.phase} onValueChange={(v) => setQuickEntry({ ...quickEntry, phase: v })}><SelectTrigger className="min-h-[48px] sm:w-40"><SelectValue placeholder="Phase" /></SelectTrigger><SelectContent>{PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
          <Input type="number" step="0.25" value={quickEntry.stunden} onChange={(e) => setQuickEntry({ ...quickEntry, stunden: e.target.value })} placeholder="Stunden" className="min-h-[48px] sm:w-32" />
          <Input value={quickEntry.beschreibung} onChange={(e) => setQuickEntry({ ...quickEntry, beschreibung: e.target.value })} placeholder="Beschreibung" className="min-h-[48px] flex-1" />
          <Button onClick={addQuickEntry} disabled={!quickEntry.stunden || !quickEntry.phase} className="bg-brand hover:bg-brand-dark text-white min-h-[48px]">Buchen</Button>
        </div>
      </Card>
    </div>
  );
}