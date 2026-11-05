import { useMemo } from 'react';

type Props = {
  burstKey: number;
};

/** Colores del manual: success, primary, chart-1 */
const COLORS = ['#34B36B', '#2F5BEA', '#F29D38'];

export function FinanceConfettiBurst({ burstKey }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: `${burstKey}-${i}`,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 7) * 0.04}s`,
        color: COLORS[i % COLORS.length],
        rotate: `${(i * 47) % 360}deg`,
        size: 6 + (i % 4) * 2,
      })),
    [burstKey],
  );

  return (
    <div
      className="finance-confetti-layer pointer-events-none fixed inset-0 z-[55] overflow-hidden motion-reduce:hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="finance-confetti-piece absolute top-[18%] block rounded-[1px]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            animationDelay: p.delay,
            transform: `rotate(${p.rotate})`,
            animationDuration: '1.2s',
          }}
        />
      ))}
    </div>
  );
}
