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
import { Plus, Car, Download, Trash2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

export default function Fahrtenliste() {
  const [fahrten, setFahrten] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ datum: todayISO(), startort: '', zielort: '', zweck: '', kilometer: '', projekt_id: '', uhrzeit_start: '', uhrzeit_ende: '' });

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

  // Group by day
  const grouped = {};
  monthFahrten.forEach(f => { const d = f.datum || ''; if (!grouped[d]) grouped[d] = []; grouped[d].push(f); });
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const projName = (id) => projekte.find(p => p.id === id)?.projekt_name || '';

  const handleSave = async () => {
    if (!form.datum || !form.startort || !form.zielort || !form.kilometer) { toast.error('Bitte Datum, Startort, Zielort und Kilometer ausfüllen'); return; }
    try {
      const payload = { ...form, kilometer: Number(form.kilometer) || 0 };
      if (!payload.projekt_id) delete payload.projekt_id;
      await base44.entities.Fahrt.create(payload);
      toast.success('Fahrt hinzugefügt');
      setForm({ datum: todayISO(), startort: '', zielort: '', zweck: '', kilometer: '', projekt_id: '', uhrzeit_start: '', uhrzeit_ende: '' });
      setModalOpen(false);
      loadAll();
    } catch { toast.error('Speichern fehlgeschlagen'); }
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
          <p className="text-sm text-muted-foreground">{monthFahrten.length} Fahrt(en)</p>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Fahrten...</div>
      ) : monthFahrten.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-center border-dashed">
          <Car className="w-14 h-14 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Noch keine Fahrten in diesem Monat</h3>
          <p className="text-sm text-muted-foreground mb-4">Erfassen Sie Ihre erste Fahrt.</p>
          <Button onClick={() => setModalOpen(true)} className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Fahrt hinzufügen
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map(day => (
            <div key={day}>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-sm font-semibold text-muted-foreground">{formatDate(day)}</p>
                <p className="text-xs text-muted-foreground">{grouped[day].reduce((s, f) => s + (f.kilometer || 0), 0).toFixed(1)} km</p>
              </div>
              <div className="space-y-2">
                {grouped[day].map(f => (
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
          ))}
        </div>
      )}

      {/* Quick-add modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Neue Fahrt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Datum *</Label><Input type="date" value={form.datum} onChange={(e) => setForm(f => ({ ...f, datum: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Startzeit</Label><Input type="time" value={form.uhrzeit_start} onChange={(e) => setForm(f => ({ ...f, uhrzeit_start: e.target.value }))} /></div>
              <div><Label>Endzeit</Label><Input type="time" value={form.uhrzeit_ende} onChange={(e) => setForm(f => ({ ...f, uhrzeit_ende: e.target.value }))} /></div>
            </div>
            <div><Label>Startort *</Label><Input value={form.startort} onChange={(e) => setForm(f => ({ ...f, startort: e.target.value }))} placeholder="z.B. Büro" /></div>
            <div><Label>Zielort *</Label><Input value={form.zielort} onChange={(e) => setForm(f => ({ ...f, zielort: e.target.value }))} placeholder="z.B. Baustelle..." /></div>
            <div><Label>Zweck</Label><Input value={form.zweck} onChange={(e) => setForm(f => ({ ...f, zweck: e.target.value }))} placeholder="z.B. Baustellenbesuch" /></div>
            <div><Label>Kilometer *</Label><Input type="number" step="0.1" value={form.kilometer} onChange={(e) => setForm(f => ({ ...f, kilometer: e.target.value }))} placeholder="12.5" /></div>
            <div>
              <Label>Projekt (optional)</Label>
              <Select value={form.projekt_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, projekt_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Projekt wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} className="bg-brand hover:bg-brand/90 text-white">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}