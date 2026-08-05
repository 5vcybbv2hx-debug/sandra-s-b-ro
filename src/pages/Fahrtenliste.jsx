import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate, todayISO, monthLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Car, Download, Trash2, ChevronLeft, ChevronRight, MapPin, AlertCircle, Check } from 'lucide-react';

export default function Fahrtenliste() {
  const [fahrten, setFahrten] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [completeModal, setCompleteModal] = useState(null);
  const [form, setForm] = useState({ datum: todayISO(), startort: '', zielort: '', zweck: '', kilometer: '', projekt_id: '', uhrzeit_start: '', uhrzeit_ende: '' });
  const [completeForm, setCompleteForm] = useState({ zweck: '', projekt_id: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [f, p] = await Promise.all([
        base44.entities.Fahrt.list('-datum', 2000),
        base44.entities.Projekt.list('-created_date', 500),
      ]);
      setFahrten(f);
      setProjekte(p);
    } catch { toast.error('Fahrten konnten nicht geladen werden'); }
    finally { setLoading(false); }
  };

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthFahrten = fahrten.filter(f => (f.datum || '').startsWith(monthStr)).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const totalKm = monthFahrten.reduce((s, f) => s + (f.kilometer || 0), 0);
  const openFahrten = monthFahrten.filter(f => f.status === 'offen');
  const completedFahrten = monthFahrten.filter(f => f.status !== 'offen');

  const grouped = {};
  monthFahrten.forEach(f => { const d = f.datum || ''; if (!grouped[d]) grouped[d] = []; grouped[d].push(f); });
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const projName = (id) => projekte.find(p => p.id === id)?.projekt_name || '';

  const handleSave = async () => {
    if (!form.datum || !form.startort || !form.zielort || !form.kilometer) { toast.error('Bitte Datum, Startort, Zielort und Kilometer ausfüllen'); return; }
    try {
      const payload = { ...form, kilometer: Number(form.kilometer) || 0, status: 'abgeschlossen' };
      if (!payload.projekt_id) delete payload.projekt_id;
      await base44.entities.Fahrt.create(payload);
      toast.success('Fahrt hinzugefügt');
      setForm({ datum: todayISO(), startort: '', zielort: '', zweck: '', kilometer: '', projekt_id: '', uhrzeit_start: '', uhrzeit_ende: '' });
      setModalOpen(false);
      loadAll();
    } catch { toast.error('Speichern fehlgeschlagen'); }
  };

  const handleComplete = async () => {
    if (!completeModal) return;
    try {
      const update = { status: 'abgeschlossen' };
      if (completeForm.zweck) update.zweck = completeForm.zweck;
      if (completeForm.projekt_id) update.projekt_id = completeForm.projekt_id;
      await base44.entities.Fahrt.update(completeModal.id, update);
      toast.success('Fahrt vervollständigt');
      setCompleteModal(null);
      setCompleteForm({ zweck: '', projekt_id: '' });
      loadAll();
    } catch { toast.error('Fehler beim Vervollständigen'); }
  };

  const handleDelete = async (id) => {
    try { await base44.entities.Fahrt.delete(id); toast.success('Fahrt gelöscht'); loadAll(); }
    catch { toast.error('Löschen fehlgeschlagen'); }
  };

  const exportCsv = () => {
    const rows = [['Datum', 'Startort', 'Zielort', 'Zweck', 'Kilometer', 'Projekt', 'Startzeit', 'Endzeit']];
    monthFahrten.forEach(f => {
      rows.push([f.datum, f.startort, f.zielort, f.zweck, f.kilometer, projName(f.projekt_id), f.uhrzeit_start, f.uhrzeit_ende]);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Fahrtenliste_${monthStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };
  const years = [year - 2, year - 1, year, year + 1];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Fahrtenliste</h1>
          <p className="text-sm text-muted-foreground mt-1">{monthLabel(monthStr)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={monthFahrten.length === 0} className="gap-2">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button onClick={() => setModalOpen(true)} className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Fahrt</span>
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-3">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'].map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-5 bg-brand-light border-brand/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center"><Car className="w-6 h-6 text-white" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Gesamt Kilometer</p>
              <p className="text-2xl font-bold text-brand-dark">{totalKm.toFixed(1)} km</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{monthFahrten.length} Fahrt(en)</p>
            {openFahrten.length > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-1">{openFahrten.length} offen</p>
            )}
          </div>
        </div>
      </Card>

      {/* Open trips (highlighted) */}
      {openFahrten.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-amber-600">Offene Fahrten — bitte vervollständigen</p>
          </div>
          {openFahrten.map(f => (
            <Card key={f.id} className="p-4 border-amber-200 bg-amber-50/50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate">{f.startort || 'GPS erfasst'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="truncate text-muted-foreground">{f.zielort || 'noch offen'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{f.uhrzeit_start}{f.uhrzeit_ende ? `–${f.uhrzeit_ende}` : ' – läuft'}</span>
                    {f.kilometer > 0 && <span className="text-lg font-bold text-amber-600">{(f.kilometer || 0).toFixed(1)} km</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => { setCompleteModal(f); setCompleteForm({ zweck: f.zweck || '', projekt_id: f.projekt_id || '' }); }} className="gap-1.5">
                    <Check className="w-4 h-4" /> Vervollständigen
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Completed trips grouped by day */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Fahrten...</div>
      ) : completedFahrten.length === 0 && openFahrten.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-center border-dashed">
          <Car className="w-14 h-14 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Noch keine Fahrten in diesem Monat</h3>
          <p className="text-sm text-muted-foreground mb-4">Erfassen Sie Ihre erste Fahrt.</p>
          <Button onClick={() => setModalOpen(true)} className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Fahrt hinzufügen
          </Button>
        </Card>
      ) : completedFahrten.length > 0 && (
        <div className="space-y-4">
          {days.filter(d => grouped[d].some(f => f.status !== 'offen')).map(day => {
            const dayCompleted = grouped[day].filter(f => f.status !== 'offen');
            return (
              <div key={day}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-sm font-semibold text-muted-foreground">{formatDate(day)}</p>
                  <p className="text-xs text-muted-foreground">{dayCompleted.reduce((s, f) => s + (f.kilometer || 0), 0).toFixed(1)} km</p>
                </div>
                <div className="space-y-2">
                  {dayCompleted.map(f => (
                    <Card key={f.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="w-4 h-4 text-brand shrink-0" />
                            <span className="truncate">{f.startort}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="truncate">{f.zielort}</span>
                          </div>
                          {f.zweck && <p className="text-xs text-muted-foreground mt-1 truncate">{f.zweck}</p>}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-lg font-bold text-brand">{(f.kilometer || 0).toFixed(1)} km</span>
                            {f.projekt_id && <Link to={`/projekte/${f.projekt_id}`} className="text-xs text-accent hover:underline truncate">{projName(f.projekt_id)}</Link>}
                            {f.uhrzeit_start && <span className="text-xs text-muted-foreground">{f.uhrzeit_start}{f.uhrzeit_ende ? `–${f.uhrzeit_ende}` : ''}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="text-muted-foreground hover:text-rose-500 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick-add modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Neue Fahrt</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Datum</Label>
              <Input type="date" value={form.datum} onChange={(e) => setForm({ ...form, datum: e.target.value })} className="min-h-[48px]" />
            </div>
            <div>
              <Label>Startort</Label>
              <Input value={form.startort} onChange={(e) => setForm({ ...form, startort: e.target.value })} placeholder="z.B. Zimmern ob Rottweil" className="min-h-[48px]" />
            </div>
            <div>
              <Label>Zielort</Label>
              <Input value={form.zielort} onChange={(e) => setForm({ ...form, zielort: e.target.value })} placeholder="z.B. Baustelle Schömberg" className="min-h-[48px]" />
            </div>
            <div>
              <Label>Kilometer</Label>
              <Input type="number" step="0.1" value={form.kilometer} onChange={(e) => setForm({ ...form, kilometer: e.target.value })} placeholder="z.B. 12.5" className="min-h-[48px]" />
            </div>
            <div>
              <Label>Zweck</Label>
              <Input value={form.zweck} onChange={(e) => setForm({ ...form, zweck: e.target.value })} placeholder="z.B. Baustellenbesuch" className="min-h-[48px]" />
            </div>
            <div>
              <Label>Projekt</Label>
              <Select value={form.projekt_id} onValueChange={(v) => setForm({ ...form, projekt_id: v })}>
                <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt wählen" /></SelectTrigger>
                <SelectContent>
                  {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Startzeit</Label>
                <Input type="time" value={form.uhrzeit_start} onChange={(e) => setForm({ ...form, uhrzeit_start: e.target.value })} className="min-h-[48px]" />
              </div>
              <div>
                <Label>Endzeit</Label>
                <Input type="time" value={form.uhrzeit_ende} onChange={(e) => setForm({ ...form, uhrzeit_ende: e.target.value })} className="min-h-[48px]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} className="bg-brand hover:bg-brand/90 text-white">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete-trip modal (for open trips from iOS Shortcut) */}
      <Dialog open={!!completeModal} onOpenChange={(o) => !o && setCompleteModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Fahrt vervollständigen</DialogTitle></DialogHeader>
          {completeModal && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{completeModal.startort} → {completeModal.zielort || 'Ziel'}</span>
                </div>
                <p className="text-xs">{(completeModal.kilometer || 0).toFixed(1)} km · {completeModal.uhrzeit_start}{completeModal.uhrzeit_ende ? `–${completeModal.uhrzeit_ende}` : ''}</p>
              </div>
              <div>
                <Label>Zweck</Label>
                <Input value={completeForm.zweck} onChange={(e) => setCompleteForm({ ...completeForm, zweck: e.target.value })} placeholder="z.B. Baustellenbesuch" className="min-h-[48px]" />
              </div>
              <div>
                <Label>Projekt</Label>
                <Select value={completeForm.projekt_id} onValueChange={(v) => setCompleteForm({ ...completeForm, projekt_id: v })}>
                  <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt wählen" /></SelectTrigger>
                  <SelectContent>
                    {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModal(null)}>Abbrechen</Button>
            <Button onClick={handleComplete} className="bg-brand hover:bg-brand/90 text-white gap-1.5">
              <Check className="w-4 h-4" /> Vervollständigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
