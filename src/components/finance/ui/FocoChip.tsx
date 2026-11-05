import type { ReactNode } from 'react';

export type FocoChipTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'successSolid'
  | 'danger'
  | 'warning'
  | 'level';

type Props = {
  children: ReactNode;
  tone?: FocoChipTone;
  className?: string;
  icon?: ReactNode;
};

const TONE: Record<FocoChipTone, string> = {
  neutral: 'foco-chip--neutral',
  primary: 'foco-chip--primary',
  success: 'foco-chip--success',
  successSolid: 'foco-chip--success-solid',
  danger: 'foco-chip--danger',
  warning: 'foco-chip--warning',
  level: 'foco-chip--level',
};

export function FocoChip({ children, tone = 'neutral', className = '', icon }: Props) {
  return (
    <span className={`foco-chip ${TONE[tone]} ${className}`.trim()}>
      {icon}
      {children}
    </span>
  );
}
