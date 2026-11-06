import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Plus } from 'lucide-react';
import { FOCO_ICON_STROKE } from '@/components/finance/ui/focoUi';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  showPlus?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function FocoPrimaryButton({
  children,
  showPlus = true,
  className = '',
  type = 'button',
  ref,
  ...rest
}: Props) {
  return (
    <button ref={ref} type={type} className={`foco-primary-btn ${className}`.trim()} {...rest}>
      {showPlus ? <Plus size={20} strokeWidth={FOCO_ICON_STROKE} aria-hidden /> : null}
      {children}
    </button>
  );
}
