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
  emergency: { icon: '🛡️', card: 'border-emerald-500/40 from-emerald-950/90 to-slate-950', bar: 'from-emerald-400 to-teal-500' },
  investment: { icon: '📊', card: 'border-violet-500/40 from-violet-950/90 to-slate-950', bar: 'from-violet-400 to-fuchsia-500' },
  freedom: { icon: '✨', card: 'border-amber-500/40 from-amber-950/90 to-slate-950', bar: 'from-amber-400 to-yellow-500' },
  car: { icon: '🚗', card: 'border-sky-500/40 from-sky-950/90 to-slate-950', bar: 'from-sky-400 to-blue-600' },
  home: { icon: '🏠', card: 'border-orange-500/40 from-orange-950/90 to-slate-950', bar: 'from-orange-400 to-amber-600' },
  business: { icon: '⚙️', card: 'border-cyan-500/40 from-cyan-950/90 to-slate-950', bar: 'from-cyan-400 to-indigo-600' },
  travel: { icon: '✈️', card: 'border-pink-500/40 from-fuchsia-950/90 to-slate-950', bar: 'from-pink-400 to-rose-500' },
  other: { icon: '◎', card: 'border-slate-500/40 from-slate-900 to-slate-950', bar: 'from-slate-400 to-slate-600' },
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
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-4 shadow-xl backdrop-blur-md sm:p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-300/90">Side quests</p>
      <h3 className="mt-1 text-xl font-black text-white">Metas que ordenan decisiones</h3>
      <p className="mt-2 text-sm font-medium text-slate-400">
        Misiones secundarias: cada una te obliga a mirar un número que antes evitabas.
      </p>

      <form
        onSubmit={submit}
        className={`mt-6 grid grid-cols-1 gap-3 rounded-2xl border-2 bg-gradient-to-br p-4 sm:grid-cols-2 ${st.card}`}
      >
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-[11px] font-bold uppercase text-slate-400">Nombre</span>
          <input
            required
            className="min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-600"
            placeholder="Ej. Colchón 6 meses"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase text-slate-400">Objetivo ARS</span>
          <input type="number" min={1} required className="min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase text-slate-400">Actual ARS</span>
          <input type="number" min={0} required className="min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase text-slate-400">Categoría</span>
          <select
            className="min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
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
          <span className="text-[11px] font-bold uppercase text-slate-400">Deadline</span>
          <input type="date" className="min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="w-full rounded-xl bg-white/15 py-3 text-sm font-black text-white transition hover:bg-white/25 sm:w-auto sm:px-6">
            Crear meta
          </button>
        </div>
      </form>

      {goals.length === 0 ? (
        <p className="mt-6 text-sm font-medium text-slate-500">Todavía sin side quests. Sumá una meta concreta.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {goals.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
            const cs = CAT_STYLE[g.category] ?? CAT_STYLE.other;
            return (
              <li
                key={g.id}
                className={`relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-4 shadow-lg ${cs.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="text-2xl">{cs.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white">{g.name}</p>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {CATEGORIES.find((c) => c.value === g.category)?.label}
                        {g.deadline ? ` · ${g.deadline}` : ''}
                      </p>
                    </div>
                  </div>
                  <button type="button" className="shrink-0 text-xs font-bold text-slate-500 hover:text-rose-400" onClick={() => onRemove(g.id)}>
                    Quitar
                  </button>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold tabular-nums text-slate-300">
                    {formatARS(g.currentAmount)} / {formatARS(g.targetAmount)}
                  </span>
                  <span className="text-lg font-black tabular-nums text-white">{pct.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/40">
                  <div className={`h-full rounded-full bg-gradient-to-r ${cs.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <label className="mt-3 flex flex-col gap-1 text-[11px] font-bold uppercase text-slate-500">
                  Ajustar actual
                  <input
                    type="number"
                    min={0}
                    className="min-h-[40px] rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm font-bold text-white"
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
