import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Check, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate, todayISO } from '@/lib/format';
import ProjektSelect from '@/components/ProjektSelect';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, isSameMonth, format as dfFormat, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const getWeekKey = (dateStr) => {
  if (!dateStr) return 'unknown';
  const d = new Date(dateStr);
  const monday = startOfWeek(d, { weekStartsOn: 1 });
  return monday.toISOString().split('T')[0];
};

const formatWeekRange = (monday, sunday) => {
  if (isSameMonth(monday, sunday)) {
    return `${dfFormat(monday, 'd.', { locale: de })}\u2013${dfFormat(sunday, 'd. MMMM', { locale: de })}`;
  }
  return `${dfFormat(monday, 'd. MMM', { locale: de })} \u2013 ${dfFormat(sunday, 'd. MMM', { locale: de })}`;
};

const formatHours = (h) => h.toFixed(1).replace('.', ',');

export default function Zeiten() {
  const [eintraege, setEintraege] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualForm, setManualForm] = useState({
    projekt_id: '',
    datum: todayISO(),
    stunden: '',
    beschreibung: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ stunden: '', beschreibung: '' });
  const [duplicatePending, setDuplicatePending] = useState(null);
  const [toggledWeeks, setToggledWeeks] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [e, p] = await Promise.all([
        base44.entities.Zeiteintrag.list('-datum', 200),
        base44.entities.Projekt.list('-updated_date', 200)
      ]);
      setEintraege(e.filter(x => !x.timer_laeuft));
      setProjekte(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const projName = (pid) => projekte.find(p => p.id === pid)?.projekt_name || '—';

  const checkDuplicate = (projekt_id, datum, stunden) => {
    return eintraege.some(
      e => e.projekt_id === projekt_id &&
           e.datum === datum &&
           String(e.stunden) === String(stunden)
    );
  };

  const handleManualSave = async (force = false) => {
    if (!manualForm.projekt_id || !manualForm.stunden) return;
    if (!force && checkDuplicate(manualForm.projekt_id, manualForm.datum, manualForm.stunden)) {
      setDuplicatePending({ ...manualForm });
      return;
    }
    try {
      await base44.entities.Zeiteintrag.create({
        projekt_id: manualForm.projekt_id,
        datum: manualForm.datum,
        stunden: parseFloat(manualForm.stunden),
        beschreibung: manualForm.beschreibung || ''
      });
      setManualForm({ ...manualForm, stunden: '', beschreibung: '' });
      setDuplicatePending(null);
      loadData();
      toast.success('Zeit gebucht');
    } catch (e) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Zeiteintrag.delete(id);
    loadData();
  };

  const startEdit = (e) => {
    setEditingId(e.id);
    setEditForm({ stunden: String(e.stunden), beschreibung: e.beschreibung || '' });
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async () => {
    if (!editForm.stunden || isNaN(parseFloat(editForm.stunden))) return;
    try {
      await base44.entities.Zeiteintrag.update(editingId, {
        stunden: parseFloat(editForm.stunden),
        beschreibung: editForm.beschreibung
      });
      setEditingId(null);
      loadData();
      toast.success('Zeit aktualisiert');
    } catch (e) {
      toast.error('Fehler beim Speichern');
    }
  };

  // Wochen-Gruppierung
  const today = todayISO();
  const todayWeekKey = getWeekKey(today);

  const groups = {};
  eintraege.forEach(e => {
    const key = getWeekKey(e.datum);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  const sortedWeekKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const isWeekExpanded = (key) => {
    if (key in toggledWeeks) return toggledWeeks[key];
    return key === todayWeekKey;
  };

  const toggleWeek = (key) => {
    setToggledWeeks(prev => ({ ...prev, [key]: !isWeekExpanded(key) }));
  };

  const renderRow = (e, isToday) => {
    const editing = editingId === e.id;
    if (editing) {
      return (
        <>
          {/* Desktop edit row */}
          <tr key={e.id} className="border-b border-border/40 md:table-row hidden">
            <td className="py-2 pr-4 text-sm">{formatDate(e.datum)}</td>
            <td className="py-2 pr-4 text-sm font-medium truncate max-w-[200px]">{projName(e.projekt_id)}</td>
            <td className="py-2 pr-4">
              <Input value={editForm.beschreibung} onChange={ev => setEditForm({ ...editForm, beschreibung: ev.target.value })} placeholder="Beschreibung" className="h-9 min-h-[36px]" />
            </td>
            <td className="py-2 pr-4">
              <div className="flex items-center gap-1">
                <Input type="number" step="0.25" value={editForm.stunden} onChange={ev => setEditForm({ ...editForm, stunden: ev.target.value })} className="w-20 h-9 min-h-[36px]" />
                <span className="text-sm text-muted-foreground">h</span>
              </div>
            </td>
            <td className="py-2 text-right">
              <div className="flex items-center justify-end gap-1">
                <button onClick={handleSaveEdit} className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 hover:bg-brand-dark"><Check className="w-4 h-4" /></button>
                <button onClick={cancelEdit} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 hover:bg-muted/70"><X className="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
          {/* Mobile edit card */}
          <div key={e.id} className="md:hidden p-3 bg-cardbg rounded-xl space-y-2">
            <p className="text-sm font-medium truncate">{projName(e.projekt_id)}</p>
            <div className="flex items-center gap-2">
              <Input type="number" step="0.25" value={editForm.stunden} onChange={ev => setEditForm({ ...editForm, stunden: ev.target.value })} className="w-24 min-h-[40px]" />
              <span className="text-sm text-muted-foreground">h</span>
              <Input value={editForm.beschreibung} onChange={ev => setEditForm({ ...editForm, beschreibung: ev.target.value })} placeholder="Beschreibung" className="flex-1 min-h-[40px]" />
              <button onClick={handleSaveEdit} className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 hover:bg-brand-dark"><Check className="w-4 h-4" /></button>
              <button onClick={cancelEdit} className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 hover:bg-muted/70"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </>
      );
    }
    return (
      <>
        {/* Desktop row */}
        <tr key={e.id} className={cn('border-b border-border/40 hover:bg-cardbg/50 transition-colors md:table-row hidden', isToday && 'bg-brand-light/30')}>
          <td className="py-3 pr-4 text-sm whitespace-nowrap">
            <span className={isToday ? 'font-semibold text-brand-dark' : 'text-muted-foreground'}>{formatDate(e.datum)}</span>
            {isToday && <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-brand text-white rounded px-1 py-0.5">Heute</span>}
          </td>
          <td className="py-3 pr-4 text-sm font-medium truncate max-w-[200px]">{projName(e.projekt_id)}</td>
          <td className="py-3 pr-4 text-sm text-muted-foreground truncate max-w-[300px]">{e.beschreibung || '—'}</td>
          <td className="py-3 pr-4 font-bold text-brand-dark whitespace-nowrap">{e.stunden} h</td>
          <td className="py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => startEdit(e)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand-light/50 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(e.id)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </td>
        </tr>
        {/* Mobile card */}
        <div key={e.id} className={cn('md:hidden flex items-center justify-between p-3 rounded-xl min-h-[48px]', isToday ? 'bg-brand-light/30 border border-brand/20' : 'bg-cardbg')}>
          <div className="min-w-0">
            <p className="font-medium">{e.stunden} h <span className="text-sm text-muted-foreground font-normal">· {formatDate(e.datum)}</span>{isToday && <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-brand text-white rounded px-1 py-0.5">Heute</span>}</p>
            <p className="text-sm text-muted-foreground truncate">{projName(e.projekt_id)} {e.beschreibung && `· ${e.beschreibung}`}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => startEdit(e)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand-light/50 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(e.id)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1150px] mx-auto space-y-5">
      <h1 className="text-2xl md:text-3xl font-bold">Zeiterfassung</h1>

      {/* Kompaktes Erfassungsformular */}
      <Card className="p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <Input
            type="date"
            value={manualForm.datum}
            onChange={e => setManualForm({ ...manualForm, datum: e.target.value })}
            className="min-h-[44px]"
          />
          <ProjektSelect
            value={manualForm.projekt_id}
            onValueChange={v => setManualForm({ ...manualForm, projekt_id: v })}
            onProjectCreated={p => setProjekte(prev => [p, ...prev])}
            placeholder="Projekt wählen..."
            className="min-h-[44px]"
          />
          <Input
            type="number"
            step="0.25"
            value={manualForm.stunden}
            onChange={e => setManualForm({ ...manualForm, stunden: e.target.value })}
            placeholder="Stunden"
            className="min-h-[44px]"
          />
          <Input
            value={manualForm.beschreibung}
            onChange={e => setManualForm({ ...manualForm, beschreibung: e.target.value })}
            placeholder="Beschreibung"
            className="min-h-[44px]"
          />
        </div>
        <Button
          onClick={() => handleManualSave(false)}
          disabled={!manualForm.projekt_id || !manualForm.stunden}
          className="bg-accent hover:bg-accent-dark text-white min-h-[44px] w-full mt-2"
        >
          <Plus className="w-4 h-4 mr-1" /> Buchen
        </Button>
      </Card>

      {/* Duplikat-Dialog */}
      {duplicatePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDuplicatePending(null)}>
          <Card className="p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold">Schon erfasst?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Ein Eintrag mit gleichem Projekt, Datum und Stunden existiert bereits.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDuplicatePending(null)}>Abbrechen</Button>
              <Button className="bg-brand hover:bg-brand-dark text-white" onClick={() => handleManualSave(true)}>
                Trotzdem speichern
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Wochen-Gruppen */}
      <Card className="shadow-sm">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Lade...</p>
        ) : sortedWeekKeys.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Keine Einträge.</p>
        ) : (
          <div className="divide-y divide-border">
            {sortedWeekKeys.map(weekKey => {
              const weekEntries = groups[weekKey];
              const monday = new Date(weekKey);
              const sunday = endOfWeek(monday, { weekStartsOn: 1 });
              const kw = getISOWeek(monday);
              const weekLabel = formatWeekRange(monday, sunday);
              const totalHours = weekEntries.reduce((s, e) => s + (e.stunden || 0), 0);
              const expanded = isWeekExpanded(weekKey);
              const isCurrentWeek = weekKey === todayWeekKey;

              return (
                <div key={weekKey}>
                  <button
                    onClick={() => toggleWeek(weekKey)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-cardbg/50 transition-colors min-h-[48px]"
                  >
                    {expanded
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className="font-semibold text-sm md:text-base">{weekLabel}</span>
                    <span className="text-xs text-muted-foreground">KW {kw}</span>
                    {isCurrentWeek && <span className="text-[10px] uppercase tracking-wide bg-brand/10 text-brand-dark rounded px-1.5 py-0.5">Aktuelle Woche</span>}
                    <span className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">
                      <span className="font-bold text-brand-dark text-sm md:text-base">{formatHours(totalHours)} h</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{weekEntries.length} Einträge</span>
                    </span>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-3">
                      {/* Desktop Tabelle */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                              <th className="py-2 pr-4 font-medium w-32">Datum</th>
                              <th className="py-2 pr-4 font-medium">Projekt</th>
                              <th className="py-2 pr-4 font-medium">Beschreibung</th>
                              <th className="py-2 pr-4 font-medium w-24">Stunden</th>
                              <th className="py-2 font-medium w-24 text-right">Aktionen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weekEntries.map(e => renderRow(e, e.datum === today))}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile Karten */}
                      <div className="md:hidden space-y-2">
                        {weekEntries.map(e => renderRow(e, e.datum === today))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}