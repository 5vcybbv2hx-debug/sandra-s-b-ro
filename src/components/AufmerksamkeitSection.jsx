import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, FileText, Shield, FolderKanban, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export default function AufmerksamkeitSection() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [angebote, vertraege, projekte, zeiten] = await Promise.all([
        base44.entities.Angebot.filter({ status: 'Verschickt' }),
        base44.entities.Vertrag.filter({ status: 'Aktiv' }),
        base44.entities.Projekt.filter({ status: 'Aktiv' }, '-deadline', 100),
        base44.entities.Zeiteintrag.list('-datum', 500),
      ]);

      const now = new Date();
      const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(now.getDate() - 14);
      const thirtyDays = new Date(now); thirtyDays.setDate(now.getDate() + 30);
      const ninetyDays = new Date(now); ninetyDays.setDate(now.getDate() + 90);

      const staleAngebote = angebote.filter(a => a.datum && new Date(a.datum) < fourteenDaysAgo);
      const dueVertraege = vertraege.filter(v => v.naechste_kuendigung && new Date(v.naechste_kuendigung) <= ninetyDays);
      const hasUrgentVertrag = dueVertraege.some(v => new Date(v.naechste_kuendigung) <= thirtyDays);

      const dow = (now.getDay() + 6) % 7;
      const monday = new Date(now); monday.setDate(now.getDate() - dow); monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
      const weekProjektIds = new Set(
        zeiten.filter(z => z.datum && (() => { const d = new Date(z.datum); return d >= monday && d <= sunday; })())
          .map(z => z.projekt_id)
      );
      const idleProjekte = projekte.filter(p => !weekProjektIds.has(p.id));

      const newAlerts = [];
      if (staleAngebote.length > 0)
        newAlerts.push({ type: 'angebote', count: staleAngebote.length, items: staleAngebote.slice(0, 5), link: '/angebote', icon: FileText, title: 'Angebote ohne Antwort', color: 'amber', subtitle: 'Älter als 14 Tage' });
      if (dueVertraege.length > 0)
        newAlerts.push({ type: 'vertraege', count: dueVertraege.length, items: dueVertraege.slice(0, 5), link: '/vertraege', icon: Shield, title: 'Verträge kündbar', color: hasUrgentVertrag ? 'red' : 'yellow', subtitle: hasUrgentVertrag ? '≤30 Tage' : '≤90 Tage' });
      if (idleProjekte.length > 0)
        newAlerts.push({ type: 'projekte', count: idleProjekte.length, items: idleProjekte.slice(0, 5), link: '/projekte', icon: FolderKanban, title: 'Keine Zeiten diese Woche', color: 'amber', subtitle: 'Aktive Projekte' });

      setAlerts(newAlerts);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return null;

  if (alerts.length === 0) return (
    <Card className="p-4 bg-emerald-50 border-emerald-200">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        <p className="font-medium text-emerald-700">Alles im grünen Bereich</p>
      </div>
    </Card>
  );

  const colorClasses = {
    amber: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    red: 'bg-red-50 border-red-200 hover:bg-red-100',
    yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
  };
  const iconColors = { amber: 'text-amber-600', red: 'text-red-600', yellow: 'text-yellow-600' };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h2 className="font-semibold text-lg">Das braucht deine Aufmerksamkeit</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map(a => (
          <Link key={a.type} to={a.link}>
            <Card className={cn('p-4 border transition-colors min-h-[48px]', colorClasses[a.color])}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <a.icon className={cn('w-5 h-5 shrink-0', iconColors[a.color])} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.count} • {a.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              {a.items.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {a.items.slice(0, 3).map(item => (
                    <p key={item.id} className="text-xs text-muted-foreground truncate">
                      {a.type === 'angebote' ? item.betreff
                        : a.type === 'vertraege' ? `${item.titel} (${formatDate(item.naechste_kuendigung)})`
                        : item.projekt_name}
                    </p>
                  ))}
                  {a.count > 3 && <p className="text-xs text-muted-foreground">+{a.count - 3} weitere</p>}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}