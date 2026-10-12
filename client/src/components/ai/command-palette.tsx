import { useCallback, useEffect, useRef, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { AI_SEARCH_QUERY, AI_STATUS_QUERY } from '../../lib/graphql-queries';
import Button from '../ui/button';
import './command-palette.scss';

/**
 * Natural-language search, opened with Cmd/Ctrl+K.
 *
 * The question goes to the server, which asks the model for a *filter plan*
 * rather than a query, validates it against a strict allowlist and runs it
 * scoped to what the user may see. The plan's explanation is shown back so the
 * user can tell how their question was interpreted instead of trusting an
 * opaque result set.
 */

interface SearchPlan {
  entity: string;
  explanation?: string | null;
  filters: Record<string, unknown>;
}

interface SearchResult {
  plan: SearchPlan;
  total: number;
  has_more: boolean;
  leads?: Array<{ id: string; name: string; email: string; status: string }> | null;
  customers?: Array<{ id: string; name: string; email: string }> | null;
  deals?: Array<{
    id: string;
    title: string;
    value: number;
    status: string;
    stage?: { name: string } | null;
  }> | null;
  supportTickets?: Array<{
    id: string;
    issue_summary: string;
    status: string;
    priority: string;
    is_sla_breached: boolean;
  }> | null;
}

const ROUTE_BY_ENTITY: Record<string, string> = {
  leads: '/leads',
  customers: '/customers',
  deals: '/deals',
  support_tickets: '/support',
};

const EXAMPLES = [
  'my open leads',
  'deals over 50k',
  'urgent tickets that breached SLA',
  'converted leads this quarter',
];

const CommandPalette = () => {
  const [open, set_open] = useState(false);
  const [question, set_question] = useState('');
  const input_ref = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: status_data } = useQuery(AI_STATUS_QUERY);
  const [run_search, { data, loading, error }] = useLazyQuery(AI_SEARCH_QUERY, {
    fetchPolicy: 'network-only',
  });

  const close = useCallback(() => {
    set_open(false);
    set_question('');
  }, []);

  useEffect(() => {
    const on_key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        set_open((current) => !current);
      }
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', on_key);
    return () => window.removeEventListener('keydown', on_key);
  }, [close]);

  useEffect(() => {
    if (open) input_ref.current?.focus();
  }, [open]);

  if (!open) return null;

  const result = data?.aiSearch as SearchResult | undefined;
  const is_live = status_data?.aiStatus?.is_live ?? false;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed) run_search({ variables: { question: trimmed, limit: 10 } });
  };

  const go_to = (entity: string) => {
    const route = ROUTE_BY_ENTITY[entity];
    if (route) {
      navigate(route);
      close();
    }
  };

  const rows = (() => {
    if (!result) return [];
    if (result.leads) {
      return result.leads.map((lead) => ({
        key: lead.id,
        primary: lead.name,
        secondary: lead.email,
        badge: lead.status,
      }));
    }
    if (result.customers) {
      return result.customers.map((customer) => ({
        key: customer.id,
        primary: customer.name,
        secondary: customer.email,
        badge: null,
      }));
    }
    if (result.deals) {
      return result.deals.map((deal) => ({
        key: deal.id,
        primary: deal.title,
        secondary: `$${deal.value.toLocaleString()}${deal.stage ? ` · ${deal.stage.name}` : ''}`,
        badge: deal.status,
      }));
    }
    if (result.supportTickets) {
      return result.supportTickets.map((ticket) => ({
        key: ticket.id,
        primary: ticket.issue_summary,
        secondary: `${ticket.priority}${ticket.is_sla_breached ? ' · SLA breached' : ''}`,
        badge: ticket.status,
      }));
    }
    return [];
  })();

  return (
    <div className="palette-overlay" onClick={close} role="presentation">
      <div
        className="palette"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search your CRM"
      >
        <form onSubmit={submit} className="palette-form">
          <span className="palette-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={input_ref}
            type="text"
            value={question}
            onChange={(event) => set_question(event.target.value)}
            placeholder="Ask in plain English — e.g. deals over 50k closing this quarter"
            aria-label="Search question"
          />
          {/* Button defaults to type="button"; this one has to submit the form. */}
          <Button type="submit" variant="primary" disabled={loading || !question.trim()}>
            {loading ? 'Thinking…' : 'Search'}
          </Button>
        </form>

        {!is_live && (
          <p className="palette-note">
            Running on the built-in demo model — results are synthetic but the full
            validation path is real.
          </p>
        )}

        {!result && !loading && (
          <div className="palette-examples">
            <p>Try:</p>
            <ul>
              {EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => {
                      set_question(example);
                      run_search({ variables: { question: example, limit: 10 } });
                    }}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="palette-error">{error.message}</p>}

        {result && (
          <div className="palette-results">
            {/* Showing the interpretation is what makes this trustworthy. */}
            <div className="palette-plan">
              <strong>Understood as:</strong> {result.plan.explanation || result.plan.entity}
              {Object.keys(result.plan.filters).length > 0 && (
                <code>{JSON.stringify(result.plan.filters)}</code>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="palette-empty">No matches.</p>
            ) : (
              <ul className="palette-list">
                {rows.map((row) => (
                  <li key={row.key}>
                    <span className="palette-primary">{row.primary}</span>
                    <span className="palette-secondary">{row.secondary}</span>
                    {row.badge && <span className="palette-badge">{row.badge}</span>}
                  </li>
                ))}
              </ul>
            )}

            <div className="palette-footer">
              <span>
                {result.total} match{result.total === 1 ? '' : 'es'}
                {result.has_more && ' (showing the first 10)'}
              </span>
              <Button size="sm" onClick={() => go_to(result.plan.entity)}>
                Open {result.plan.entity.replace('_', ' ')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
