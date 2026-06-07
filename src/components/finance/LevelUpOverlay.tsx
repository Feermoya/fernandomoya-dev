import { useCallback, useEffect, useId, useRef } from 'react';
import { getLevelTheme } from '@/lib/finance/levelTheme';

export type LevelUpOverlayProps = {
  open: boolean;
  level: number;
  title: string;
  icon: string;
  message?: string;
  onClose: () => void;
};

const AUTO_MS = 2800;
const PARTICLE_COUNT = 16;
const CONFETTI_COUNT = 14;

function hashToUnit(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function LevelUpOverlay({ open, level, title, icon, message, onClose }: LevelUpOverlayProps) {
  const theme = getLevelTheme(level);
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuto = useCallback(() => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    clearAuto();
    onClose();
  }, [clearAuto, onClose]);

  useEffect(() => {
    if (!open) {
      clearAuto();
      return;
    }
    closeBtnRef.current?.focus({ preventScroll: true });
    clearAuto();
    autoTimer.current = window.setTimeout(() => {
      autoTimer.current = null;
      onClose();
    }, AUTO_MS);
    return clearAuto;
  }, [open, onClose, clearAuto]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  if (!open) return null;

  const copy = message ?? 'Subiste porque separaste plata antes de gastarla.';

  return (
    <div
      className="finance-level-up-overlay fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <button
        type="button"
        className="finance-level-up-backdrop absolute inset-0 z-0 cursor-default border-0 bg-transparent finance-lvl-overlay-fade"
        aria-label="Cerrar celebración"
        onClick={handleClose}
      />

      <div className="finance-level-up-card relative z-[1] w-full max-w-[min(100%,24rem)] sm:max-w-lg finance-lvl-card-enter">
        <div
          className="finance-level-up-glow pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[min(130vw,560px)] w-[min(130vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-75 motion-reduce:opacity-45"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${theme.glow}, transparent 58%)`,
          }}
          aria-hidden
        />

        <div
          className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 pb-7 pt-8 text-center shadow-xl sm:px-8 sm:pb-8 sm:pt-10"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.07] motion-reduce:opacity-0" aria-hidden>
            <div
              className="finance-lvl-shine absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(115deg, transparent 40%, ${theme.glow} 50%, transparent 60%)`,
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]" aria-hidden>
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
              const u = hashToUnit(i, level);
              const x = (u - 0.5) * 200;
              const delay = Math.round(i * 45 + u * 120);
              const size = 2 + Math.round(u * 2);
              const dur = 2.4 + u * 0.8;
              const bg = i % 3 === 0 ? theme.glow : i % 3 === 1 ? theme.text : theme.border;
              return (
                <span
                  key={`p-${i}`}
                  className="finance-level-up-particle absolute bottom-0 left-1/2 rounded-full motion-reduce:!opacity-25"
                  style={
                    {
                      width: size,
                      height: size,
                      marginLeft: -(size / 2),
                      background: bg,
                      '--x': `${x}px`,
                      '--delay': `${delay}ms`,
                      '--dur': `${dur}s`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]" aria-hidden>
            {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
              const u = hashToUnit(i + 9, level);
              const left = 8 + u * 84;
              const delay = i * 55;
              const rot = -40 + u * 80;
              const w = 5 + (i % 3);
              const h = 3 + (i % 2);
              return (
                <span
                  key={`c-${i}`}
                  className="finance-level-up-confetti absolute top-[42%] rounded-[1px] motion-reduce:!opacity-20"
                  style={
                    {
                      left: `${left}%`,
                      width: w,
                      height: h,
                      background: i % 2 === 0 ? theme.ring : theme.textMuted,
                      '--r': `${rot}deg`,
                      animationDelay: `${delay}ms`,
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>

          <p className="relative text-center text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 finance-lvl-stagger-1 sm:text-[11px]">
            Nivel desbloqueado
          </p>

          <div className="relative mx-auto mt-6 flex w-fit flex-col items-center">
            <div
              className="finance-level-up-ring pointer-events-none absolute inset-[-14px] rounded-full motion-reduce:animate-none"
              style={{
                background: `conic-gradient(from 0deg, transparent, ${theme.ring}, transparent 55%)`,
                opacity: 0.55,
                maskImage: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                WebkitMaskImage:
                  'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              }}
              aria-hidden
            />
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border-2 bg-gradient-to-br shadow-2xl finance-lvl-num-pop"
              style={{
                borderColor: theme.border,
                background: `linear-gradient(145deg, ${theme.from}, ${theme.to})`,
                boxShadow: `0 0 56px -6px ${theme.glow}, inset 0 1px 0 rgba(255,255,255,0.28)`,
              }}
            >
              <span
                className="text-[3.25rem] font-black leading-none tabular-nums tracking-tighter text-white sm:text-[3.75rem]"
                style={{ textShadow: `0 0 36px ${theme.glow}` }}
                aria-hidden
              >
                {level}
              </span>
            </div>
          </div>

          <h2
            id={titleId}
            className="relative mt-5 text-center text-2xl font-black tracking-tight text-slate-900 finance-lvl-stagger-2 sm:text-3xl"
          >
            {title}
          </h2>

          <p className="relative mt-2 text-center text-4xl finance-lvl-stagger-2 sm:text-5xl" aria-hidden>
            {icon}
          </p>

          <p id={descId} className="relative mt-5 text-center text-sm font-medium leading-relaxed text-slate-600 finance-lvl-stagger-3 sm:text-[15px]">
            {copy}
          </p>

          <button
            ref={closeBtnRef}
            type="button"
            className="finance-primary-button relative mt-8 w-full py-3 text-sm finance-lvl-stagger-3 sm:mt-9"
            onClick={handleClose}
          >
            Continuar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes finance-lvl-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes finance-lvl-card-in {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes finance-lvl-num-pop {
          0% { opacity: 0; transform: scale(0.72); }
          55% { opacity: 1; transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes finance-lvl-stagger-1 {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes finance-lvl-stagger-2 {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes finance-lvl-stagger-3 {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes finance-lvl-ring-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes finance-lvl-shine-move {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes finance-lvl-particle-rise {
          0% {
            opacity: 0;
            transform: translate3d(var(--x, 0px), 24px, 0) scale(0.6);
          }
          12% { opacity: 0.85; }
          100% {
            opacity: 0;
            transform: translate3d(var(--x, 0px), -220px, 0) scale(1);
          }
        }
        @keyframes finance-lvl-confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -12px, 0) rotate(var(--r, 0deg));
          }
          15% { opacity: 0.75; }
          100% {
            opacity: 0;
            transform: translate3d(0, 120px, 0) rotate(calc(var(--r, 0deg) + 120deg));
          }
        }
        .finance-level-up-overlay { isolation: isolate; }
        .finance-lvl-overlay-fade {
          animation: finance-lvl-overlay-in 0.35s ease-out both;
        }
        .finance-lvl-card-enter {
          animation: finance-lvl-card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .finance-lvl-num-pop {
          animation: finance-lvl-num-pop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .finance-lvl-stagger-1 {
          animation: finance-lvl-stagger-1 0.45s ease-out 0.08s both;
        }
        .finance-lvl-stagger-2 {
          animation: finance-lvl-stagger-2 0.5s ease-out 0.18s both;
        }
        .finance-lvl-stagger-3 {
          animation: finance-lvl-stagger-3 0.5s ease-out 0.28s both;
        }
        .finance-level-up-ring {
          animation: finance-lvl-ring-spin 8s linear infinite;
        }
        .finance-lvl-shine {
          animation: finance-lvl-shine-move 2.2s ease-in-out infinite;
        }
        .finance-level-up-particle {
          animation: finance-lvl-particle-rise var(--dur, 2.6s) ease-out var(--delay, 0ms) both;
        }
        .finance-level-up-confetti {
          animation: finance-lvl-confetti-fall 2.4s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .finance-lvl-overlay-fade,
          .finance-lvl-card-enter,
          .finance-lvl-num-pop,
          .finance-lvl-stagger-1,
          .finance-lvl-stagger-2,
          .finance-lvl-stagger-3 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .finance-level-up-ring { animation: none !important; }
          .finance-lvl-shine { animation: none !important; }
          .finance-level-up-particle,
          .finance-level-up-confetti {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
