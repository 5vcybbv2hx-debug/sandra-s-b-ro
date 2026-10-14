import { createContext, useContext, useState, useCallback } from 'react';

const ElaraContext = createContext(null);

export function ElaraProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openElara = useCallback(() => setOpen(true), []);
  const closeElara = useCallback(() => setOpen(false), []);
  return (
    <ElaraContext.Provider value={{ open, openElara, closeElara }}>
      {children}
    </ElaraContext.Provider>
  );
}

export function useElara() {
  const ctx = useContext(ElaraContext);
  if (!ctx) return { open: false, openElara: () => {}, closeElara: () => {} };
  return ctx;
}