import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import './data-table.scss';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Value used for client-side sorting; omit to make the column unsortable. */
  sort_value?: (row: T) => string | number | null | undefined;
  /** Hidden below the mobile breakpoint, for secondary columns. */
  hide_on_mobile?: boolean;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  row_key: (row: T) => string;
  loading?: boolean;
  /** Shown when there are no rows and nothing is loading. */
  empty?: ReactNode;
  /** Accessible description of the table's contents. */
  caption: string;
}

type SortState = { key: string; direction: 'asc' | 'desc' } | null;

/**
 * One table for every list in the app.
 *
 * Replaces six near-identical hand-rolled `<table>` blocks, none of which had
 * sorting, a loading state other than blanking the whole page, an empty state,
 * a caption, or any mobile handling.
 *
 * Sorting is client-side and therefore scoped to the current page — labelled
 * as such in the UI rather than pretending to sort the whole dataset, which
 * would need server-side ordering.
 */
function DataTable<T>({
  columns,
  rows,
  row_key,
  loading = false,
  empty,
  caption,
}: DataTableProps<T>) {
  const [sort, set_sort] = useState<SortState>(null);

  const sorted_rows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sort_value) return rows;

    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = column.sort_value!(a);
      const right = column.sort_value!(b);

      // Empty values sort last regardless of direction, so a column of mostly
      // blanks does not bury the rows that have data.
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [rows, sort, columns]);

  const toggle_sort = (key: string) => {
    set_sort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      // Third click clears the sort and restores server order.
      return null;
    });
  };

  const aria_sort = (key: string) => {
    if (sort?.key !== key) return undefined;
    return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const);
  };

  return (
    // The wrapper is what allows horizontal scroll on narrow screens without
    // the table forcing the whole page sideways.
    <div className="ui-table-wrap" tabIndex={0} role="group" aria-label={caption}>
      <table className="ui-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={[
                  column.hide_on_mobile ? 'ui-table-hide-mobile' : '',
                  column.align === 'right' ? 'ui-table-right' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-sort={aria_sort(column.key)}
              >
                {column.sort_value ? (
                  <button
                    type="button"
                    className="ui-table-sort"
                    onClick={() => toggle_sort(column.key)}
                  >
                    {column.header}
                    {sort?.key === column.key ? (
                      sort.direction === 'asc' ? (
                        <ArrowUp aria-hidden="true" />
                      ) : (
                        <ArrowDown aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown className="ui-table-sort-idle" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading && rows.length === 0 &&
            // Skeleton rows keep the layout stable instead of replacing the
            // entire page with a spinner.
            Array.from({ length: 5 }).map((_, row_index) => (
              <tr key={`skeleton-${row_index}`} className="ui-table-skeleton-row">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.hide_on_mobile ? 'ui-table-hide-mobile' : ''}
                  >
                    <span className="ui-skeleton" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="ui-table-empty">
                {empty ?? 'Nothing to show.'}
              </td>
            </tr>
          )}

          {sorted_rows.map((row) => (
            <tr key={row_key(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  // Used by the mobile stacked layout as a row label.
                  data-label={column.header}
                  className={[
                    column.hide_on_mobile ? 'ui-table-hide-mobile' : '',
                    column.align === 'right' ? 'ui-table-right' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {loading && rows.length > 0 && <div className="ui-table-refreshing">Updating…</div>}
    </div>
  );
}

export default DataTable;
