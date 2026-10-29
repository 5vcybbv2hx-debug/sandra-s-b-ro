import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_ITEMS = 100;

export default function ProjektSucheSelect({ projekte = [], value, onValueChange, placeholder = 'Projekt suchen...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = projekte.find(p => p.id === value);
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = terms.length
    ? projekte.filter(p => {
        const name = (p.projekt_name || '').toLowerCase();
        return terms.every(t => name.includes(t));
      })
    : projekte;
  const shown = filtered.slice(0, MAX_ITEMS);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-[48px] w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className={cn('truncate text-left', !selected && 'text-muted-foreground')}>
            {selected ? selected.projekt_name : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Projekt suchen..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Kein Projekt gefunden.</CommandEmpty>
            <CommandGroup>
              {shown.map(p => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => { onValueChange(p.id); setOpen(false); }}
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', value === p.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{p.projekt_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {filtered.length > shown.length && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {shown.length} von {filtered.length} – Suche verfeinern
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}