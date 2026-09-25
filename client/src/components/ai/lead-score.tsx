import type { Lead } from '../../types/lead';
import './lead-score.scss';

interface LeadScoreBadgeProps {
  lead: Lead;
  on_score?: () => void;
  scoring?: boolean;
}

/** Bands make a 0-100 number scannable in a table. */
const band = (score: number) => (score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold');

export const LeadScoreBadge = ({ lead, on_score, scoring }: LeadScoreBadgeProps) => {
  if (scoring) return <span className="score score-pending">Scoring…</span>;

  if (lead.ai_score == null) {
    return on_score ? (
      <button type="button" className="score score-empty" onClick={on_score}>
        Score
      </button>
    ) : (
      <span className="score score-empty">—</span>
    );
  }

  return (
    <button
      type="button"
      className={`score score-${band(lead.ai_score)}`}
      onClick={on_score}
      // The rationale is the useful part; surfacing it on hover keeps the
      // table scannable without hiding the model's reasoning entirely.
      title={lead.ai_rationale ?? undefined}
    >
      {lead.ai_score}
    </button>
  );
};

interface LeadInsightProps {
  lead: Lead;
  is_live: boolean;
}

/**
 * The rationale and suggested next action.
 *
 * A bare number is not actionable and not verifiable. Showing the reasoning
 * lets a rep judge whether the score is sensible rather than deferring to it.
 */
export const LeadInsight = ({ lead, is_live }: LeadInsightProps) => {
  if (lead.ai_score == null) return null;

  return (
    <div className="insight">
      <div className="insight-head">
        <span className={`score score-${band(lead.ai_score)}`}>{lead.ai_score}</span>
        <div>
          <p className="insight-title">AI assessment</p>
          <p className="insight-meta">
            {lead.ai_confidence != null && `${Math.round(lead.ai_confidence * 100)}% confidence`}
            {!is_live && ' · demo model'}
          </p>
        </div>
      </div>

      {lead.ai_rationale && <p className="insight-body">{lead.ai_rationale}</p>}

      {lead.ai_next_action && (
        <p className="insight-action">
          <strong>Next:</strong> {lead.ai_next_action}
        </p>
      )}
    </div>
  );
};
