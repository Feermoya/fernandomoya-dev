import { useEffect, useState } from 'react';
import type { FinanceAsset, FinanceEntry } from '@/lib/finance/types';

const ASSET_OPTIONS: { value: FinanceAsset; label: string }[] = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'Dólar MEP / USD' },
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'CEDEAR', label: 'CEDEARs' },
  { value: 'ETF', label: 'ETF' },
  { value: 'EMERGENCY_FUND', label: 'Fondo emergencia' },
  { value: 'PROJECT', label: 'Proyecto' },
  { value: 'OTHER', label: 'Otro' },
];

const PLATFORM_OPTIONS = ['Balanz', 'Exchange crypto', 'Banco', 'Otro'] as const;

type Props = {
  entry: FinanceEntry | null;
  onClose: () => void;
  onSave: (entry: FinanceEntry) => void;
};

export function FinanceEntryEditModal({ entry, onClose, onSave }: Props) {
  const [formMonth, setFormMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<FinanceAsset | ''>('');
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>('Balanz');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!entry) return;
    setFormMonth(entry.month);
    setAmount(String(entry.amount));
    setAsset(entry.asset ?? '');
    setPlatform((entry.platform as (typeof PLATFORM_OPTIONS)[number]) || 'Balanz');
    setCategory(entry.category ?? '');
    setNote(entry.note ?? '');
  }, [entry]);

  if (!entry) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;

    const updated: FinanceEntry = {
      ...entry,
      month: formMonth,
      amount: Math.round(n),
      createdAt: entry.createdAt,
    };
    if (asset) updated.asset = asset;
    else delete updated.asset;
    if (platform.trim()) updated.platform = platform.trim();
    else delete updated.platform;
    if (category.trim()) updated.category = category.trim();
    else delete updated.category;
    if (note.trim()) updated.note = note.trim();
    else delete updated.note;

    onSave(updated);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-entry-title"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="finance-card max-h-[90dvh] w-full max-w-md overflow-y-auto p-4"
      >
        <h2 id="edit-entry-title" className="text-base font-black text-slate-900">
          Editar inversión
        </h2>
        <p className="mt-1 text-xs text-slate-500">Corregí monto, mes o detalles.</p>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="finance-label">Monto</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            required
            className="finance-input-mobile min-h-[48px] rounded-xl px-3 text-lg font-black"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="finance-label">Mes</span>
          <input
            type="month"
            required
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm font-bold"
            value={formMonth}
            onChange={(e) => setFormMonth(e.target.value)}
          />
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="finance-label">Activo</span>
          <select
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm"
            value={asset}
            onChange={(e) => setAsset(e.target.value as FinanceAsset | '')}
          >
            <option value="">—</option>
            {ASSET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="finance-label">Plataforma</span>
          <select
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as (typeof PLATFORM_OPTIONS)[number])}
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="finance-label">Etiqueta</span>
          <input
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </label>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="finance-label">Nota</span>
          <textarea
            rows={2}
            className="finance-input-mobile resize-y rounded-xl px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] flex-1 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="finance-primary-button min-h-[48px] flex-1 text-sm"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
