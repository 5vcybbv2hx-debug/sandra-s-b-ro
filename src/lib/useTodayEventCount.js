import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let cache = { count: 0, date: null, promise: null };

function isSameDay(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function useTodayEventCount() {
  const [count, setCount] = useState(cache.count);

  useEffect(() => {
    const today = new Date();
    if (cache.date && isSameDay(cache.date, today)) {
      setCount(cache.count);
      return;
    }

    if (cache.promise) {
      cache.promise.then(setCount);
      return;
    }

    cache.promise = base44.entities.KalenderEvent.list('-start_datetime', 500)
      .then(events => {
        const filtered = events.filter(e => {
          if (!e.start_datetime || e.sync_status === 'deleted_outlook') return false;
          return isSameDay(new Date(e.start_datetime), new Date());
        });
        cache.count = filtered.length;
        cache.date = new Date();
        cache.promise = null;
        setCount(filtered.length);
      })
      .catch(() => {
        cache.promise = null;
        setCount(0);
      });
  }, []);

  return count;
}
