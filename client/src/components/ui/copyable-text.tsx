import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import './copyable-text.scss';

/**
 * A table cell value you are likely to want on the clipboard.
 *
 * Contact details are the worst-behaved things in a data table: an email is
 * long and arbitrary, a phone number is short and must never be broken across
 * lines. Left to `table-layout: auto`, one long address takes the column width
 * it wants and the phone column gets squeezed until it wraps mid-number.
 *
 * So `truncate` clips the value to the column with an ellipsis and exposes the
 * whole thing on hover via `title`, while the default keeps the value on one
 * line. Either way there is a copy button, because reading a phone number off
 * a screen to type it elsewhere is the actual task.
 */

const COPIED_FEEDBACK_MS = 1200;

interface CopyableTextProps {
  value: string | null | undefined;
  /** Describes what is being copied, for screen readers: "email address". */
  label: string;
  /** Clip to the column width with an ellipsis. Off by default. */
  truncate?: boolean;
  /** Rendered when there is no value. */
  empty?: string;
}

const CopyableText = ({ value, label, truncate = false, empty = '—' }: CopyableTextProps) => {
  const [copied, set_copied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The confirmation is on a timer, so it has to be cancelled if the row
  // unmounts first — sorting and paging both remount every cell.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  if (!value) return <span className="ui-copyable-empty">{empty}</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access needs a secure context and can be refused outright.
      // Failing quietly is right here: the value is on screen either way, and
      // a toast for a refused copy is noisier than the copy was worth.
      return;
    }
    set_copied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set_copied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <span className={`ui-copyable${truncate ? ' ui-copyable-truncate' : ''}`}>
      {/* title only where the text can actually be clipped, so a phone number
          does not sprout a tooltip repeating what is already visible. */}
      <span className="ui-copyable-value" title={truncate ? value : undefined}>
        {value}
      </span>
      <button
        type="button"
        className="ui-copyable-button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      {/* Announced to screen readers; the icon swap is the visual equivalent. */}
      <span className="visually-hidden" role="status" aria-live="polite">
        {copied ? `${label} copied` : ''}
      </span>
    </span>
  );
};

export default CopyableText;
