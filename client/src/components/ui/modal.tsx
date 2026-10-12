import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './button';
import './modal.scss';

interface ModalProps {
  title: string;
  on_close: () => void;
  children: React.ReactNode;
  /** Rendered in the sticky footer, typically Cancel/Save. */
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Elements that can hold focus, for the focus trap.
 *
 * Explicitly excludes hidden and aria-hidden subtrees in the selector rather
 * than filtering on `offsetParent` afterwards: jsdom implements no layout, so
 * `offsetParent` is always null there and such a filter silently disables the
 * trap in tests while appearing to work in a browser.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((selector) => `${selector}:not([hidden]):not([aria-hidden="true"])`)
  .join(', ');

/** Controls a form dialog opens onto, preferred over the close button. */
const PRIMARY_CONTROL = 'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])';

/**
 * The one modal in the app.
 *
 * The six hand-rolled modals this replaces had none of the following, all of
 * which are the difference between a div that looks like a dialog and one that
 * behaves like one:
 *
 *   - rendered in a portal, so it cannot be clipped by a parent's overflow
 *   - `role="dialog"` + `aria-modal` + a labelled title
 *   - focus moved in on open and restored to the trigger on close
 *   - Tab cycles inside the dialog instead of escaping into the page behind
 *   - Escape closes it
 *   - background scroll locked while open
 */
const Modal = ({ title, on_close, children, footer, size = 'md' }: ModalProps) => {
  const dialog_ref = useRef<HTMLDivElement>(null);
  const previously_focused = useRef<HTMLElement | null>(null);
  const title_id = useId();

  useEffect(() => {
    previously_focused.current = document.activeElement as HTMLElement | null;

    // Prefer the first form control: landing on the close button is
    // technically correct but puts a form dialog one Tab away from useful.
    // Falls back to the first focusable element, then the dialog itself.
    const target =
      dialog_ref.current?.querySelector<HTMLElement>(PRIMARY_CONTROL) ??
      dialog_ref.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      dialog_ref.current;
    target?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      // Returning focus to the trigger is what makes keyboard use coherent.
      previously_focused.current?.focus();
    };
  }, []);

  const handle_key_down = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        on_close();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialog_ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap at both ends so focus never leaves the dialog.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [on_close]
  );

  return createPortal(
    <div className="ui-modal-overlay" onMouseDown={on_close}>
      <div
        ref={dialog_ref}
        className={`ui-modal ui-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title_id}
        tabIndex={-1}
        // mouseDown on the overlay closes; stopping it here means a drag that
        // starts inside the dialog and ends outside does not close it.
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handle_key_down}
      >
        <header className="ui-modal-header">
          <h2 id={title_id}>{title}</h2>
          <Button variant="ghost" size="sm" icon_only aria-label="Close dialog" onClick={on_close}>
            <X />
          </Button>
        </header>

        <div className="ui-modal-body">{children}</div>

        {footer && <footer className="ui-modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
