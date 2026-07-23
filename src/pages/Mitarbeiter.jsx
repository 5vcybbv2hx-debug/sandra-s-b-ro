import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, Plus, Search } from 'lucide-react';
import { formatDate } from '@/lib/format';
import MitarbeiterFormModal from '@/components/mitarbeiter/MitarbeiterFormModal';
import { cn } from '@/lib/utils';

export default function Mitarbeiter() {
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setMitarbeiter(await base44.entities.Mitarbeiter.list('-name', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = mitarbeiter.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search && !m.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mitarbeiter</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} Mitarbeiter</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Neu
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen..." className="max-w-xs min-h-[48px]" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40 min-h-[48px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="Aktiv">Aktiv</SelectItem>
            <SelectItem value="Inaktiv">Inaktiv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-center py-8 text-muted-foreground">Lade...</p> :
       filtered.length === 0 ? (
        <Card className="p-8 border-dashed text-center">
          <UserCog className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Noch keine Mitarbeiter erfasst</p>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="mt-4 bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" /> Hinzufügen
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(m => (
            <Link key={m.id} to={`/mitarbeiter/${m.id}`}>
              <Card className="p-4 hover:bg-brand-light transition-colors min-h-[48px] h-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{m.rolle || '—'}</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', m.status === 'Aktiv' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {m.status}
                  </span>
                </div>
                {m.eintrittsdatum && <p className="text-xs text-muted-foreground mt-2">Seit {formatDate(m.eintrittsdatum)}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {showForm && <MitarbeiterFormModal onClose={() => setShowForm(false)} onSaved={load} editItem={editItem} />}
    </div>
  );
}