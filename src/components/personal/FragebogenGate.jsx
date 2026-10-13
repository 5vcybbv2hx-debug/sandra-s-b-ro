import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

// Leitet Mitarbeiterinnen (Nicht-Admins) beim ersten Login zum Personalfragebogen.
export default function FragebogenGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [missing, setMissing] = useState(false);
  const needsCheck = !!user && user.role !== 'admin';

  useEffect(() => {
    if (!needsCheck) return;
    base44.entities.Personalfragebogen.filter({ status: 'Eingereicht' }, { limit: 1 })
      .then((p) => setMissing(p.items.length === 0))
      .catch(() => setMissing(false));
  }, [needsCheck, pathname]);

  if (needsCheck && missing && pathname !== '/personalfragebogen') {
    return <Navigate to="/personalfragebogen" replace />;
  }
  return null;
}