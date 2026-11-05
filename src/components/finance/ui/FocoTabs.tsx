import { useLayoutEffect, useRef, useState } from 'react';

export type FocoTabItem = {
  id: string;
  label: string;
};

type Props = {
  items: FocoTabItem[];
  value: string;
  onChange: (id: string) => void;
  'aria-label'?: string;
};

export function FocoTabs({ items, value, onChange, 'aria-label': ariaLabel }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(`[data-tab-id="${value}"]`);
    if (!active) return;
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value, items]);

  return (
    <nav ref={rootRef} className="foco-tabs" aria-label={ariaLabel}>
      <span
        className="foco-tabs__indicator"
        style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
        aria-hidden
      />
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          data-tab-id={item.id}
          className={`foco-tabs__btn ${value === item.id ? 'is-active' : ''}`}
          onClick={() => onChange(item.id)}
          aria-current={value === item.id ? 'page' : undefined}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
