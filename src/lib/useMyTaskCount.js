import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useMyTaskCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    base44.entities.Aufgabe.count({ erledigt: false, zugewiesen_an_email: user.email })
      .then(c => { if (!cancelled) setCount(c); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.email]);

  return count;
}