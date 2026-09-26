import type { ReactNode } from 'react';
import './primitives.scss';

// -----------------------------------------------------------------------------
// Badge
// -----------------------------------------------------------------------------

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/**
 * Status values map to a tone in one place, so a status pill looks the same
 * wherever it appears. Previously each page wrote its own `.status-*` classes
 * against hardcoded hex values.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  Open: 'info',
  Pending: 'warning',
  Archived: 'neutral',
  Converted: 'success',
  Won: 'success',
  Lost: 'danger',
  InProgress: 'brand',
  Resolved: 'success',
  Closed: 'neutral',
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
};

export const tone_for_status = (status: string): BadgeTone => STATUS_TONES[status] ?? 'neutral';

export const Badge = ({
  children,
  tone = 'neutral',
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  title?: string;
}) => (
  <span className={`ui-badge ui-badge-${tone}`} title={title}>
    {children}
  </span>
);

// -----------------------------------------------------------------------------
// Card
// -----------------------------------------------------------------------------

export const Card = ({
  children,
  className = '',
  as: Element = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}) => <Element className={`ui-card ${className}`.trim()}>{children}</Element>;

export const CardHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="ui-card-header">
    <h2>{title}</h2>
    {action}
  </div>
);

// -----------------------------------------------------------------------------
// PageHeader
// -----------------------------------------------------------------------------

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <header className="ui-page-header">
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="ui-page-header-actions">{actions}</div>}
  </header>
);

// -----------------------------------------------------------------------------
// EmptyState
// -----------------------------------------------------------------------------

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="ui-empty">
    {icon && <div className="ui-empty-icon">{icon}</div>}
    <p className="ui-empty-title">{title}</p>
    {description && <p className="ui-empty-description">{description}</p>}
    {action}
  </div>
);

// -----------------------------------------------------------------------------
// Skeleton
// -----------------------------------------------------------------------------

export const Skeleton = ({ width, height = '1.4rem' }: { width?: string; height?: string }) => (
  <span className="ui-skeleton" style={{ width, height }} aria-hidden="true" />
);

// -----------------------------------------------------------------------------
// Avatar
// -----------------------------------------------------------------------------

/** Two initials at most; a long name should not produce a wall of letters. */
export const initials_of = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const Avatar = ({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) => (
  <span className={`ui-avatar ui-avatar-${size}`} title={name} aria-hidden="true">
    {initials_of(name)}
  </span>
);

// -----------------------------------------------------------------------------
// StatTile
// -----------------------------------------------------------------------------

export const StatTile = ({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: BadgeTone;
}) => (
  <div className="ui-stat">
    {icon && <span className={`ui-stat-icon ui-stat-icon-${tone}`}>{icon}</span>}
    <div className="ui-stat-body">
      <p className="ui-stat-label">{label}</p>
      <p className="ui-stat-value">{value}</p>
      {hint && <p className="ui-stat-hint">{hint}</p>}
    </div>
  </div>
);
