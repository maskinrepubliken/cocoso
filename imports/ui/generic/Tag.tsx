import SmallCloseIcon from 'lucide-react/dist/esm/icons/x';
import React from 'react';

// A filter chip: a pill that is paper when idle and filled with the
// municipality's green when chosen. `filterColor` is kept for category
// chips that carry a colour of their own (the calendar's resources).
export interface TagProps {
  label?: string;
  gradientBackground?: string | null;
  filterColor?: string;
  checkable?: boolean;
  checked?: boolean;
  removable?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

function Tag({
  label = '',
  gradientBackground = null,
  filterColor,
  checkable = false,
  checked = false,
  removable = false,
  onClick,
  onRemove,
}: TagProps) {
  const isNeutral = !filterColor || filterColor === '#484848';
  const accent = isNeutral ? 'var(--cocoso-colors-theme-700)' : filterColor;
  const background = checkable
    ? checked
      ? gradientBackground || accent
      : 'var(--cocoso-papper)'
    : gradientBackground || 'var(--cocoso-papper)';
  const color = checkable && checked ? 'white' : isNeutral ? 'var(--cocoso-colors-theme-700)' : accent;

  return (
    <span
      className={`filter-chip ${checkable ? 'is-checkable' : ''} ${checked ? 'is-checked' : ''}`}
      style={{
        background,
        color,
        boxShadow:
          checkable && checked
            ? 'none'
            : `inset 0 0 0 1.5px ${isNeutral ? 'var(--cocoso-linje)' : accent}`,
      }}
    >
      <button
        type="button"
        className="filter-chip-button"
        onClick={onClick}
        aria-pressed={checkable ? checked : undefined}
        style={{ color: 'inherit' }}
      >
        {label}
      </button>
      {removable && (
        <button
          type="button"
          className="filter-chip-remove"
          aria-label="Remove"
          onClick={onRemove}
        >
          <SmallCloseIcon width={14} height={14} />
        </button>
      )}
    </span>
  );
}

export default Tag;
