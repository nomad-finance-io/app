import { useId } from 'react';
import { formatTokenAmount } from '../../lib/format';
import type { TokenMeta } from '../../solana/tokens';
import './token-input.css';

interface TokenInputProps {
  label: string;
  token: TokenMeta;
  decimals: number;
  amountText: string;
  onChange?: (next: string) => void;
  balance?: bigint | null;
  onMax?: () => void;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function TokenInput({
  label,
  token,
  decimals,
  amountText,
  onChange,
  balance,
  onMax,
  readOnly,
  disabled,
  placeholder = '0.00',
}: TokenInputProps) {
  const id = useId();
  const handleChange = (value: string) => {
    if (readOnly || disabled) return;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onChange?.(value);
    }
  };

  return (
    <div className={`token-input${disabled ? ' is-disabled' : ''}`}>
      <div className="token-input-row">
        <label className="token-input-label" htmlFor={id}>
          {label}
        </label>
        {balance != null && (
          <div className="token-input-balance">
            <span>Balance {formatTokenAmount(balance, decimals, { maxFractionDigits: 4 })}</span>
            {onMax && !readOnly && (
              <button type="button" className="token-input-max" onClick={onMax}>
                Max
              </button>
            )}
          </div>
        )}
      </div>
      <div className="token-input-amount">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={amountText}
          readOnly={readOnly}
          disabled={disabled}
          onChange={(event) => handleChange(event.target.value)}
        />
        <div className="token-input-token" aria-label={`${token.symbol} token`}>
          <span className="token-symbol">{token.symbol}</span>
        </div>
      </div>
    </div>
  );
}
