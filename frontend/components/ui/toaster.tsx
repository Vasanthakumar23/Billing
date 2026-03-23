'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: string; title: string; description?: string };
type ToastCtx = { toast: (t: Omit<Toast, 'id'>) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within Toaster');
  return ctx;
}

export function Toaster({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-3">
        {items.map((t) => (
          <div key={t.id} className="glass-panel w-80 rounded-2xl px-4 py-3">
            <div className="text-sm font-semibold text-white">{t.title}</div>
            {t.description ? <div className="mt-1 text-sm text-[#9aa8c2]">{t.description}</div> : null}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
