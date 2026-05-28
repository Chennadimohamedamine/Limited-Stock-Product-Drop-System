import { useState, useEffect, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

let toastId = 0;
let externalAdd: ((msg: string, type: Toast['type']) => void) | null = null;

export function toast(message: string, type: Toast['type'] = 'info') {
  externalAdd?.(message, type);
}

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  useEffect(() => {
    externalAdd = add;
    return () => { externalAdd = null; };
  }, [add]);

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      zIndex: 1000, pointerEvents: 'none',
    }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#1a0808' : t.type === 'success' ? '#081a0d' : '#111',
          border: `1px solid ${t.type === 'error' ? 'var(--red)' : t.type === 'success' ? 'var(--green)' : 'var(--border-bright)'}`,
          color: t.type === 'error' ? 'var(--red)' : t.type === 'success' ? 'var(--green)' : 'var(--text)',
          padding: '10px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          borderRadius: 'var(--radius)',
          animation: 'slideIn 200ms ease',
          maxWidth: '320px',
          lineHeight: 1.4,
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
