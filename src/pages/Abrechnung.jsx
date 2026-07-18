import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Euro } from 'lucide-react';
import { formatCurrency, formatDate, monthLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import AbrechnungErstellenModal from '@/components/AbrechnungErstellenModal';

const statusStyle = { Entwurf: 'bg-amber-50 text-amber-600', Versendet: 'bg-blue-50 text-blue-600', Bezahlt: 'bg-green-50 text-green-600' };

export default function Abrechnung() {
  const [records, setRecords] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fProjekt, setFProjekt] = useState('all');
  const [fMonat, setFMonat] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const months = Array.from({ length: 12 }, (_, i) => { const dd = new Date(new Date().getFullYear(), i, 1); return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`; });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { const [r, p] = await Promise.all([base44.entities.Abrechnung.list('-created_date', 200), base44.entities.Projekt.list('-updated_date', 200)]); setRecords(r); setProjekte(p); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const projName = (pid) => projekte.find(p => p.id === pid)?.projekt_name || '—';
  let filtered = records;
  if (fProjekt !== 'all') filtered = filtered.filter(r => r.projekt_id === fProjekt);
  if (fMonat !== 'all') filtered = filtered.filter(r => r.monat === fMonat);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl md:text-3xl font-bold">Abrechnung</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} Rechnungen</p></div><Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Neue Abrechnung</Button></div>
      <div className="flex gap-3">
        <Select value={fProjekt} onValueChange={setFProjekt}><SelectTrigger className="min-h-[48px] flex-1"><SelectValue placeholder="Projekt" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Projekte</SelectItem>{projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>
        <Select value={fMonat} onValueChange={setFMonat}><SelectTrigger className="min-h-[48px] w-48"><SelectValue placeholder="Monat" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Monate</SelectItem>{months.map(m => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading ? <p className="text-muted-foreground text-center py-8">Lade...</p> : (
        <div className="space-y-3">{filtered.map(r => (
          <Link key={r.id} to={`/abrechnung/${r.id}`} className="block"><Card className="p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-brand shrink-0" /><p className="font-medium truncate">{r.rechnungsnummer || '—'}</p></div><p className="text-sm text-muted-foreground truncate">{projName(r.projekt_id)} · {r.monat ? monthLabel(r.monat) : '—'}</p></div>
              <div className="text-right shrink-0"><p className="font-bold text-brand-dark">{formatCurrency(r.betrag_brutto)}</p><span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusStyle[r.status] || statusStyle.Entwurf)}>{r.status}</span></div>
            </div>
          </Card></Link>
        ))}{filtered.length === 0 && <p className="text-muted-foreground text-center py-12">Keine Abrechnungen gefunden.</p>}</div>
      )}
      {showCreate && <AbrechnungErstellenModal onClose={() => setShowCreate(false)} onCreated={loadData} />}
    </div>
  );
}