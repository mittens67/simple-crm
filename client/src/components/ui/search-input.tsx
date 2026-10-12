import { Search, X } from 'lucide-react';
import './search-input.scss';

interface SearchInputProps {
  value: string;
  on_change: (value: string) => void;
  placeholder?: string;
  /** Announced count, so results are not a purely visual change. */
  result_count?: number;
}

/**
 * The search box every list page hand-rolled, with a clear button and a live
 * region the old version had neither of — typing previously changed the table
 * with no announcement at all.
 */
const SearchInput = ({ value, on_change, placeholder, result_count }: SearchInputProps) => (
  <div className="ui-search">
    <Search className="ui-search-icon" aria-hidden="true" />
    <input
      type="search"
      value={value}
      onChange={(event) => on_change(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder ?? 'Search'}
    />
    {value && (
      <button type="button" onClick={() => on_change('')} aria-label="Clear search">
        <X />
      </button>
    )}
    {result_count !== undefined && (
      <span className="visually-hidden" aria-live="polite">
        {result_count} result{result_count === 1 ? '' : 's'}
      </span>
    )}
  </div>
);

export default SearchInput;
