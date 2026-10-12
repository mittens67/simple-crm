import Button from './button';
import './pagination.scss';

interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  on_previous: () => void;
  on_next: () => void;
}

/**
 * Replaces the inline-styled prev/next bar that existed only on the leads
 * page, so every list can paginate consistently now that the server pages
 * them all.
 */
const Pagination = ({ offset, limit, total, on_previous, on_next }: PaginationProps) => {
  const page_count = Math.max(1, Math.ceil(total / limit));
  const current_page = Math.floor(offset / limit) + 1;
  const first = total === 0 ? 0 : offset + 1;
  const last = Math.min(offset + limit, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <Button size="sm" onClick={on_previous} disabled={offset === 0}>
        ← Previous
      </Button>

      <span className="pagination-status" aria-live="polite">
        {total === 0 ? 'No results' : `${first}–${last} of ${total}`}
        {total > 0 && ` · Page ${current_page} of ${page_count}`}
      </span>

      <Button size="sm" onClick={on_next} disabled={offset + limit >= total}>
        Next →
      </Button>
    </nav>
  );
};

export default Pagination;
