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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 shadow-lg">
        <p className="text-base font-black text-emerald-700 sm:text-lg">{message}</p>
        {sub ? <p className="mt-1 text-xs font-semibold text-emerald-600 sm:text-sm">{sub}</p> : null}
      </div>
    </div>
  );
}
