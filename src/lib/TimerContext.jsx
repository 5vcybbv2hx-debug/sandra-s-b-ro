import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { roundToQuarter } from '@/lib/format';

const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  const [activeTimer, setActiveTimer] = useState(null);
  const [project, setProject] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveTimer();
  }, []);

  useEffect(() => {
    if (!activeTimer) {
      setElapsed(0);
      setProject(null);
      return;
    }
    const calc = () => {
      const start = new Date(activeTimer.start_zeit).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    calc();
    const interval = setInterval(calc, 1000);
    // Load project name
    base44.entities.Projekt.get(activeTimer.projekt_id).then(setProject).catch(() => {});
    return () => clearInterval(interval);
  }, [activeTimer]);

  const loadActiveTimer = async () => {
    try {
      const timers = await base44.entities.Timer_Aktiv.list();
      if (timers.length > 0) setActiveTimer(timers[0]);
    } catch (e) {
      console.error('Timer load error', e);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async (projekt_id, beschreibung) => {
    if (activeTimer) await stopTimerInternal(activeTimer);
    const now = new Date().toISOString();
    const timer = await base44.entities.Timer_Aktiv.create({
      projekt_id,
      start_zeit: now,
      beschreibung: beschreibung || '',
    });
    setActiveTimer(timer);
    setElapsed(0);
  };

  const stopTimerInternal = async (timer) => {
    const start = new Date(timer.start_zeit);
    const end = new Date();
    const hours = roundToQuarter((end - start) / 1000 / 3600);
    await base44.entities.Zeiteintrag.create({
      projekt_id: timer.projekt_id,
      datum: start.toISOString().split('T')[0],
      stunden: hours,
      beschreibung: timer.beschreibung || 'Timer',
      erfassungsart: 'Timer',
      timer_start: timer.start_zeit,
      timer_ende: end.toISOString(),
    });
    await base44.entities.Timer_Aktiv.delete(timer.id);
  };

  const stopTimer = async () => {
    if (!activeTimer) return;
    await stopTimerInternal(activeTimer);
    setActiveTimer(null);
    setElapsed(0);
    setProject(null);
  };

  return (
    <TimerContext.Provider value={{ activeTimer, elapsed, project, loading, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);