type Props = {
  message: string;
  sub?: string;
};

export function FinanceMicroToast({ message, sub }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="finance-micro-toast pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2"
    >
      <div className="rounded-2xl border-2 border-emerald-400/55 bg-emerald-950/98 px-4 py-3.5 shadow-[0_20px_50px_-12px_rgba(16,185,129,0.75)] backdrop-blur-md">
        <p className="text-base font-black text-emerald-50 sm:text-lg">{message}</p>
        {sub ? <p className="mt-1 text-xs font-semibold text-emerald-200/90 sm:text-sm">{sub}</p> : null}
      </div>
    </div>
  );
}
