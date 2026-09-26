import { useCallback, useEffect, useState } from 'react';
import { useDialog } from '../components/dialogs/DialogProvider';
import { useToast } from '../components/ui';

interface CrudLike<T, TInput> {
  create: (input: TInput) => Promise<T>;
  update: (id: string, input: TInput) => Promise<T>;
  remove: (id: string) => Promise<boolean>;
  set_error: (message: string | null) => void;
  set_search: (term: string) => void;
}

interface ResourcePageOptions<T, TInput> {
  crud: CrudLike<T, TInput>;
  /** Singular, lower case — used in messages, e.g. "lead". */
  noun: string;
  debounce_ms?: number;
}

/**
 * The modal/search/confirm plumbing every list page repeated verbatim.
 *
 * Each of the four list pages had its own copy of: a 300ms debounce effect, a
 * create handler, an update handler and a delete handler, each wrapped in the
 * same try/catch that set hook error state and then awaited a blocking alert
 * dialog — roughly forty lines per page with only the noun changed.
 *
 * Outcomes are now toasts rather than modal alerts: a dialog the user must
 * dismiss is the wrong shape for "lead saved". The confirm dialog stays for
 * deletion, where a real decision is being asked for.
 */
export const useResourcePage = <T extends { id: string }, TInput>({
  crud,
  noun,
  debounce_ms = 300,
}: ResourcePageOptions<T, TInput>) => {
  const { showConfirm } = useDialog();
  const toast = useToast();
  const [search_input, set_search_input] = useState('');
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<T | null>(null);
  const [saving, set_saving] = useState(false);

  const { set_search } = crud;
  useEffect(() => {
    const timer = setTimeout(() => set_search(search_input), debounce_ms);
    return () => clearTimeout(timer);
  }, [search_input, set_search, debounce_ms]);

  const report = useCallback(
    (err: unknown, fallback: string) => {
      const message = err instanceof Error ? err.message : fallback;
      crud.set_error(message);
      toast.error(message);
    },
    [crud, toast]
  );

  const submit = useCallback(
    async (input: TInput) => {
      set_saving(true);
      const is_edit = Boolean(editing);
      try {
        if (editing) await crud.update(editing.id, input);
        else await crud.create(input);

        set_modal_open(false);
        set_editing(null);
        toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} ${is_edit ? 'updated' : 'created'}`);
      } catch (err) {
        report(err, `Failed to ${is_edit ? 'update' : 'create'} ${noun}`);
      } finally {
        set_saving(false);
      }
    },
    [crud, editing, noun, report, toast]
  );

  const remove = useCallback(
    async (id: string) => {
      const confirmed = await showConfirm({
        title: `Delete ${noun}`,
        message: `Are you sure you want to delete this ${noun}? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      });
      if (!confirmed) return;

      try {
        await crud.remove(id);
        toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} deleted`);
      } catch (err) {
        report(err, `Failed to delete ${noun}`);
      }
    },
    [crud, noun, report, showConfirm, toast]
  );

  const open_create = useCallback(() => {
    set_editing(null);
    set_modal_open(true);
  }, []);

  const open_edit = useCallback((item: T) => {
    set_editing(item);
    set_modal_open(true);
  }, []);

  const close_modal = useCallback(() => {
    set_modal_open(false);
    set_editing(null);
  }, []);

  return {
    search_input,
    set_search_input,
    modal_open,
    editing,
    saving,
    submit,
    remove,
    open_create,
    open_edit,
    close_modal,
  };
};
