import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function FinancePasswordField({ id, label, value, autoComplete, disabled, onChange }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-xs font-bold text-[var(--text-secondary)]" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="finance-input-mobile min-h-[44px] w-full rounded-xl py-2 pl-3 pr-12 text-sm font-semibold"
        />
        <button
          type="button"
          disabled={disabled}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[var(--text-muted)] disabled:opacity-40"
        >
          {visible ? <EyeOff size={18} strokeWidth={1.75} aria-hidden /> : <Eye size={18} strokeWidth={1.75} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
