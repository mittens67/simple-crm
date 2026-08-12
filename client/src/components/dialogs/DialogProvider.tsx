import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { AlertDialog } from './AlertDialog';

interface DialogState {
  isOpen: boolean;
  type: 'confirm' | 'alert' | null;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Dialog context value exposed via useDialog hook.
 */
interface DialogContextType {
  /** Show a confirmation dialog that returns true/false on user action */
  showConfirm: (opts: Omit<DialogState, 'type' | 'isOpen'>) => Promise<boolean>;
  /** Show an alert dialog with a single OK button */
  showAlert: (title: string, message: string) => Promise<void>;
  /** Close any open dialog */
  close: () => void;
  /** Current dialog state (for advanced use cases) */
  state: DialogState;
}

const DialogContext = createContext<DialogContextType | null>(null);

/**
 * DialogProvider wraps the app to provide modal dialog functionality.
 * Replaces window.alert() and window.confirm() with accessible modal components.
 * Must wrap the component tree before useDialog can be called.
 *
 * Usage:
 * ```tsx
 * <DialogProvider>
 *   <App />
 * </DialogProvider>
 * ```
 */
export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    type: null,
    title: '',
    message: '',
  });

  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback((opts: Omit<DialogState, 'type' | 'isOpen'>) => {
    return new Promise<boolean>((resolve) => {
      setState((prev) => ({
        ...prev,
        ...opts,
        type: 'confirm',
        isOpen: true,
      }));
      setResolvePromise(() => resolve);
    });
  }, []);

  const showAlert = useCallback((title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setState((prev) => ({
        ...prev,
        title,
        message,
        type: 'alert',
        isOpen: true,
      }));
      setResolvePromise(() => () => resolve());
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
    setResolvePromise(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      await state.onConfirm?.();
      if (resolvePromise) resolvePromise(true);
      close();
    } catch (error) {
      console.error('Dialog confirm error:', error);
    }
  }, [state.onConfirm, resolvePromise, close]);

  const handleCancel = useCallback(() => {
    state.onCancel?.();
    if (resolvePromise) resolvePromise(false);
    close();
  }, [state.onCancel, resolvePromise, close]);

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert, close, state }}>
      {children}
      {state.isOpen && state.type === 'confirm' && (
        <ConfirmDialog
          title={state.title}
          message={state.message}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {state.isOpen && state.type === 'alert' && (
        <AlertDialog title={state.title} message={state.message} onClose={handleConfirm} />
      )}
    </DialogContext.Provider>
  );
};

/**
 * Access modal dialog functions. Must be called inside DialogProvider.
 *
 * Returns: { showAlert, showConfirm, close, state }
 *
 * Example:
 * ```tsx
 * const { showAlert, showConfirm } = useDialog();
 *
 * // Alert
 * await showAlert('Error', 'Something went wrong');
 *
 * // Confirm (returns true if user clicks confirm, false if cancels)
 * const confirmed = await showConfirm({
 *   title: 'Delete Item',
 *   message: 'Are you sure?',
 *   confirmText: 'Delete',
 *   cancelText: 'Cancel',
 * });
 * if (confirmed) { await deleteItem(); }
 * ```
 *
 * Throws: Error if used outside DialogProvider
 */
export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used inside DialogProvider');
  return context;
};
