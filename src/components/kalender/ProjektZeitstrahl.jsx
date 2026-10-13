import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getMonday(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addWeeks(d, n) { const r = new Date(d); r.setDate(r.getDate() + n * 7); return r; }
function diffDays(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function isSameDay(a, b) { return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); }
function getWeekNumber(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

const WEEKS_BEFORE = 4;
const WEEKS_AFTER = 8;
const TOTAL_WEEKS = WEEKS_BEFORE + WEEKS_AFTER;
const COL_WIDTH = 76;
const ROW_HEIGHT = 34;

const PHASE_COLORS = {
  'Entwurf': 'bg-brand',
  'Baugesuch': 'bg-accent',
  'Werkplanung': 'bg-status-abgeschlossen',
};

export default function ProjektZeitstrahl() {
  const navigate = useNavigate();
  const [phases, setPhases] = useState([]);
  const [projects, setProjects] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorDate, setAnchorDate] = useState(getMonday(new Date()));

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [phasen, projekte, kap] = await Promise.all([
        base44.entities.Projektphase.list('-created_date', 500),
        base44.entities.Projekt.filter({ status: 'Aktiv' }, '-deadline', 100),
        base44.entities.Kapazitaetseinstellung.list('-created_date', 1).catch(() => []),
      ]);
      setPhases(phasen);
      setProjects(projekte);
      setCapacity(kap[0] || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const timelineStart = addWeeks(anchorDate, -WEEKS_BEFORE);
  const timelineEnd = addWeeks(timelineStart, TOTAL_WEEKS);
  const totalDays = TOTAL_WEEKS * 7;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weeks = Array.from({ length: TOTAL_WEEKS }, (_, i) => addWeeks(timelineStart, i));
  const projName = (pid) => projects.find(p => p.id === pid)?.projekt_name || '?';

  const activeIds = new Set(projects.map(p => p.id));
  const activePhases = phases.filter(p => activeIds.has(p.projekt_id));
  const withDates = activePhases.filter(p => p.startdatum && p.enddatum_geplant);
  const withoutDates = activePhases.filter(p => !p.startdatum || !p.enddatum_geplant);
  const sortedPhases = [...withDates].sort((a, b) => new Date(a.startdatum) - new Date(b.startdatum));

  const barPos = (ph) => {
    const start = new Date(ph.startdatum);
    const end = new Date(ph.enddatum_geplant);
    const barStart = start < timelineStart ? timelineStart : start;
    const barEnd = end > timelineEnd ? timelineEnd : end;
    if (barStart > timelineEnd || barEnd < timelineStart) return null;
    const left = diffDays(timelineStart, barStart) / totalDays * 100;
    const width = Math.max(1.5, diffDays(barStart, barEnd) / totalDays * 100);
    return { left, width };
  };

  const todayPct = today >= timelineStart && today <= timelineEnd
    ? diffDays(timelineStart, today) / totalDays * 100 : null;

  const weeklyTarget = capacity?.woechentliche_zielstunden || 25;
  const weeklyLoads = weeks.map(week => {
    const weekEnd = addWeeks(week, 1);
    let hours = 0;
    withDates.forEach(ph => {
      const start = new Date(ph.startdatum);
      const end = new Date(ph.enddatum_geplant);
      if (start < weekEnd && end >= week) {
        const phaseDays = Math.max(1, diffDays(start, end));
        const overlapStart = start > week ? start : week;
        const overlapEnd = end < weekEnd ? end : weekEnd;
        const overlapDays = Math.max(1, diffDays(overlapStart, overlapEnd));
        hours += (ph.stunden_geschaetzt || 0) / phaseDays * overlapDays;
      }
    });
    return Math.round(hours);
  });
  const maxLoad = Math.max(weeklyTarget * 1.5, ...weeklyLoads, 1);

  if (loading) return <p className="text-muted-foreground text-center py-8">Lade Zeitstrahl...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchorDate(addWeeks(anchorDate, -4))} className="min-h-[40px] min-w-[40px]"><ChevronLeft className="w-5 h-5" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchorDate(getMonday(new Date()))} className="min-h-[40px]">Heute</Button>
          <Button variant="outline" size="icon" onClick={() => setAnchorDate(addWeeks(anchorDate, 4))} className="min-h-[40px] min-w-[40px]"><ChevronRight className="w-5 h-5" /></Button>
        </div>
        <p className="text-sm font-medium text-muted-foreground">KW {getWeekNumber(weeks[0])} – KW {getWeekNumber(weeks[TOTAL_WEEKS - 1])}</p>
      </div>

      {withDates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-cardbg/50 p-8 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-1">Noch nichts geplant</p>
          <p className="text-sm text-muted-foreground/70 mb-4">Phasen mit Start-/Enddatum erscheinen hier</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/kapazitaet')} className="min-h-[40px]">Phase planen</Button>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div style={{ minWidth: TOTAL_WEEKS * COL_WIDTH }}>
            {/* Kapazitätsleiste */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Kapazität / Woche</span>
                <span className="text-xs text-muted-foreground/70">Ziel: {weeklyTarget} h</span>
              </div>
              <div className="flex items-end gap-0" style={{ height: 40 }}>
                {weeks.map((w, i) => {
                  const load = weeklyLoads[i];
                  const h = (load / maxLoad) * 36;
                  const over = load > weeklyTarget;
                  return (
                    <div key={i} className="flex flex-col items-center justify-end" style={{ width: COL_WIDTH }}>
                      <span className="text-[9px] text-muted-foreground mb-0.5">{load > 0 ? load : ''}</span>
                      <div className="w-full px-1" style={{ height: 36 }}>
                        <div className={cn('w-full rounded-t transition-all', over ? 'bg-accent/60' : 'bg-brand/40')} style={{ height: Math.max(2, h) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex border-t border-border/40">
                {weeks.map((w, i) => <div key={i} style={{ width: COL_WIDTH }} className="border-r border-border/20" />)}
              </div>
            </div>

            {/* Week headers */}
            <div className="flex border-b border-border pb-1 mb-1">
              {weeks.map((w, i) => (
                <div key={i} className="text-center" style={{ width: COL_WIDTH }}>
                  <p className="text-[10px] text-muted-foreground">KW {getWeekNumber(w)}</p>
                  <p className={cn('text-xs font-medium', isSameDay(w, today) ? 'text-brand' : 'text-foreground')}>{w.getDate()}.</p>
                </div>
              ))}
            </div>

            {/* Phase rows */}
            <div className="relative">
              {todayPct !== null && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-accent z-10 pointer-events-none" style={{ left: `${todayPct}%` }} />
              )}
              {sortedPhases.map(ph => {
                const pos = barPos(ph);
                if (!pos) return null;
                const color = PHASE_COLORS[ph.phase] || 'bg-brand';
                return (
                  <div key={ph.id} className="relative border-b border-border/30" style={{ height: ROW_HEIGHT }}>
                    <div className="flex absolute inset-0">
                      {weeks.map((w, i) => <div key={i} className="border-r border-border/20" style={{ width: COL_WIDTH }} />)}
                    </div>
                    <div
                      onClick={() => navigate(`/projekte/${ph.projekt_id}`)}
                      className={cn('absolute top-1.5 rounded-md cursor-pointer text-[10px] text-white px-1.5 flex items-center truncate hover:opacity-80 transition-opacity', color)}
                      style={{ left: `${pos.left}%`, width: `${pos.width}%`, height: ROW_HEIGHT - 12 }}
                      title={`${projName(ph.projekt_id)} — ${ph.phase}`}
                    >
                      {pos.width > 6 && <span className="truncate">{projName(ph.projekt_id)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Ohne Termin */}
      {withoutDates.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Ohne Termin ({withoutDates.length})</h3>
          <div className="space-y-1">
            {withoutDates.slice(0, 10).map(ph => (
              <div key={ph.id} onClick={() => navigate(`/projekte/${ph.projekt_id}`)} className="flex items-center gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors min-h-[40px]">
                <span className={cn('w-2 h-2 rounded-full shrink-0', PHASE_COLORS[ph.phase] || 'bg-brand')} />
                <span className="text-sm font-medium truncate">{projName(ph.projekt_id)}</span>
                <span className="text-xs text-muted-foreground shrink-0">— {ph.phase}</span>
              </div>
            ))}
            {withoutDates.length > 10 && <p className="text-xs text-muted-foreground text-center pt-1">+ {withoutDates.length - 10} weitere</p>}
          </div>
        </div>
      )}
    </div>
  );
}