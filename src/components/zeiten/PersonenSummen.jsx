import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const formatHours = (h) => (h || 0).toFixed(1).replace('.', ',');

export default function PersonenSummen({ summen = [], einheit = 'h' }) {
  if (!summen.length) return null;
  const total = summen.reduce((s, p) => s + (p.wert || 0), 0);

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">Summen pro Person</p>
        <span className="text-sm font-bold text-brand-dark">
          {einheit === 'h' ? formatHours(total) : total.toFixed(1)} {einheit}
        </span>
      </div>
      <div className="space-y-1.5">
        {summen.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm">
            <span className={cn('truncate', s.id === 'none' && 'text-amber-600')}>{s.name}</span>
            <span className="font-semibold tabular-nums shrink-0 ml-2">
              {einheit === 'h' ? formatHours(s.wert) : (s.wert || 0).toFixed(1)} {einheit}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}