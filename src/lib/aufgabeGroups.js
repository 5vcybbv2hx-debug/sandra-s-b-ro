import { endOfWeek } from 'date-fns';
import { todayISO } from '@/lib/format';

export const BUCKETS = [
  { key: 'ueberfaellig', label: 'Überfällig', tone: 'text-red-500' },
  { key: 'heute', label: 'Heute', tone: 'text-brand-dark' },
  { key: 'morgen', label: 'Morgen', tone: 'text-foreground' },
  { key: 'woche', label: 'Diese Woche', tone: 'text-foreground' },
  { key: 'spaeter', label: 'Später', tone: 'text-muted-foreground' },
  { key: 'ohne', label: 'Ohne Datum', tone: 'text-muted-foreground' },
];

const PRIO_RANK = { A: 0, B: 1, C: 2 };

const addDaysISO = (iso, n) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export function bucketKeyFor(faelligAm) {
  if (!faelligAm) return 'ohne';
  const today = todayISO();
  if (faelligAm < today) return 'ueberfaellig';
  if (faelligAm === today) return 'heute';
  if (faelligAm === addDaysISO(today, 1)) return 'morgen';
  const end = endOfWeek(new Date(), { weekStartsOn: 1 });
  const endIso = end.toISOString().split('T')[0];
  if (faelligAm <= endIso) return 'woche';
  return 'spaeter';
}

export function groupAufgaben(aufgaben) {
  const groups = {};
  BUCKETS.forEach((b) => { groups[b.key] = []; });
  aufgaben.forEach((t) => {
    groups[bucketKeyFor(t.faellig_am)].push(t);
  });
  Object.keys(groups).forEach((k) => {
    groups[k].sort((a, b) => {
      const pa = PRIO_RANK[a.prioritaet] ?? 1;
      const pb = PRIO_RANK[b.prioritaet] ?? 1;
      if (pa !== pb) return pa - pb;
      return (a.faellig_am || '9999').localeCompare(b.faellig_am || '9999');
    });
  });
  return groups;
}

export function initialsOf(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}