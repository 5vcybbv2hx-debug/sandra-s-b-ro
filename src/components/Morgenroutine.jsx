import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function Morgenroutine({ onComplete }) {
  const [step, setStep] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, n] = await Promise.all([
        base44.entities.Aufgabe.filter({ erledigt: false }),
        base44.entities.Telefonnotiz.filter({ erledigt: false }),
      ]);
      setTasks(t.filter((x) => x.prioritaet === 'A' || x.prioritaet === 'B'));
      setNotes(n.filter((x) => x.naechster_schritt));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (id) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const toggleNote = (id) => {
    setSelectedNotes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const finish = async () => {
    try {
      if (selectedTasks.length > 0) {
        await base44.entities.Aufgabe.bulkUpdate(
          selectedTasks.map((id) => ({ id, heute_fokussiert: true }))
        );
      }
      if (selectedNotes.length > 0) {
        await base44.entities.Telefonnotiz.bulkUpdate(
          selectedNotes.map((id) => ({ id, heute_anrufen: true }))
        );
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.setItem('sandra_morgenroutine', new Date().toISOString().split('T')[0]);
    onComplete();
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl py-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <p className="text-6xl mb-4">☀️</p>
              <h1 className="text-3xl font-bold text-foreground mb-2">Guten Morgen, Sandra</h1>
              <p className="text-lg text-muted-foreground mb-8 capitalize">{dateStr}</p>
              <Button
                size="lg"
                className="bg-brand hover:bg-brand-dark text-white min-h-[52px] px-10 text-base"
                onClick={() => setStep(1)}
              >
                Tag starten
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h2 className="text-2xl font-bold mb-1">Die 3 wichtigsten Aufgaben</h2>
              <p className="text-muted-foreground mb-6">
                Wähle 3 Aufgaben für heute ({selectedTasks.length}/3)
              </p>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Lade Aufgaben...</p>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border-2 transition-colors min-h-[48px]',
                        selectedTasks.includes(task.id)
                          ? 'border-brand bg-brand-light'
                          : 'border-border bg-white hover:border-brand/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                            selectedTasks.includes(task.id) ? 'bg-brand border-brand' : 'border-border'
                          )}
                        >
                          {selectedTasks.includes(task.id) && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium block truncate">{task.titel}</span>
                          {task.prioritaet === 'A' && (
                            <span className="text-xs text-accent font-medium">Priorität A</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      Keine offenen Aufgaben der Priorität A oder B.
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(0)} className="min-h-[48px]">
                  Zurück
                </Button>
                <Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setStep(2)}>
                  Weiter
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="calls"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <h2 className="text-2xl font-bold mb-1">Rückrufe heute</h2>
              <p className="text-muted-foreground mb-6">
                Markiere Telefonate, die du heute erledigen möchtest
              </p>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Lade Notizen...</p>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => toggleNote(note.id)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border-2 transition-colors min-h-[48px]',
                        selectedNotes.includes(note.id)
                          ? 'border-accent bg-accent-light'
                          : 'border-border bg-white hover:border-accent/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                            selectedNotes.includes(note.id) ? 'bg-accent border-accent' : 'border-border'
                          )}
                        >
                          {selectedNotes.includes(note.id) && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{note.kontakt_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{note.naechster_schritt}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">Keine offenen Rückrufe.</p>
                  )}
                </div>
              )}
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="min-h-[48px]">
                  Zurück
                </Button>
                <Button
                  className="bg-brand hover:bg-brand-dark text-white min-h-[48px]"
                  onClick={finish}
                >
                  Tag beginnen
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}