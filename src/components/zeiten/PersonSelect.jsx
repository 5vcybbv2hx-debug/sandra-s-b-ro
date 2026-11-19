import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Auswahlliste der aktiven Personen (alphabetisch). Eine bereits zugeordnete,
// inzwischen inaktive Person bleibt sichtbar, damit bestehende Einträge stimmen.
export default function PersonSelect({ mitarbeiter = [], value, onValueChange, placeholder = 'Person wählen', className }) {
  const personen = useMemo(() => {
    const aktive = mitarbeiter.filter(m => !m.status || m.status === 'Aktiv');
    const gewaehlt = value ? mitarbeiter.find(m => m.id === value) : null;
    const liste = gewaehlt && !aktive.some(m => m.id === gewaehlt.id) ? [...aktive, gewaehlt] : aktive;
    return [...liste].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  }, [mitarbeiter, value]);

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {personen.length === 0 ? (
          <SelectItem value="__keine" disabled>Keine aktive Person gefunden</SelectItem>
        ) : (
          personen.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)
        )}
      </SelectContent>
    </Select>
  );
}