import React, { useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from 'lucide-react/dist/esm/icons/search';

interface PickerPopoverProps<T> {
  items: T[];
  getKey: (item: T) => string;
  // What the search matches: names, usernames, addresses
  getSearchText: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  placeholder: string;
  emptyText: string;
  onPick: (item: T) => void;
  onClose: () => void;
  // Shown in place, as part of the form, instead of opened over it: it
  // stays until something is picked, and only takes focus when asked.
  inline?: boolean;
  autoFocus?: boolean;
  // The item already chosen, marked in the list
  selectedKey?: string;
}

// A searchable list in the site's menu-panel style, opened under the
// button that asked for it: type to narrow, arrows and Enter to pick,
// Escape or a click outside to close.
export default function PickerPopover<T>({
  items,
  getKey,
  getSearchText,
  renderItem,
  placeholder,
  emptyText,
  onPick,
  onClose,
  inline = false,
  autoFocus = !inline,
  selectedKey,
}: PickerPopoverProps<T>) {
  const [query, setQuery] = useState('');
  // In place, no row is marked until the arrows or a search pick one
  const [active, setActive] = useState(inline ? -1 : 0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return items;
    }
    return items.filter((item) => {
      const text = getSearchText(item).toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [items, query, getSearchText]);

  // The highlighted row stays within the list as it narrows
  const activeIndex = Math.min(active, Math.max(shown.length - 1, 0));

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
    if (inline) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose, inline, autoFocus]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(Math.min(activeIndex + 1, shown.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (event.key === 'Enter') {
      // inside the entry form: pick, never submit
      event.preventDefault();
      if (shown[activeIndex]) {
        onPick(shown[activeIndex]);
      }
    }
  };

  return (
    <div
      className={inline ? 'picker-inline' : 'picker-popover'}
      ref={rootRef}
      onKeyDown={onKeyDown}
    >
      <label className="picker-search">
        <SearchIcon aria-hidden width={16} height={16} />
        <input
          ref={inputRef}
          aria-label={placeholder}
          placeholder={placeholder}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
        />
      </label>
      {shown.length === 0 ? (
        <p className="picker-empty">{emptyText}</p>
      ) : (
        <ul className="picker-list" role="listbox">
          {shown.map((item, index) => (
            <li
              key={getKey(item)}
              role="option"
              aria-selected={
                selectedKey
                  ? getKey(item) === selectedKey
                  : index === activeIndex
              }
            >
              <button
                type="button"
                className={`picker-row ${
                  index === activeIndex ? 'is-active' : ''
                } ${getKey(item) === selectedKey ? 'is-selected' : ''}`}
                onClick={() => onPick(item)}
                onMouseEnter={() => setActive(index)}
              >
                {renderItem(item)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
