

interface SearchBarProps {
  value: string;
  onChange: (q: string) => void;
  resultCount: number;
  isSearching: boolean;
}

export function SearchBar({ value, onChange, resultCount, isSearching }: SearchBarProps) {
  return (
    <div className="search-wrapper">
      <div className="search-input-wrapper">
        <span className="search-icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          className="search-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Search notes by title or content…"
          aria-label="Search notes"
        />
        {value && (
          <button
            className="search-clear"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      {value && !isSearching && (
        <p className="search-results-info" aria-live="polite">
          {resultCount === 0
            ? 'No notes match your search'
            : `${resultCount} note${resultCount !== 1 ? 's' : ''} found`}
        </p>
      )}
    </div>
  );
}
