import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './button.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks further clicks. */
  loading?: boolean;
  /** Rendered before the label — pass a lucide icon. */
  icon?: ReactNode;
  /** Square icon-only button; `aria-label` becomes required in practice. */
  icon_only?: boolean;
}

/**
 * Replaces `<button className="btn-primary">`, which appeared ~40 times with
 * its styles living in a page stylesheet.
 *
 * `type="button"` is the default on purpose: the HTML default is "submit",
 * which silently submits the enclosing form — a real bug the old markup was
 * one refactor away from.
 */
const Button = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  icon_only = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={[
      'ui-button',
      `ui-button-${variant}`,
      `ui-button-${size}`,
      icon_only ? 'ui-button-icon-only' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    disabled={disabled || loading}
    // Tells assistive tech the control is working, not broken.
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading ? <span className="ui-button-spinner" aria-hidden="true" /> : icon}
    {!icon_only && children}
  </button>
);

export default Button;

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children: ReactNode;
  title?: string;
}

/**
 * A link that looks like a button.
 *
 * Kept distinct from Button rather than given an `as` prop: navigation and
 * action are different things, and a real anchor keeps middle-click, "open in
 * new tab" and the browser's own affordances working.
 */
export const ButtonLink = ({
  to,
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  title,
}: ButtonLinkProps) => (
  <Link
    to={to}
    title={title}
    className={`ui-button ui-button-${variant} ui-button-${size} ui-button-link`}
  >
    {icon}
    {children}
  </Link>
);
