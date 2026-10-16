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
}: PickerPopoverProps<T>) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
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
    inputRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onClose]);

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
    <div className="picker-popover" ref={rootRef} onKeyDown={onKeyDown}>
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
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                className={`picker-row ${
                  index === activeIndex ? 'is-active' : ''
                }`}
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
