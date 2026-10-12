import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import './toast.scss';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 />,
  error: <AlertTriangle />,
  info: <Info />,
};

/** Errors stay longer, since they carry something the user has to read. */
const DURATIONS: Record<ToastTone, number> = {
  success: 3500,
  info: 4000,
  error: 6000,
};

let next_id = 0;

/**
 * Non-blocking feedback.
 *
 * Every success and failure previously went through `showAlert`, a modal the
 * user had to dismiss before continuing — so saving a record meant an
 * interruption on the happy path. Toasts are for outcomes; the confirm dialog
 * is still used where an actual decision is required.
 */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, set_toasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    set_toasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = next_id++;
      set_toasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), DURATIONS[tone]);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        // aria-live so the message is announced without stealing focus.
        <div className="ui-toasts" role="region" aria-live="polite" aria-label="Notifications">
          {toasts.map((toast) => (
            <div key={toast.id} className={`ui-toast ui-toast-${toast.tone}`}>
              <span className="ui-toast-icon">{ICONS[toast.tone]}</span>
              <p>{toast.message}</p>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                <X />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};
