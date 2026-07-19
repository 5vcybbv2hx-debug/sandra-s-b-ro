import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import TerminDialog from '@/components/kalender/TerminDialog';

const HOUR_START = 7;
const HOUR_END = 21;
const HOUR_HEIGHT = 52;
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function getMonday(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function isToday(d) { return isSameDay(d, new Date()); }

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function getEventPosition(event) {
  const start = new Date(event.start_datetime);
  const end = new Date(event.end_datetime);
  let startMin = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
  let endMin = (end.getHours() - HOUR_START) * 60 + end.getMinutes();
  startMin = Math.max(0, startMin);
  endMin = Math.min((HOUR_END - HOUR_START) * 60, endMin);
  return { top: (startMin / 60) * HOUR_HEIGHT, height: Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT) };
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(start.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function Kalender() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('week');
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [monthCursor, setMonthCursor] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [evts, aufgaben, projekte] = await Promise.all([
        base44.entities.KalenderEvent.list('-start_datetime', 500),
        base44.entities.Aufgabe.filter({ erledigt: false }),
        base44.entities.Projekt.filter({ status: 'Aktiv' }, '-deadline', 50)
      ]);
      setEvents(evts.filter(e => e.sync_status !== 'deleted_outlook'));
      setTasks(aufgaben);
      setProjects(projekte);
    } catch (e) { console.error(e); toast.error('Fehler beim Laden'); }
    finally { setLoading(false); }
  };

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => {
    setWeekStart(getMonday(new Date()));
    setMonthCursor({ year: new Date().getFullYear(), month: new Date().getMonth() });
  };

  const prevMonth = () => {
    setMonthCursor(c => {
      const m = c.month - 1;
      return m < 0 ? { year: c.year - 1, month: 11 } : { ...c, month: m };
    });
  };
  const nextMonth = () => {
    setMonthCursor(c => {
      const m = c.month + 1;
      return m > 11 ? { year: c.year + 1, month: 0 } : { ...c, month: m };
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncOutlookCalendar', {});
      const data = res.data;
      toast.success(`${data.created} neu, ${data.updated} aktualisiert, ${data.deleted} gelöscht`);
      loadData();
    } catch (e) { toast.error('Sync fehlgeschlagen'); }
    finally { setSyncing(false); }
  };

  const openCreate = () => { setSelectedEvent(null); setDialogMode('create'); setDialogOpen(true); };
  const openEvent = (event) => {
    setSelectedEvent(event);
    setDialogMode(event.source === 'outlook' ? 'view' : 'edit');
    setDialogOpen(true);
  };

  const goToProject = (e, projectId) => {
    e.stopPropagation();
    navigate(`/projekte/${projectId}`);
  };
  const goToTasks = (e) => {
    e.stopPropagation();
    navigate('/aufgaben');
  };

  const weekDays = getWeekDays(weekStart);
  const dateRange = `${weekDays[0].toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const gridHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

  const monthGrid = getMonthGrid(monthCursor.year, monthCursor.month);
  const monthLabel = `${MONTHS[monthCursor.month]} ${monthCursor.year}`;

  const dayEvents = (day) => events.filter(e => e.start_datetime && isSameDay(new Date(e.start_datetime), day));
  const dayAllDay = (day) => dayEvents(day).filter(e => e.is_all_day);
  const dayTimed = (day) => dayEvents(day).filter(e => !e.is_all_day).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
  const dayTasks = (day) => tasks.filter(t => t.faellig_am && isSameDay(new Date(t.faellig_am), day));
  const dayDeadlines = (day) => projects.filter(p => p.deadline && isSameDay(new Date(p.deadline), day));

  const switchToWeek = (day) => {
    setWeekStart(getMonday(day));
    setViewMode('week');
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Kalender</h1>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('week')}
              className={cn('px-3 py-2 text-sm font-medium transition-colors min-h-[40px]', viewMode === 'week' ? 'bg-brand text-white' : 'bg-background text-muted-foreground hover:bg-accent')}
            >
              Woche
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn('px-3 py-2 text-sm font-medium transition-colors min-h-[40px]', viewMode === 'month' ? 'bg-brand text-white' : 'bg-background text-muted-foreground hover:bg-accent')}
            >
              Monat
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="min-h-[40px]">
            <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} /> {syncing ? 'Sync...' : 'Sync'}
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-brand hover:bg-brand-dark text-white min-h-[40px]">
            <Plus className="w-4 h-4" /> Neuer Termin
          </Button>
        </div>
      </div>

      {viewMode === 'week' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevWeek} className="min-h-[40px] min-w-[40px]"><ChevronLeft className="w-5 h-5" /></Button>
              <Button variant="outline" size="sm" onClick={goToday} className="min-h-[40px]">Heute</Button>
              <Button variant="outline" size="icon" onClick={nextWeek} className="min-h-[40px] min-w-[40px]"><ChevronRight className="w-5 h-5" /></Button>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{dateRange}</p>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">Lade Kalender...</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-1 mb-1">
                  <div />
                  {weekDays.map((day, i) => (
                    <div key={i} className="text-center py-2">
                      <p className="text-xs text-muted-foreground">{WEEKDAYS[i]}</p>
                      <p className={cn('text-lg font-bold', isToday(day) ? 'text-brand' : 'text-foreground')}>{day.getDate()}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-1 mb-1 min-h-[24px]">
                  <div />
                  {weekDays.map((day, i) => {
                    const allDay = dayAllDay(day);
                    const tMarkers = dayTasks(day);
                    const dMarkers = dayDeadlines(day);
                    return (
                      <div key={i} className="space-y-0.5 min-h-[24px]">
                        {allDay.map(e => (
                          <div key={e.id} onClick={() => openEvent(e)} className={cn('text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer', e.source === 'outlook' ? 'bg-blue-100 text-blue-700' : 'bg-brand-light text-brand-dark')}>
                            {e.subject}
                          </div>
                        ))}
                        {(tMarkers.length > 0 || dMarkers.length > 0) && (
                          <div className="flex flex-wrap gap-0.5">
                            {dMarkers.map(p => (
                              <span key={p.id} onClick={(ev) => goToProject(ev, p.id)} className="text-[9px] bg-accent-light text-accent px-1 rounded truncate max-w-[80px] cursor-pointer hover:underline" title={`Deadline: ${p.projekt_name} — klick zum Öffnen`}>◆ {p.projekt_name}</span>
                            ))}
                            {tMarkers.map(t => (
                              <span key={t.id} onClick={goToTasks} className="text-[9px] bg-orange-50 text-orange-600 px-1 rounded cursor-pointer hover:underline" title={`Aufgabe: ${t.titel} — klick zum Öffnen`}>●{t.prioritaet}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-[44px_repeat(7,1fr)] gap-0">
                  <div className="relative" style={{ height: gridHeight }}>
                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                      <div key={i} className="absolute left-0 right-0 text-[10px] text-muted-foreground text-right pr-1" style={{ top: i * HOUR_HEIGHT - 6 }}>
                        {String(HOUR_START + i).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>
                  {weekDays.map((day, i) => {
                    const timed = dayTimed(day);
                    return (
                      <div key={i} className="relative border-l border-border" style={{ height: gridHeight }}>
                        {Array.from({ length: HOUR_END - HOUR_START }, (_, j) => (
                          <div key={j} className="absolute left-0 right-0 border-t border-border/40" style={{ top: j * HOUR_HEIGHT }} />
                        ))}
                        {isToday(day) && <div className="absolute inset-0 bg-brand-light/20 pointer-events-none" />}
                        {timed.map(e => {
                          const pos = getEventPosition(e);
                          return (
                            <div key={e.id} onClick={() => openEvent(e)} className={cn('absolute left-0.5 right-0.5 rounded-md p-1 text-xs cursor-pointer overflow-hidden border', e.source === 'outlook' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-brand-light text-brand-dark border-brand')} style={{ top: pos.top, height: pos.height }}>
                              <p className="font-medium truncate">{e.subject}</p>
                              {pos.height >= 36 && <p className="text-[9px] opacity-70">{formatTime(e.start_datetime)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth} className="min-h-[40px] min-w-[40px]"><ChevronLeft className="w-5 h-5" /></Button>
              <Button variant="outline" size="sm" onClick={goToday} className="min-h-[40px]">Heute</Button>
              <Button variant="outline" size="icon" onClick={nextMonth} className="min-h-[40px] min-w-[40px]"><ChevronRight className="w-5 h-5" /></Button>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{monthLabel}</p>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-8">Lade Kalender...</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((wd, i) => (
                  <div key={i} className={cn('text-center py-2 text-xs font-medium', i >= 5 ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
                    {wd}
                  </div>
                ))}
                {monthGrid.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === monthCursor.month;
                  const evts = dayEvents(day);
                  const allDay = dayAllDay(day);
                  const timed = dayTimed(day);
                  const tMarkers = dayTasks(day);
                  const dMarkers = dayDeadlines(day);
                  const totalItems = evts.length + tMarkers.length + dMarkers.length;
                  const isSelected = selectedDay && isSameDay(day, selectedDay);

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={cn(
                        'min-h-[72px] md:min-h-[96px] p-1.5 rounded-lg cursor-pointer transition-colors border',
                        isCurrentMonth ? 'bg-card' : 'bg-muted/30',
                        isToday(day) && 'border-brand ring-1 ring-brand',
                        !isToday(day) && isCurrentMonth && 'border-border',
                        !isToday(day) && !isCurrentMonth && 'border-transparent',
                        isSelected && 'ring-2 ring-brand',
                        i % 7 >= 5 && 'bg-muted/20'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          'text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full',
                          isToday(day) ? 'bg-brand text-white' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40'
                        )}>
                          {day.getDate()}
                        </span>
                        {totalItems > 3 && (
                          <span className="text-[9px] text-muted-foreground">{totalItems}</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {allDay.slice(0, 1).map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEvent(e); }} className={cn('text-[9px] px-1 py-0.5 rounded truncate', e.source === 'outlook' ? 'bg-blue-100 text-blue-700' : 'bg-brand-light text-brand-dark')}>
                            {e.subject}
                          </div>
                        ))}
                        {timed.slice(0, 2).map(e => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEvent(e); }} className={cn('text-[9px] px-1 py-0.5 rounded truncate flex items-center gap-0.5', e.source === 'outlook' ? 'bg-blue-50 text-blue-600' : 'bg-brand-light/60 text-brand-dark')}>
                            <span className="font-mono opacity-60">{formatTime(e.start_datetime)}</span>
                            <span className="truncate">{e.subject}</span>
                          </div>
                        ))}
                        {evts.length > 3 && (
                          <div className="text-[9px] text-muted-foreground px-1">+{evts.length - 3} weitere</div>
                        )}
                        {(tMarkers.length > 0 || dMarkers.length > 0) && (
                          <div className="flex gap-0.5 pt-0.5">
                            {dMarkers.map(p => (
                              <span key={p.id} onClick={(ev) => goToProject(ev, p.id)} className="text-[8px] text-accent cursor-pointer hover:underline" title={`Deadline: ${p.projekt_name} — klick zum Öffnen`}>◆</span>
                            ))}
                            {tMarkers.map(t => (
                              <span key={t.id} onClick={goToTasks} className="text-[8px] text-orange-600 cursor-pointer hover:underline" title={`Aufgabe: ${t.titel} — klick zum Öffnen`}>●</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedDay && (
                <div className="mt-4 rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {WEEKDAYS_FULL[(selectedDay.getDay() + 6) % 7]}, {selectedDay.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => switchToWeek(selectedDay)} className="min-h-[36px] text-xs">
                        In Wochenansicht
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)} className="min-h-[36px] text-xs">
                        Schließen
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {(() => {
                      const allDay = dayAllDay(selectedDay);
                      const timed = dayTimed(selectedDay);
                      const tMarkers = dayTasks(selectedDay);
                      const dMarkers = dayDeadlines(selectedDay);

                      if (allDay.length === 0 && timed.length === 0 && tMarkers.length === 0 && dMarkers.length === 0) {
                        return <p className="text-sm text-muted-foreground py-2">Keine Termine an diesem Tag</p>;
                      }

                      return (
                        <>
                          {dMarkers.map(p => (
                            <div key={p.id} onClick={(e) => goToProject(e, p.id)} className="flex items-center gap-2 p-2 rounded-md bg-accent-light/50 cursor-pointer hover:bg-accent-light transition-colors">
                              <span className="text-accent">◆</span>
                              <span className="text-sm font-medium">{p.projekt_name}</span>
                              <span className="text-xs text-muted-foreground">Deadline — klick zum Öffnen</span>
                            </div>
                          ))}
                          {allDay.map(e => (
                            <div key={e.id} onClick={() => openEvent(e)} className={cn('flex items-center gap-2 p-2 rounded-md cursor-pointer', e.source === 'outlook' ? 'bg-blue-50' : 'bg-brand-light/50')}>
                              <span className="text-xs text-muted-foreground">Ganztag</span>
                              <span className="text-sm font-medium truncate">{e.subject}</span>
                            </div>
                          ))}
                          {timed.map(e => (
                            <div key={e.id} onClick={() => openEvent(e)} className={cn('flex items-center gap-2 p-2 rounded-md cursor-pointer', e.source === 'outlook' ? 'bg-blue-50' : 'bg-brand-light/50')}>
                              <span className="text-xs font-mono text-muted-foreground w-10">{formatTime(e.start_datetime)}</span>
                              <span className="text-sm font-medium truncate">{e.subject}</span>
                              {e.location && <span className="text-xs text-muted-foreground truncate hidden md:inline">📍 {e.location}</span>}
                            </div>
                          ))}
                          {tMarkers.map(t => (
                            <div key={t.id} onClick={goToTasks} className="flex items-center gap-2 p-2 rounded-md bg-orange-50/50 cursor-pointer hover:bg-orange-50 transition-colors">
                              <span className="text-orange-600 text-xs">●</span>
                              <span className="text-sm">{t.titel}</span>
                              <span className="text-xs text-muted-foreground">Aufgabe — klick zum Öffnen</span>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Outlook</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-light border border-brand" /> App-Termin</span>
        <span className="flex items-center gap-1"><span className="text-accent">◆</span> Deadline (klickbar)</span>
        <span className="flex items-center gap-1"><span className="text-orange-600">●</span> Aufgabe (klickbar)</span>
      </div>

      <TerminDialog open={dialogOpen} onOpenChange={setDialogOpen} mode={dialogMode} event={selectedEvent} projekte={projects} onSaved={loadData} />
    </div>
  );
}
