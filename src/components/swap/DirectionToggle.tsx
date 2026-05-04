import './direction-toggle.css';

interface DirectionToggleProps {
  onToggle: () => void;
  disabled?: boolean;
}

export function DirectionToggle({ onToggle, disabled }: DirectionToggleProps) {
  return (
    <div className="direction-rail" aria-hidden={disabled}>
      <button
        type="button"
        className="direction-toggle"
        onClick={onToggle}
        disabled={disabled}
        aria-label="Reverse swap direction"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M5 2.5v9M5 11.5l-2.5-2.5M5 11.5l2.5-2.5M11 13.5v-9M11 4.5l2.5 2.5M11 4.5L8.5 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
