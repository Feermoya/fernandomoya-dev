import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
};

export function FocoCard({
  children,
  className = '',
  as: Tag = 'section',
  ...rest
}: Props) {
  return (
    <Tag className={`foco-card ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
