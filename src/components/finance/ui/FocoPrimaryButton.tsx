import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { FOCO_ICON_STROKE } from '@/components/finance/ui/focoUi';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  showPlus?: boolean;
};

export function FocoPrimaryButton({
  children,
  showPlus = true,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button type={type} className={`foco-primary-btn ${className}`.trim()} {...rest}>
      {showPlus ? <Plus size={20} strokeWidth={FOCO_ICON_STROKE} aria-hidden /> : null}
      {children}
    </button>
  );
}
