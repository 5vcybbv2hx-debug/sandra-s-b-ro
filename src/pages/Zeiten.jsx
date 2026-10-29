import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Check, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDate, todayISO } from '@/lib/format';
import ProjektSelect from '@/components/ProjektSelect';
import PersonSelect from '@/components/zeiten/PersonSelect';
import PersonenSummen from '@/components/zeiten/PersonenSummen';
import OhnePersonListe from '@/components/zeiten/OhnePersonListe';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, isSameMonth, format as dfFormat, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const LAST_PERSON_KEY = 'zeiten_letzte_person';
const LAST_PROJEKT_KEY = 'zeiten_letztes_projekt';
const PHASEN_ORDER = ['Entwurf', 'Baugesuch', 'Werkplanung'];

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

const formatHours = (h) => (h || 0).toFixed(1).replace('.', ',');

const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function Zeiten() {
  const [eintraege, setEintraege] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [phasen, setPhasen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [manualForm, setManualForm] = useState({
    mitarbeiter_id: (typeof localStorage !== 'undefined' && localStorage.getItem(LAST_PERSON_KEY)) || '',
    projekt_id: (typeof localStorage !== 'undefined' && localStorage.getItem(LAST_PROJEKT_KEY)) || '',
    phase_id: '',
    datum: todayISO(),
    stunden: '',
    beschreibung: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ datum: '', projekt_id: '', mitarbeiter_id: '', stunden: '', beschreibung: '' });
  const [duplicatePending, setDuplicatePending] = useState(null);
  const [toggledWeeks, setToggledWeeks] = useState({});
  const [zeitraum, setZeitraum] = useState('gesamt');
  const [personFilter, setPersonFilter] = useState('alle');
  const [projektFilter, setProjektFilter] = useState('alle');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [e, p, m, ph] = await Promise.all([
        base44.entities.Zeiteintrag.list('-datum', 500),
        base44.entities.Projekt.list('-updated_date', 200),
        base44.entities.Mitarbeiter.list('-name', 200),
        base44.entities.Projektphase.list('-created_date', 500)
      ]);
      setEintraege(e.filter(x => !x.timer_laeuft));
      setProjekte(p);
      setMitarbeiter(m);
      setPhasen(ph);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const projName = (pid) => projekte.find(p => p.id === pid)?.projekt_name || '—';
  const personName = (id) => mitarbeiter.find(m => m.id === id)?.name || '—';
  const phasenVonProjekt = phasen
    .filter(p => p.projekt_id === manualForm.projekt_id)
    .sort((a, b) => PHASEN_ORDER.indexOf(a.phase) - PHASEN_ORDER.indexOf(b.phase));

  const checkDuplicate = (projekt_id, datum, stunden) => {
    return eintraege.some(
      e => e.projekt_id === projekt_id &&
           e.datum === datum &&
           String(e.stunden) === String(stunden)
    );
  };

  const handleManualSave = async (force = false) => {
    if (!manualForm.projekt_id || !manualForm.stunden || !manualForm.mitarbeiter_id) return;
    if (!force && checkDuplicate(manualForm.projekt_id, manualForm.datum, manualForm.stunden)) {
      setDuplicatePending({ ...manualForm });
      return;
    }
    try {
      await base44.entities.Zeiteintrag.create({
        mitarbeiter_id: manualForm.mitarbeiter_id,
        projekt_id: manualForm.projekt_id,
        phase_id: manualForm.phase_id || undefined,
        datum: manualForm.datum,
        stunden: parseFloat(manualForm.stunden),
        beschreibung: manualForm.beschreibung || ''
      });
      localStorage.setItem(LAST_PERSON_KEY, manualForm.mitarbeiter_id);
      localStorage.setItem(LAST_PROJEKT_KEY, manualForm.projekt_id);
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
    setEditForm({
      datum: e.datum || '',
      projekt_id: e.projekt_id || '',
      mitarbeiter_id: e.mitarbeiter_id || '',
      stunden: String(e.stunden),
      beschreibung: e.beschreibung || ''
    });
  };

  const cancelEdit = () => setEditingId(null);

  const handleSaveEdit = async () => {
    if (!editForm.stunden || isNaN(parseFloat(editForm.stunden)) || !editForm.mitarbeiter_id || !editForm.projekt_id) {
      toast.error('Bitte Person, Projekt und Stunden angeben');
      return;
    }
    try {
      await base44.entities.Zeiteintrag.update(editingId, {
        datum: editForm.datum,
        projekt_id: editForm.projekt_id,
        mitarbeiter_id: editForm.mitarbeiter_id,
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

  const assignPerson = async (id, mitarbeiter_id) => {
    try {
      await base44.entities.Zeiteintrag.update(id, { mitarbeiter_id });
      loadData();
      toast.success('Person zugeordnet');
    } catch (e) {
      toast.error('Fehler beim Zuweisen');
    }
  };

  // Zeitraum-Filter
  const now = new Date();
  const thisMonth = ym(now);
  const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const thisYear = String(now.getFullYear());
  const inZeitraum = (datum) => {
    if (zeitraum === 'gesamt') return true;
    if (!datum) return false;
    if (zeitraum === 'monat') return datum.startsWith(thisMonth);
    if (zeitraum === 'letzterMonat') return datum.startsWith(lastMonth);
    if (zeitraum === 'jahr') return datum.startsWith(thisYear);
    return true;
  };

  const gefiltert = eintraege.filter(e => inZeitraum(e.datum));
  const sichtbar = gefiltert.filter(e => {
    if (projektFilter !== 'alle' && e.projekt_id !== projektFilter) return false;
    if (personFilter === 'alle') return true;
    if (personFilter === 'ohne') return !e.mitarbeiter_id;
    return e.mitarbeiter_id === personFilter;
  });

  const personSummen = (() => {
    const map = new Map();
    gefiltert.forEach(e => {
      const key = e.mitarbeiter_id || 'none';
      map.set(key, (map.get(key) || 0) + (e.stunden || 0));
    });
    return [...map.entries()]
      .map(([id, wert]) => ({ id, name: id === 'none' ? 'Ohne Person' : personName(id), wert }))
      .sort((a, b) => b.wert - a.wert);
  })();

  const ohnePerson = gefiltert.filter(e => !e.mitarbeiter_id);

  // Wochen-Gruppierung
  const today = todayISO();
  const todayWeekKey = getWeekKey(today);

  const groups = {};
  sichtbar.forEach(e => {
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
          <tr key={e.id + '-d'} className="border-b border-border/40 md:table-row hidden">
            <td className="py-2 pr-4">
              <Input type="date" value={editForm.datum} onChange={ev => setEditForm({ ...editForm, datum: ev.target.value })} className="h-9 min-h-[36px]" />
            </td>
            <td className="py-2 pr-4">
              <PersonSelect mitarbeiter={mitarbeiter} value={editForm.mitarbeiter_id} onValueChange={v => setEditForm({ ...editForm, mitarbeiter_id: v })} placeholder="Person" className="h-9 min-h-[36px] w-40" />
            </td>
            <td className="py-2 pr-4">
              <ProjektSelect value={editForm.projekt_id} onValueChange={v => setEditForm({ ...editForm, projekt_id: v })} placeholder="Projekt" className="h-9 min-h-[36px] w-44" />
            </td>
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
          <div key={e.id + '-m'} className="md:hidden p-3 bg-cardbg rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Input type="date" value={editForm.datum} onChange={ev => setEditForm({ ...editForm, datum: ev.target.value })} className="min-h-[40px]" />
              <Input type="number" step="0.25" value={editForm.stunden} onChange={ev => setEditForm({ ...editForm, stunden: ev.target.value })} className="w-24 min-h-[40px]" />
              <span className="text-sm text-muted-foreground">h</span>
            </div>
            <PersonSelect mitarbeiter={mitarbeiter} value={editForm.mitarbeiter_id} onValueChange={v => setEditForm({ ...editForm, mitarbeiter_id: v })} placeholder="Person" className="min-h-[40px] w-full" />
            <ProjektSelect value={editForm.projekt_id} onValueChange={v => setEditForm({ ...editForm, projekt_id: v })} placeholder="Projekt" className="min-h-[40px] w-full" />
            <div className="flex items-center gap-2">
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
        <tr key={e.id + '-d'} className={cn('border-b border-border/40 hover:bg-cardbg/50 transition-colors md:table-row hidden', isToday && 'bg-brand-light/30')}>
          <td className="py-3 pr-4 text-sm whitespace-nowrap">
            <span className={isToday ? 'font-semibold text-brand-dark' : 'text-muted-foreground'}>{formatDate(e.datum)}</span>
            {isToday && <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-brand text-white rounded px-1 py-0.5">Heute</span>}
          </td>
          <td className="py-3 pr-4 text-sm whitespace-nowrap">
            {e.mitarbeiter_id
              ? <span className="font-medium">{personName(e.mitarbeiter_id)}</span>
              : <span className="text-amber-600 text-xs">Ohne Person</span>}
          </td>
          <td className="py-3 pr-4 text-sm font-medium truncate max-w-[200px]">{projName(e.projekt_id)}</td>
          <td className="py-3 pr-4 text-sm text-muted-foreground truncate max-w-[260px]">{e.beschreibung || '—'}</td>
          <td className="py-3 pr-4 font-bold text-brand-dark whitespace-nowrap">{e.stunden} h</td>
          <td className="py-3 text-right">
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => startEdit(e)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand-light/50 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(e.id)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </td>
        </tr>
        {/* Mobile card */}
        <div key={e.id + '-m'} className={cn('md:hidden flex items-center justify-between p-3 rounded-xl min-h-[48px]', isToday ? 'bg-brand-light/30 border border-brand/20' : 'bg-cardbg')}>
          <div className="min-w-0">
            <p className="font-medium">{e.stunden} h <span className="text-sm text-muted-foreground font-normal">· {formatDate(e.datum)}</span>{isToday && <span className="ml-1.5 text-[10px] uppercase tracking-wide bg-brand text-white rounded px-1 py-0.5">Heute</span>}</p>
            <p className="text-sm text-muted-foreground truncate">
              {e.mitarbeiter_id ? personName(e.mitarbeiter_id) : <span className="text-amber-600">Ohne Person</span>} · {projName(e.projekt_id)}
            </p>
            {e.beschreibung && <p className="text-sm text-muted-foreground truncate">{e.beschreibung}</p>}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <PersonSelect
            mitarbeiter={mitarbeiter}
            value={manualForm.mitarbeiter_id}
            onValueChange={v => setManualForm({ ...manualForm, mitarbeiter_id: v })}
            placeholder="Person *"
            className="min-h-[44px]"
          />
          <Input
            type="date"
            value={manualForm.datum}
            onChange={e => setManualForm({ ...manualForm, datum: e.target.value })}
            className="min-h-[44px]"
          />
          <ProjektSelect
            value={manualForm.projekt_id}
            onValueChange={v => setManualForm({ ...manualForm, projekt_id: v, phase_id: '' })}
            onProjectCreated={p => setProjekte(prev => [p, ...prev])}
            placeholder="Projekt wählen..."
            className="min-h-[44px]"
          />
          <Select
            value={manualForm.phase_id || '_none'}
            onValueChange={v => setManualForm({ ...manualForm, phase_id: v === '_none' ? '' : v })}
            disabled={phasenVonProjekt.length === 0}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder={manualForm.projekt_id ? 'Keine Phase' : 'Phase (Projekt wählen)'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Keine Phase</SelectItem>
              {phasenVonProjekt.map(p => <SelectItem key={p.id} value={p.id}>{p.phase}</SelectItem>)}
            </SelectContent>
          </Select>
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
          disabled={!manualForm.projekt_id || !manualForm.stunden || !manualForm.mitarbeiter_id}
          className="bg-brand hover:bg-brand-dark text-white min-h-[44px] w-full mt-2"
        >
          <Plus className="w-4 h-4 mr-1" /> Buchen
        </Button>
      </Card>

      {/* Filter */}
      <Card className="p-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={zeitraum} onValueChange={setZeitraum}>
            <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gesamt">Gesamter Zeitraum</SelectItem>
              <SelectItem value="monat">Dieser Monat</SelectItem>
              <SelectItem value="letzterMonat">Letzter Monat</SelectItem>
              <SelectItem value="jahr">Dieses Jahr</SelectItem>
            </SelectContent>
          </Select>
          <Select value={personFilter} onValueChange={setPersonFilter}>
            <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Personen</SelectItem>
              <SelectItem value="ohne">Ohne Person</SelectItem>
              {mitarbeiter.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={projektFilter} onValueChange={setProjektFilter}>
            <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Projekte</SelectItem>
              {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summen pro Person */}
      <PersonenSummen summen={personSummen} einheit="h" />

      {/* Bestand ohne Person */}
      {(personFilter === 'alle' || personFilter === 'ohne') && (
        <OhnePersonListe
          eintraege={ohnePerson}
          mitarbeiter={mitarbeiter}
          projName={projName}
          onAssign={assignPerson}
        />
      )}

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
                              <th className="py-2 pr-4 font-medium w-40">Person</th>
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