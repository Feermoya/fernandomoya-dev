import { useState } from 'react';
import type { FinanceGoal, FinanceGoalCategory } from '@/lib/finance/types';
import { formatARS } from '@/lib/finance/calculations';

type Props = {
  goals: FinanceGoal[];
  onAdd: (g: FinanceGoal) => void;
  onUpdate: (g: FinanceGoal) => void;
  onRemove: (id: string) => void;
};

const CATEGORIES: { value: FinanceGoalCategory; label: string }[] = [
  { value: 'emergency', label: 'Emergencia' },
  { value: 'investment', label: 'Inversión' },
  { value: 'freedom', label: 'Libertad' },
  { value: 'car', label: 'Auto' },
  { value: 'home', label: 'Hogar' },
  { value: 'business', label: 'Negocio / proyecto' },
  { value: 'travel', label: 'Viaje' },
  { value: 'other', label: 'Otro' },
];

const CAT_STYLE: Record<
  FinanceGoalCategory,
  { icon: string; card: string; bar: string }
> = {
  emergency: { icon: '🛡️', card: 'border-emerald-200 bg-emerald-50', bar: 'from-emerald-500 to-teal-500' },
  investment: { icon: '📊', card: 'border-violet-200 bg-violet-50', bar: 'from-violet-500 to-fuchsia-500' },
  freedom: { icon: '✨', card: 'border-amber-200 bg-amber-50', bar: 'from-amber-500 to-yellow-500' },
  car: { icon: '🚗', card: 'border-sky-200 bg-sky-50', bar: 'from-sky-500 to-blue-600' },
  home: { icon: '🏠', card: 'border-orange-200 bg-orange-50', bar: 'from-orange-500 to-amber-600' },
  business: { icon: '⚙️', card: 'border-cyan-200 bg-cyan-50', bar: 'from-cyan-500 to-indigo-600' },
  travel: { icon: '✈️', card: 'border-pink-200 bg-pink-50', bar: 'from-pink-500 to-rose-500' },
  other: { icon: '◎', card: 'border-slate-200 bg-slate-50', bar: 'from-slate-400 to-slate-600' },
};

export function FinanceGoals({ goals, onAdd, onUpdate, onRemove }: Props) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [category, setCategory] = useState<FinanceGoalCategory>('emergency');
  const [deadline, setDeadline] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = Number(targetAmount.replace(',', '.'));
    const c = Number(currentAmount.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(t) || t <= 0 || !Number.isFinite(c) || c < 0) return;

    const goal: FinanceGoal = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name.trim(),
      targetAmount: Math.round(t),
      currentAmount: Math.round(c),
      category,
      createdAt: new Date().toISOString(),
    };
    if (deadline) goal.deadline = deadline;

    onAdd(goal);
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
  };

  const st = CAT_STYLE[category];

  return (
    <section className="finance-card p-3 sm:p-4">
      <p className="text-xs font-medium text-slate-500">Creá o editá metas cuando quieras planificar un monto destino.</p>

      <form
        onSubmit={submit}
        className={`mt-4 grid grid-cols-1 gap-2.5 rounded-xl border-2 p-3 sm:grid-cols-2 sm:gap-3 ${st.card}`}
      >
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="finance-label">Nombre</span>
          <input
            required
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm font-semibold"
            placeholder="Ej. Colchón 6 meses"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="finance-label">Objetivo ARS</span>
          <input type="number" min={1} required className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="finance-label">Actual ARS</span>
          <input type="number" min={0} required className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="finance-label">Categoría</span>
          <select
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm font-semibold"
            value={category}
            onChange={(e) => setCategory(e.target.value as FinanceGoalCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="finance-label">Deadline</span>
          <input type="date" className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="finance-primary-button w-full py-3 text-sm sm:w-auto sm:px-6">
            Crear meta
          </button>
        </div>
      </form>

      {goals.length === 0 ? (
        <p className="mt-4 text-xs font-medium text-slate-500">Creá una meta cuando tengas un destino concreto.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            const cs = CAT_STYLE[g.category] ?? CAT_STYLE.other;
            return (
              <li
                key={g.id}
                className={`relative overflow-hidden rounded-2xl border-2 p-4 shadow-sm ${cs.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="text-2xl">{cs.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-900">{g.name}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {CATEGORIES.find((c) => c.value === g.category)?.label}
                        {g.deadline ? ` · ${g.deadline}` : ''}
                      </p>
                    </div>
                  </div>
                  <button type="button" className="shrink-0 text-xs font-bold text-slate-500 hover:text-red-600" onClick={() => onRemove(g.id)}>
                    Quitar
                  </button>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold tabular-nums text-slate-600">
                    {formatARS(g.currentAmount)} / {formatARS(g.targetAmount)}
                  </span>
                  <span className="text-lg font-black tabular-nums text-slate-900">{pct.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/60">
                  <div className={`h-full rounded-full bg-gradient-to-r ${cs.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <label className="mt-3 flex flex-col gap-1 text-[11px] font-bold uppercase text-slate-500">
                  Ajustar actual
                  <input
                    type="number"
                    min={0}
                    className="finance-input-mobile min-h-[40px] rounded-lg px-2 py-1.5 text-sm font-bold"
                    defaultValue={g.currentAmount}
                    key={`${g.id}-${g.currentAmount}`}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n) || n < 0) return;
                      onUpdate({ ...g, currentAmount: Math.round(n) });
                    }}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
