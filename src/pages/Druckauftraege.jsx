import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Plus } from 'lucide-react';
import { formatDate, currentMonth } from '@/lib/format';
import DruckauftragFormModal from '@/components/druckauftraege/DruckauftragFormModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FORMATE = ['A4', 'A3', 'A2', 'A1', 'A0'];
const STATUS_STYLES = {
  Geplant: 'bg-blue-100 text-blue-700',
  Gedruckt: 'bg-amber-100 text-amber-700',
  Abgeholt: 'bg-emerald-100 text-emerald-700',
  Storniert: 'bg-gray-100 text-gray-500',
};
const NEXT_STATUS = { Geplant: 'Gedruckt', Gedruckt: 'Abgeholt' };

export default function Druckauftraege() {
  const [auftraege, setAuftraege] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [drucks, projs] = await Promise.all([
        base44.entities.Druckauftrag.list('-datum', 500),
        base44.entities.Projekt.list('-projekt_name', 500),
      ]);
      setAuftraege(drucks);
      setProjekte(projs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const projektName = (pid) => projekte.find(p => p.id === pid)?.projekt_name || '—';

  const advanceStatus = async (item) => {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    try {
      await base44.entities.Druckauftrag.update(item.id, { status: next });
      toast.success(`Status: ${next}`);
      load();
    } catch { toast.error('Fehler'); }
  };

  const cancel = async (item) => {
    try { await base44.entities.Druckauftrag.update(item.id, { status: 'Storniert' }); toast.success('Storniert'); load(); }
    catch { toast.error('Fehler'); }
  };

  const monthStr = currentMonth();
  const monthPrints = auftraege.filter(a => a.datum?.startsWith(monthStr) && a.status !== 'Storniert');
  const totalThisMonth = monthPrints.reduce((s, a) => s + (a.exemplare || 0), 0);
  const perFormat = FORMATE.map(f => ({ format: f, count: monthPrints.filter(a => a.format === f).reduce((s, a) => s + (a.exemplare || 0), 0) })).filter(f => f.count > 0);

  const filtered = filter === 'all' ? auftraege : auftraege.filter(a => a.status === filter);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Druckaufträge</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} Aufträge</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Neu
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Drucke diesen Monat</p>
          <p className="text-2xl font-bold text-brand-dark">{totalThisMonth}</p>
        </Card>
        {perFormat.map(f => (
          <Card key={f.format} className="p-4">
            <p className="text-xs text-muted-foreground">{f.format}</p>
            <p className="text-2xl font-bold text-brand-dark">{f.count}</p>
          </Card>
        ))}
      </div>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-40 min-h-[48px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Status</SelectItem>
          <SelectItem value="Geplant">Geplant</SelectItem>
          <SelectItem value="Gedruckt">Gedruckt</SelectItem>
          <SelectItem value="Abgeholt">Abgeholt</SelectItem>
          <SelectItem value="Storniert">Storniert</SelectItem>
        </SelectContent>
      </Select>

      {loading ? <p className="text-center py-8 text-muted-foreground">Lade...</p> :
       filtered.length === 0 ? (
        <Card className="p-8 border-dashed text-center">
          <Printer className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Keine Druckaufträge</p>
          <Button onClick={() => setShowForm(true)} className="mt-4 bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" /> Erstellen
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', STATUS_STYLES[a.status])}>{a.status}</span>
                    <span className="font-medium truncate">{projektName(a.projekt_id)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span>{formatDate(a.datum)}</span>
                    <span>{a.format}</span>
                    <span>{a.exemplare}x</span>
                    <span>{a.art}</span>
                  </div>
                  {a.notiz && <p className="text-xs text-muted-foreground mt-1 truncate">{a.notiz}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {NEXT_STATUS[a.status] && (
                    <Button size="sm" variant="outline" onClick={() => advanceStatus(a)} className="min-h-[40px]">{NEXT_STATUS[a.status]}</Button>
                  )}
                  {(a.status === 'Geplant' || a.status === 'Gedruckt') && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(a)} className="text-destructive min-h-[40px]">Stornieren</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && <DruckauftragFormModal onClose={() => setShowForm(false)} onSaved={load} projekte={projekte} />}
    </div>
  );
}