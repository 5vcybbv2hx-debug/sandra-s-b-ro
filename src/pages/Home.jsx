import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTimer } from '@/lib/TimerContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Phone, Timer, ChevronRight, AlertTriangle, Sunset } from 'lucide-react';
import Morgenroutine from '@/components/Morgenroutine';
import WochenAuslastung from '@/components/WochenAuslastung';
import FeierabendCheckliste from '@/components/FeierabendCheckliste';
import StatusBadge from '@/components/StatusBadge';
import { formatDuration, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function Home() {
  const { user } = useAuth();
  const { activeTimer, elapsed, project, stopTimer } = useTimer();
  const [showMorgenroutine, setShowMorgenroutine] = useState(false);
  const [showFeierabend, setShowFeierabend] = useState(false);
  const [fokussiert, setFokussiert] = useState([]);
  const [naechsteSchritte, setNaechsteSchritte] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user?.role === 'admin') return; checkMorgenroutine(); loadData(); }, [user]);
  if (user?.role === 'admin') return <Navigate to="/projekte" replace />;

  const checkMorgenroutine = () => { const last = localStorage.getItem('sandra_morgenroutine'); if (last !== new Date().toISOString().split('T')[0]) setShowMorgenroutine(true); };

  const loadData = async () => {
    try {
      const [f, n, p, fi] = await Promise.all([
        base44.entities.Aufgabe.filter({ heute_fokussiert: true, erledigt: false }),
        base44.entities.Telefonnotiz.filter({ erledigt: false }),
        base44.entities.Projekt.filter({ status: 'Aktiv' }, '-deadline', 50),
        base44.entities.Firma.list('-name', 200),
      ]);
      setFokussiert(f);
      setNaechsteSchritte(n.filter((x) => x.naechster_schritt));
      setProjekte(p.slice(0, 5));
      setFirmen(fi);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const firmaName = (fid) => firmen.find((f) => f.id === fid)?.name || '';
  const toggleTask = async (task) => { await base44.entities.Aufgabe.update(task.id, { erledigt: true, erledigt_am: new Date().toISOString().split('T')[0], heute_fokussiert: false }); setFokussiert((prev) => prev.filter((t) => t.id !== task.id)); };
  const toggleNote = async (note) => { await base44.entities.Telefonnotiz.update(note.id, { erledigt: true }); setNaechsteSchritte((prev) => prev.filter((n) => n.id !== note.id)); };

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  if (showMorgenroutine) return <Morgenroutine onComplete={() => { setShowMorgenroutine(false); loadData(); }} />;

  const deadlineWarnings = projekte.filter((p) => { if (!p.deadline) return false; const days = Math.ceil((new Date(p.deadline) - now) / 86400000); return days <= 7; });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="text-sm text-muted-foreground capitalize">{dateStr}</p><h1 className="text-2xl md:text-3xl font-bold">Mein Büro heute</h1></div>
        <Button variant="outline" className="min-h-[48px] shrink-0" onClick={() => setShowFeierabend(true)}><Sunset className="w-4 h-4 mr-1" /> Feierabend</Button>
      </div>

      {deadlineWarnings.length > 0 && (
        <div className="space-y-2">{deadlineWarnings.map((p) => { const days = Math.ceil((new Date(p.deadline) - now) / 86400000); return (
          <Link key={p.id} to={`/projekte/${p.id}`} className={cn('flex items-center gap-3 p-3 rounded-xl min-h-[48px]', days <= 2 ? 'bg-red-50' : 'bg-amber-50')}>
            <AlertTriangle className={cn('w-5 h-5 shrink-0', days <= 2 ? 'text-red-600' : 'text-amber-600')} />
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.projekt_name}</p><p className={cn('text-xs', days <= 2 ? 'text-red-600' : 'text-amber-600')}>{days < 0 ? `${Math.abs(days)} Tage überfällig` : days === 0 ? 'Heute fällig' : `In ${days} Tagen fällig`}</p></div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>); })}</div>
      )}

      <WochenAuslastung />

      {activeTimer && (<Card className="p-5 bg-brand text-white border-0 shadow-md"><div className="flex items-center justify-between"><div className="flex items-center gap-3 min-w-0"><Timer className="w-5 h-5 shrink-0" /><div className="min-w-0"><p className="text-sm text-white/80">Laufender Timer</p><p className="font-semibold truncate">{project?.projekt_name || 'Projekt'}</p></div></div><div className="flex items-center gap-3 shrink-0"><span className="font-mono text-xl font-bold tabular-nums">{formatDuration(elapsed)}</span><button onClick={stopTimer} className="bg-white text-brand rounded-full px-4 py-2 text-sm font-semibold min-h-[40px]">Stop</button></div></div></Card>)}

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><CheckCircle2 className="w-5 h-5 text-brand" /><h2 className="font-semibold text-lg">Heute fokussiert</h2></div>
        {fokussiert.length === 0 ? <p className="text-center py-4 text-status-abgeschlossen font-medium">Alle Prioritäten erledigt ✓</p> : <div className="space-y-1">{fokussiert.map((task) => (<button key={task.id} onClick={() => toggleTask(task)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cardbg min-h-[48px] text-left transition-colors"><div className="w-6 h-6 rounded-full border-2 border-brand shrink-0 hover:bg-brand-light" /><span className="font-medium">{task.titel}</span></button>))}</div>}
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-accent" /><h2 className="font-semibold text-lg">Nächste Schritte</h2></div>
        {naechsteSchritte.length === 0 ? <p className="text-muted-foreground text-sm py-4">Keine offenen Schritte.</p> : <div className="space-y-1">{naechsteSchritte.slice(0, 5).map((note) => (<button key={note.id} onClick={() => toggleNote(note)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-cardbg min-h-[48px] text-left transition-colors"><div className="w-6 h-6 rounded-full border-2 border-accent shrink-0 hover:bg-accent-light" /><div className="min-w-0"><p className="font-medium truncate">{note.kontakt_name}</p><p className="text-sm text-muted-foreground truncate">{note.naechster_schritt}</p></div></button>))}</div>}
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><ChevronRight className="w-5 h-5 text-brand" /><h2 className="font-semibold text-lg">Aktive Projekte</h2></div>
        <div className="space-y-1">{projekte.map((p) => (<Link key={p.id} to={`/projekte/${p.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-cardbg min-h-[48px] transition-colors"><div className="min-w-0"><p className="font-medium truncate">{p.projekt_name}</p><p className="text-sm text-muted-foreground truncate">{firmaName(p.firma_id)}</p></div><div className="flex items-center gap-2 shrink-0"><span className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full">{p.aktuelle_phase || 'Entwurf'}</span><StatusBadge status={p.status} /></div></Link>))}{projekte.length === 0 && !loading && <p className="text-muted-foreground text-sm py-4">Keine aktiven Projekte.</p>}</div>
      </Card>

      {showFeierabend && <FeierabendCheckliste open={showFeierabend} onClose={() => setShowFeierabend(false)} />}
    </div>
  );
}