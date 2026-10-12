import type { ReactNode } from 'react';
import { PageHeader } from '../ui';
import SearchInput from '../ui/search-input';
import './list-page.scss';

interface ListPageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  search?: {
    value: string;
    on_change: (value: string) => void;
    placeholder: string;
    result_count?: number;
  };
  /** Filter controls rendered beside the search box. */
  filters?: ReactNode;
  children: ReactNode;
}

/**
 * The header + toolbar + content frame shared by every list screen.
 *
 * All six list pages previously repeated the same header/search/table/modal
 * block, and four of them rendered `<div className="leads">` regardless of what
 * they were listing — so the Deals page literally called itself "leads" in the
 * DOM and imported the leads stylesheet for its buttons.
 */
const ListPage = ({
  title,
  description,
  actions,
  search,
  filters,
  children,
}: ListPageProps) => (
  <div className="list-page">
    <PageHeader title={title} description={description} actions={actions} />

    {(search || filters) && (
      <div className="list-page-toolbar">
        {search && (
          <SearchInput
            value={search.value}
            on_change={search.on_change}
            placeholder={search.placeholder}
            result_count={search.result_count}
          />
        )}
        {filters && <div className="list-page-filters">{filters}</div>}
      </div>
    )}

    {children}
  </div>
);

export default ListPage;
