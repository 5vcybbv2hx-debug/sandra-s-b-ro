import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronsUpDown, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PROJEKTARTEN = ['Wohnbau', 'Gewerbebau', 'Öffentliches Bauvorhaben', 'Umbau/Sanierung', 'Sonstiges', 'Intern'];

export default function ProjektSelect({ value, onValueChange, onProjectCreated, placeholder = 'Projekt wählen...', filter, className }) {
  const [open, setOpen] = useState(false);
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('list');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newProj, setNewProj] = useState({ projekt_name: '', firma_name: '', projektart: 'Sonstiges' });

  const load = async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([
        filter
          ? base44.entities.Projekt.filter(filter, '-updated_date', 200)
          : base44.entities.Projekt.list('-updated_date', 200),
        base44.entities.Firma.list('name', 200).catch(() => [])
      ]);
      setProjekte(p);
      setFirmen(f);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const selected = projekte.find(p => p.id === value);
  const filtered = search
    ? projekte.filter(p => p.projekt_name?.toLowerCase().includes(search.toLowerCase()))
    : projekte;

  const handleCreate = async () => {
    if (!newProj.projekt_name.trim()) return;
    setCreating(true);
    try {
      let firma_id = undefined;
      if (newProj.firma_name.trim()) {
        const existing = firmen.find(f => f.name?.toLowerCase() === newProj.firma_name.toLowerCase());
        if (existing) {
          firma_id = existing.id;
        } else {
          const createdFirma = await base44.entities.Firma.create({ name: newProj.firma_name.trim() });
          firma_id = createdFirma.id;
        }
      }
      const created = await base44.entities.Projekt.create({
        projekt_name: newProj.projekt_name.trim(),
        firma_id,
        projektart: newProj.projektart,
        status: 'Aktiv'
      });
      setProjekte(prev => [created, ...prev]);
      onProjectCreated?.(created);
      onValueChange(created.id);
      setNewProj({ projekt_name: '', firma_name: '', projektart: 'Sonstiges' });
      setMode('list');
      setSearch('');
      setOpen(false);
      toast.success('Projekt angelegt');
    } catch (e) {
      toast.error('Projekt konnte nicht angelegt werden');
    } finally {
      setCreating(false);
    }
  };

  const closePopover = (o) => {
    setOpen(o);
    if (!o) {
      setMode('list');
      setSearch('');
    }
  };

  return (
    <Popover open={open} onOpenChange={closePopover}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.projekt_name : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {mode === 'list' ? (
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Projekt suchen..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Lade...' : 'Kein Projekt gefunden.'}
              </CommandEmpty>
              <CommandGroup>
                {filtered.map(p => (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    onSelect={() => {
                      onValueChange(p.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === p.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{p.projekt_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem onSelect={() => setMode('create')}>
                  <Plus className="mr-2 h-4 w-4 text-brand" />
                  <span className="text-brand font-medium">Neues Projekt anlegen</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          <div className="p-3 space-y-3">
            <button
              type="button"
              onClick={() => setMode('list')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Zurück zur Liste
            </button>
            <div className="space-y-1">
              <label className="text-xs font-medium">Projektname *</label>
              <Input
                value={newProj.projekt_name}
                onChange={e => setNewProj({ ...newProj, projekt_name: e.target.value })}
                placeholder="z.B. Neubau Müller"
                autoFocus
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Firma / Kunde (optional)</label>
              <Input
                value={newProj.firma_name}
                onChange={e => setNewProj({ ...newProj, firma_name: e.target.value })}
                placeholder="z.B. Architekturbüro Schmidt"
                list="projekt-select-firmen"
                className="h-9"
              />
              <datalist id="projekt-select-firmen">
                {firmen.map(f => (
                  <option key={f.id} value={f.name} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Projektart (optional)</label>
              <Select
                value={newProj.projektart}
                onValueChange={v => setNewProj({ ...newProj, projektart: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJEKTARTEN.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newProj.projekt_name.trim() || creating}
              className="w-full bg-brand hover:bg-brand-dark text-white"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Anlegen & wählen
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}