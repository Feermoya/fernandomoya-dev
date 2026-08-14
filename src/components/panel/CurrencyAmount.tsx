import type { Currency } from '@/lib/panel/types';
import { cn } from '@/lib/panel/cn';

const formatters: Record<Currency, Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
  ARS: new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }),
};

export function formatCurrencyAmount(amount: number, currency: Currency): string {
  return formatters[currency].format(amount);
}

type Props = {
  amount: number;
  currency: Currency;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function CurrencyAmount({ amount, currency, className, size = 'md' }: Props) {
  return (
    <span
      className={cn(
        'font-semibold tabular-nums tracking-tight break-all',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-xl',
        className,
      )}
    >
      {formatCurrencyAmount(amount, currency)}
    </span>
  );
}
