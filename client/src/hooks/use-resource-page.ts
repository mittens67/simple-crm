import { useCallback, useEffect, useState } from 'react';
import { useDialog } from '../components/dialogs/DialogProvider';

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
 */
export const useResourcePage = <T extends { id: string }, TInput>({
  crud,
  noun,
  debounce_ms = 300,
}: ResourcePageOptions<T, TInput>) => {
  const { showAlert, showConfirm } = useDialog();
  const [search_input, set_search_input] = useState('');
  const [modal_open, set_modal_open] = useState(false);
  const [editing, set_editing] = useState<T | null>(null);

  const { set_search } = crud;
  useEffect(() => {
    const timer = setTimeout(() => set_search(search_input), debounce_ms);
    return () => clearTimeout(timer);
  }, [search_input, set_search, debounce_ms]);

  const report = useCallback(
    async (err: unknown, action: string) => {
      const message = err instanceof Error ? err.message : `Failed to ${action} ${noun}`;
      crud.set_error(message);
      await showAlert('Error', `Error ${action}ing ${noun}: ${message}`);
    },
    [crud, noun, showAlert]
  );

  const submit = useCallback(
    async (input: TInput) => {
      try {
        if (editing) {
          await crud.update(editing.id, input);
        } else {
          await crud.create(input);
        }
        set_modal_open(false);
        set_editing(null);
      } catch (err) {
        await report(err, editing ? 'updat' : 'creat');
      }
    },
    [crud, editing, report]
  );

  const remove = useCallback(
    async (id: string) => {
      const confirmed = await showConfirm({
        title: `Delete ${noun}`,
        message: `Are you sure you want to delete this ${noun}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      });
      if (!confirmed) return;

      try {
        await crud.remove(id);
      } catch (err) {
        await report(err, 'delet');
      }
    },
    [crud, noun, report, showAlert, showConfirm]
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
    submit,
    remove,
    open_create,
    open_edit,
    close_modal,
  };
};
