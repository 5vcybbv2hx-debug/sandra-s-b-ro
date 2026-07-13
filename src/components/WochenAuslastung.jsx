import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { getWeeklyCapacity, getWarningThreshold } from '@/lib/settings';

export default function WochenAuslastung() {
  const [data, setData] = useState({ booked: 0, capacity: 20, threshold: 80, loading: true });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const capacity = getWeeklyCapacity();
      const threshold = getWarningThreshold();
      const now = new Date();
      const dayOfWeek = (now.getDay() + 6) % 7;
      const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek); monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
      const entries = await base44.entities.Zeiteintrag.list('-datum', 500);
      const weekEntries = entries.filter((e) => { if (!e.datum) return false; const d = new Date(e.datum); return d >= monday && d <= sunday; });
      const booked = weekEntries.reduce((sum, e) => sum + (e.stunden || 0), 0);
      setData({ booked, capacity, threshold, loading: false });
    } catch (e) { console.error(e); setData((prev) => ({ ...prev, loading: false })); }
  };

  const percent = data.capacity > 0 ? (data.booked / data.capacity) * 100 : 0;
  const status = percent >= 100
    ? { label: 'Überlastung — Deadlines prüfen', bg: 'bg-red-500', chip: 'bg-red-50 text-red-600' }
    : percent >= data.threshold
    ? { label: 'Du bist fast ausgelastet', bg: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600' }
    : { label: 'Auf Kurs', bg: 'bg-green-500', chip: 'bg-green-50 text-green-600' };

  if (data.loading) return <div className="h-24 bg-cardbg rounded-2xl animate-pulse" />;

  return (
    <Card className="p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-lg">Wochenauslastung</h2><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.chip}`}>{status.label}</span></div>
      <div className="flex items-baseline gap-2 mb-3"><span className="text-3xl font-bold text-brand-dark">{data.booked.toFixed(1)}</span><span className="text-muted-foreground">/ {data.capacity} h geplant</span></div>
      <div className="w-full bg-cardbg rounded-full h-3 overflow-hidden"><div className={`h-full rounded-full transition-all ${status.bg}`} style={{ width: `${Math.min(100, percent)}%` }} /></div>
      <p className="text-sm text-muted-foreground mt-2">{percent.toFixed(0)}% der Wochenkapazität</p>
    </Card>
  );
}