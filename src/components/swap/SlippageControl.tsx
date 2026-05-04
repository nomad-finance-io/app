import { useId } from 'react';
import './slippage-control.css';

const PRESETS = [10, 50, 100] as const;

interface SlippageControlProps {
  bps: number;
  onChange: (bps: number) => void;
}

export function SlippageControl({ bps, onChange }: SlippageControlProps) {
  const id = useId();
  return (
    <div className="slippage" role="group" aria-labelledby={id}>
      <span id={id} className="slippage-label">
        Slippage
      </span>
      <div className="slippage-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`slippage-preset${preset === bps ? ' is-active' : ''}`}
            onClick={() => onChange(preset)}
          >
            {(preset / 100).toFixed(preset < 100 ? 1 : 0)}%
          </button>
        ))}
      </div>
    </div>
  );
}
