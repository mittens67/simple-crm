import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '../ui';
import './record-page.scss';

interface RecordPageProps {
  title: string;
  description?: string;
  back_to: string;
  back_label: string;
  actions?: ReactNode;
  /** Key/value facts rendered as a definition list. */
  facts: Array<{ label: string; value: ReactNode }>;
  /** The main column: timeline, AI panels, related records. */
  children: ReactNode;
  /** Optional extra panel in the sidebar under the facts. */
  aside?: ReactNode;
}

/**
 * The detail layout shared by leads, customers and deals.
 *
 * There were no per-record pages at all before this — every entity was a table
 * row plus an edit modal, so there was nowhere for a history, an AI summary or
 * related records to live.
 */
const RecordPage = ({
  title,
  description,
  back_to,
  back_label,
  actions,
  facts,
  children,
  aside,
}: RecordPageProps) => (
  <div className="record-page">
    <Link to={back_to} className="record-back">
      <ChevronLeft aria-hidden="true" />
      {back_label}
    </Link>

    <PageHeader title={title} description={description} actions={actions} />

    <div className="record-layout">
      <div className="record-main">{children}</div>

      <aside className="record-aside">
        <dl className="record-facts">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
        {aside}
      </aside>
    </div>
  </div>
);

export default RecordPage;
