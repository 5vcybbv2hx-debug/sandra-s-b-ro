import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useOpenWunschCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    base44.entities.Aenderungswunsch.count({ status: 'Neu' })
      .then(c => { if (!cancelled) setCount(c); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return count;
}