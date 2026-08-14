import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Check, X, Link2, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_ORDER = ['Offen', 'Zugeordnet', 'Nicht_zuordnenbar'];
const STATUS_LABELS = {
  Offen: 'Offen',
  Zugeordnet: 'Zugeordnet',
  Nicht_zuordnenbar: 'Nicht zuordnenbar',
};
const STATUS_COLORS = {
  Offen: 'bg-amber-100 text-amber-700 border-amber-200',
  Zugeordnet: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Nicht_zuordnenbar: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function RechnungsMatching() {
  const [records, setRecords] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [notizDraft, setNotizDraft] = useState({});
  const [linkDraft, setLinkDraft] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [recs, pros] = await Promise.all([
        base44.entities.RechnungsMatch.list('-datum', 500),
        base44.entities.Projekt.list('-projekt_name', 500),
      ]);
      setRecords(recs);
      setProjekte(pros);
    } catch (e) {
      toast.error('Fehler beim Laden');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.rechnr || '').toLowerCase().includes(q) || (r.kunde || '').toLowerCase().includes(q) || (r.phase || '').toLowerCase().includes(q);
  });

  const grouped = STATUS_ORDER.map(status => ({
    status,
    items: filtered.filter(r => r.status === status),
  }));

  const openItems = records.filter(r => r.status === 'Offen');
  const offenSumme = openItems.reduce((sum, r) => sum + (Number(r.betrag) || 0), 0);
  const offenCount = openItems.length;

  const updateRecord = async (id, data) => {
    try {
      await base44.entities.RechnungsMatch.update(id, data);
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (e) {
      toast.error('Speichern fehlgeschlagen');
      console.error(e);
    }
  };

  const handleLink = async (id) => {
    const projectId = linkDraft[id];
    if (!projectId) { toast.error('Bitte Projekt wählen'); return; }
    const proj = projekte.find(p => p.id === projectId);
    await updateRecord(id, { linked_project: projectId, status: 'Zugeordnet', notiz: notizDraft[id] ?? undefined });
    toast.success(`Verknüpft mit ${proj?.projekt_name || 'Projekt'}`);
    setLinkDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setNotizDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setExpandedId(null);
  };

  const handleNicht = async (id) => {
    await updateRecord(id, { status: 'Nicht_zuordnenbar', notiz: notizDraft[id] ?? undefined });
    toast.success('Als nicht zuordnenbar markiert');
    setNotizDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setExpandedId(null);
  };

  const handleNotizSave = async (id) => {
    await updateRecord(id, { notiz: notizDraft[id] || '' });
    toast.success('Notiz gespeichert');
    setNotizDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const formatEuro = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0);

  const Row = ({ r }) => {
    const isOpen = expandedId === r.id;
    const linkedProj = r.linked_project ? projekte.find(p => p.id === r.linked_project) : null;
    return (
      <Card className={cn('border-border', isOpen && 'ring-1 ring-brand')}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{r.rechnr}</span>
                <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cardbg text-muted-foreground">{r.phase || '—'}</span>
              </div>
              <p className="text-sm text-foreground mt-1 truncate">{r.kunde || '—'}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{r.datum || '—'}</span>
                <span className="font-semibold text-foreground">{formatEuro(r.betrag)}</span>
                {linkedProj && <span className="text-brand-dark flex items-center gap-1"><Link2 className="w-3 h-3" />{linkedProj.projekt_name}</span>}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setExpandedId(isOpen ? null : r.id); if (!isOpen) { setLinkDraft(prev => ({ ...prev, [r.id]: r.linked_project || '' })); setNotizDraft(prev => ({ ...prev, [r.id]: r.notiz || '' })); } }} className="shrink-0">
              {isOpen ? 'Schließen' : 'Bearbeiten'}
            </Button>
          </div>
        </CardHeader>
        {isOpen && (
          <CardContent className="p-4 pt-2 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Projekt verknüpfen</label>
              <div className="flex gap-2 mt-1">
                <Select value={linkDraft[r.id] ?? ''} onValueChange={v => setLinkDraft(prev => ({ ...prev, [r.id]: v }))}>
                  <SelectTrigger className="min-h-[40px] flex-1"><SelectValue placeholder="Projekt suchen & wählen" /></SelectTrigger>
                  <SelectContent>
                    {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => handleLink(r.id)} disabled={!linkDraft[r.id]} className="bg-status-abgeschlossen hover:bg-status-abgeschlossen/90 text-white min-h-[40px]"><Check className="w-4 h-4" />Zugeordnet</Button>
                <Button onClick={() => handleNicht(r.id)} variant="outline" className="min-h-[40px]"><X className="w-4 h-4" />Nicht zuordnenbar</Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notiz</label>
              <div className="flex gap-2 mt-1">
                <Textarea value={notizDraft[r.id] ?? ''} onChange={e => setNotizDraft(prev => ({ ...prev, [r.id]: e.target.value }))} rows={2} placeholder="z.B. monatliche Arbeitsstunden, Storno..." />
                <Button variant="outline" onClick={() => handleNotizSave(r.id)} className="min-h-[40px] self-start">Speichern</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-brand-dark" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Rechnungs-Matching</h1>
          <p className="text-sm text-muted-foreground">Rechnungen Projekten zuordnen</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche nach Rechnr, Kunde, Phase..." className="pl-9 min-h-[44px]" />
      </div>

      <Card className="bg-cardbg border-border">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Offene Rechnungen</p>
            <p className="text-2xl font-bold text-foreground">{offenCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Gesamtbetrag offen</p>
            <p className="text-2xl font-bold text-amber-600">{formatEuro(offenSumme)}</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Rechnungen...</div>
      ) : (
        grouped.map(group => (
          <div key={group.status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">{STATUS_LABELS[group.status]} <span className="text-muted-foreground">({group.items.length})</span></h2>
            </div>
            {group.items.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 pb-2">Keine Einträge</p>
            ) : (
              <div className="space-y-2">{group.items.map(r => <Row key={r.id} r={r} />)}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}