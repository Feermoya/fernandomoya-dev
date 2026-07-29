import {
  getEmergencyFundTotal,
  getMonthlyInvested,
  getTotalInvested,
  formatARS,
} from '@/lib/finance/calculations';
import type { FinanceState, MonthlyLevelResult } from '@/lib/finance/types';

export const LEVEL_THRESHOLDS = {
  L1: 150_000,
  L2: 300_000,
  L3: 450_000,
  L4: 650_000,
  L6: 850_000,
  EMERGENCY: 3_000_000,
  STREAK3: 400_000,
  STREAK6: 250_000,
} as const;

const TH = LEVEL_THRESHOLDS;

export function addMonths(ym: string, delta: number): string {
  const [ys, ms] = ym.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function pipeForMonth(state: FinanceState, month: string): number {
  return getMonthlyInvested(state.entries, month);
}

function monthDistinctInvestmentAssets(state: FinanceState, month: string): number {
  const set = new Set<string>();
  for (const e of state.entries) {
    if (e.month !== month) continue;
    if (e.type !== 'investment') continue;
    const key = (e.asset ?? 'OTHER').toString();
    set.add(key);
  }
  return set.size;
}

function monthInvestmentOps(state: FinanceState, month: string): number {
  return state.entries.filter((e) => e.month === month && e.type === 'investment').length;
}

function endingMonths(month: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(addMonths(month, -i));
  }
  return out;
}

function streakMinPipe(state: FinanceState, endMonth: string, months: number, minPipe: number): boolean {
  const keys = endingMonths(endMonth, months);
  return keys.every((m) => pipeForMonth(state, m) >= minPipe);
}

function satisfiesLevel(level: number, state: FinanceState, month: string): boolean {
  const pipe = pipeForMonth(state, month);

  switch (level) {
    case 1:
      return pipe >= TH.L1;
    case 2:
      return pipe >= TH.L2;
    case 3:
      return pipe >= TH.L3;
    case 4:
      return pipe >= TH.L4;
    case 5:
      return pipe >= TH.L4 && monthDistinctInvestmentAssets(state, month) >= 2;
    case 6:
      return pipe >= TH.L6 && monthInvestmentOps(state, month) >= 2;
    case 7:
      return streakMinPipe(state, month, 3, TH.STREAK3);
    case 8:
      return getEmergencyFundTotal(state.entries, state.goals) >= TH.EMERGENCY;
    case 9:
      return streakMinPipe(state, month, 6, TH.STREAK6);
    case 10: {
      const t = state.wealthTarget;
      if (t === undefined || !Number.isFinite(t) || t <= 0) return false;
      return getTotalInvested(state.entries) >= t;
    }
    default:
      return false;
  }
}

export function highestAchievedLevel(state: FinanceState, month: string): number {
  for (let L = 10; L >= 1; L--) {
    if (satisfiesLevel(L, state, month)) return L;
  }
  return 0;
}

const LEVEL_TITLES: Record<number, string> = {
  0: 'Sin nivel',
  1: 'Semilla',
  2: 'Ritmo',
  3: 'Disciplina',
  4: 'Constructor',
  5: 'Diversificación',
  6: 'Dominio',
  7: 'Constancia',
  8: 'Colchón',
  9: 'Máquina',
  10: 'Libertad',
};

function messageForLevel(level: number): string {
  if (level <= 0) return 'Metés plata este mes o no. No hay términos medios.';
  if (level === 1) return 'Entraste. Ahora no te quedés acá.';
  if (level === 2) return 'Buen mes. La distancia entre nivel 2 y 3 es constancia.';
  if (level === 3) return 'Esto ya es disciplina real. Casi nadie llega acá.';
  if (level === 4) return 'Volumen fuerte. Seguís o bajás — no hay punto muerto.';
  if (level === 5) return 'Diversificado y en volumen. Esto es construcción.';
  if (level === 6) return 'Dominio del mes. Tres meses seguidos y cambia todo.';
  if (level === 7) return 'Racha de tres meses. El mercado te conoce.';
  if (level === 8) return 'Colchón construido. Ahora jugás con red.';
  if (level === 9) return 'Seis meses de máquina. Casi no hay quien llegue acá.';
  return 'Libertad. El juego lo dominaste.';
}

function nextTargetString(state: FinanceState, month: string, achieved: number): string {
  const pipe = pipeForMonth(state, month);
  const entries = state.entries;

  if (achieved >= 10) {
    return 'Estás en el techo del juego con los datos actuales. Subí la meta de patrimonio si querés más tensión.';
  }

  if (achieved === 9) {
    const t = state.wealthTarget;
    if (t === undefined || !Number.isFinite(t)) {
      return 'Definí una meta de patrimonio total en el estado (wealthTarget) para desbloquear el nivel 10.';
    }
    const gap = t - getTotalInvested(entries);
    return gap > 0
      ? `Faltan ${formatARS(gap)} de inversión acumulada para el nivel 10.`
      : 'Nivel 10 desbloqueado.';
  }

  if (achieved === 8) {
    return `Mantené seis meses seguidos con al menos ${formatARS(TH.STREAK6)} de inversión para subir al nivel 9.`;
  }

  if (achieved === 7) {
    const em = getEmergencyFundTotal(entries, state.goals);
    const gap = TH.EMERGENCY - em;
    return gap > 0
      ? `Llevá el fondo de emergencia a ${formatARS(TH.EMERGENCY)} (hoy tenés ${formatARS(em)}).`
      : 'Emergencia cubierta. Mirá la racha de seis meses para el nivel 9.';
  }

  if (achieved === 6) {
    return `Tres meses seguidos con ${formatARS(TH.STREAK3)} o más invertidos: ahí va el nivel 7.`;
  }

  if (achieved === 5) {
    return `El nivel 6 exige ${formatARS(TH.L6)} invertidos y más de una operación en el mes.`;
  }

  if (achieved === 4) {
    const distinct = monthDistinctInvestmentAssets(state, month);
    if (distinct < 2) {
      return 'Para el nivel 5: mantené el volumen y diversificá (mínimo 2 activos).';
    }
    return `Sumá hasta ${formatARS(TH.L6)} invertidos y hacé más de una operación para el nivel 6.`;
  }

  if (achieved === 3) {
    const gap = TH.L4 - pipe;
    return gap > 0
      ? `Faltan ${formatARS(gap)} para el nivel 4 (${formatARS(TH.L4)}).`
      : 'Nivel 4 desbloqueado. Ahora diversificá para no depender de una sola jugada.';
  }

  if (achieved === 2) {
    const gap = TH.L3 - pipe;
    return gap > 0 ? `Faltan ${formatARS(gap)} para el nivel 3.` : 'Nivel 3 desbloqueado.';
  }

  if (achieved === 1) {
    const gap = TH.L2 - pipe;
    return gap > 0 ? `Faltan ${formatARS(gap)} para el nivel 2.` : 'Nivel 2 desbloqueado.';
  }

  const gap = TH.L1 - pipe;
  return gap > 0
    ? `Invertí ${formatARS(gap)} más este mes para entrar al nivel 1.`
    : 'Ya estás en nivel 1. Sumá ritmo.';
}

export function getLevelProgressPercent(state: FinanceState, month: string, achieved: number): number {
  const pipe = pipeForMonth(state, month);
  const thresholds = [0, TH.L1, TH.L2, TH.L3, TH.L4, TH.L6];

  if (achieved >= 6) return 100;

  let low = 0;
  let high = TH.L1;
  for (let i = 1; i < thresholds.length; i++) {
    if (pipe < thresholds[i]) {
      low = thresholds[i - 1];
      high = thresholds[i];
      break;
    }
    if (i === thresholds.length - 1) {
      low = thresholds[i - 1];
      high = thresholds[i];
    }
  }

  if (high <= low) return 0;
  const p = ((pipe - low) / (high - low)) * 100;
  return Math.max(0, Math.min(100, p));
}

export function getMonthlyLevel(state: FinanceState, month: string): MonthlyLevelResult {
  const level = highestAchievedLevel(state, month);
  const title = LEVEL_TITLES[level] ?? 'Sin nivel';
  const message = messageForLevel(level);
  const nextTarget = nextTargetString(state, month, level);

  return {
    level,
    title,
    message,
    nextTarget,
  };
}

export function isLevelUnlocked(level: number, state: FinanceState, month: string): boolean {
  return satisfiesLevel(level, state, month);
}

export function getGapToNextInvestmentMilestone(
  state: FinanceState,
  month: string,
): { amountMissing: number; nextLevel: number; nextTitle: string; hint?: string } | null {
  const achieved = highestAchievedLevel(state, month);
  const pipe = pipeForMonth(state, month);
  if (achieved >= 10) return null;

  const nextL = Math.min(achieved + 1, 10);
  const nextTitle = LEVEL_TITLES[nextL] ?? `Nivel ${nextL}`;

  if (achieved === 0) {
    const missing = Math.max(0, TH.L1 - pipe);
    return { amountMissing: missing, nextLevel: 1, nextTitle: LEVEL_TITLES[1] };
  }
  if (achieved === 1) {
    return { amountMissing: Math.max(0, TH.L2 - pipe), nextLevel: 2, nextTitle: LEVEL_TITLES[2] };
  }
  if (achieved === 2) {
    return { amountMissing: Math.max(0, TH.L3 - pipe), nextLevel: 3, nextTitle: LEVEL_TITLES[3] };
  }
  if (achieved === 3) {
    return { amountMissing: Math.max(0, TH.L4 - pipe), nextLevel: 4, nextTitle: LEVEL_TITLES[4] };
  }
  if (achieved === 4) {
    if (pipe < TH.L4) {
      return { amountMissing: Math.max(0, TH.L4 - pipe), nextLevel: 4, nextTitle: LEVEL_TITLES[4] };
    }
    if (monthDistinctInvestmentAssets(state, month) < 2) {
      return {
        amountMissing: 0,
        nextLevel: 5,
        nextTitle: LEVEL_TITLES[5],
        hint: 'Diversificá: registrá al menos 2 activos distintos este mes.',
      };
    }
    return {
      amountMissing: Math.max(0, TH.L6 - pipe),
      nextLevel: 6,
      nextTitle: LEVEL_TITLES[6],
      hint:
        monthInvestmentOps(state, month) < 2
          ? 'Hacé al menos 2 operaciones de inversión en el mes.'
          : undefined,
    };
  }
  if (achieved === 5) {
    const missing = Math.max(0, TH.L6 - pipe);
    if (monthInvestmentOps(state, month) < 2) {
      return { amountMissing: missing, nextLevel: 6, nextTitle: LEVEL_TITLES[6], hint: 'Dos operaciones en el mes.' };
    }
    return { amountMissing: missing, nextLevel: 6, nextTitle: LEVEL_TITLES[6] };
  }

  return { amountMissing: 0, nextLevel: nextL, nextTitle, hint: 'Seguí la ruta: racha o emergencia.' };
}

export type InvestmentWhatsAppNudge =
  | { shouldNotify: false; reason: 'sufficient' | 'no_volume_gap'; invested: number; level: number }
  | {
      shouldNotify: true;
      invested: number;
      level: number;
      nextLevel: number;
      message: string;
      kind: 'low' | 'near_level' | 'push';
    };

/**
 * ¿Hace falta WhatsApp de inversión este mes?
 * - Poca plata → avisa.
 * - Cerca de subir de nivel (2, 3, …) → avisa.
 * - Ya llegaste a Disciplina (L3 / 450k) o más de volumen → silencio.
 */
export function evaluateInvestmentWhatsAppNudge(
  state: FinanceState,
  month: string,
): InvestmentWhatsAppNudge {
  const invested = pipeForMonth(state, month);
  const level = highestAchievedLevel(state, month);

  if (invested >= TH.L3) {
    return { shouldNotify: false, reason: 'sufficient', invested, level };
  }

  const gap = getGapToNextInvestmentMilestone(state, month);
  if (!gap || gap.amountMissing <= 0) {
    return { shouldNotify: false, reason: 'no_volume_gap', invested, level };
  }

  const monthLabel = monthLabelEs(month);
  const nextTitle = gap.nextTitle;

  if (invested < TH.L1) {
    return {
      shouldNotify: true,
      invested,
      level,
      nextLevel: gap.nextLevel,
      kind: 'low',
      message: [
        `Foco financiero — ${monthLabel}`,
        `Llevás ${formatARS(invested)} invertidos este mes (poco).`,
        `Te faltan ${formatARS(gap.amountMissing)} para el nivel ${gap.nextLevel} (${nextTitle}).`,
      ].join('\n'),
    };
  }

  const thresholds = [0, TH.L1, TH.L2, TH.L3, TH.L4];
  const nextThreshold =
    gap.nextLevel <= 4 ? thresholds[gap.nextLevel] ?? TH.L3 : TH.L3;
  const prevThreshold = gap.nextLevel <= 4 ? thresholds[gap.nextLevel - 1] ?? 0 : TH.L2;
  const span = Math.max(1, nextThreshold - prevThreshold);
  const near = gap.amountMissing / span <= 0.2 || gap.amountMissing <= 75_000;

  if (near) {
    return {
      shouldNotify: true,
      invested,
      level,
      nextLevel: gap.nextLevel,
      kind: 'near_level',
      message: [
        `Foco financiero — ${monthLabel}`,
        `Estás cerca del nivel ${gap.nextLevel} (${nextTitle}).`,
        `Llevás ${formatARS(invested)}. Te faltan ${formatARS(gap.amountMissing)}.`,
      ].join('\n'),
    };
  }

  return {
    shouldNotify: true,
    invested,
    level,
    nextLevel: gap.nextLevel,
    kind: 'push',
    message: [
      `Foco financiero — ${monthLabel}`,
      `Nivel actual: ${level} · siguiente: ${gap.nextLevel} (${nextTitle}).`,
      `Llevás ${formatARS(invested)}. Te faltan ${formatARS(gap.amountMissing)} este mes.`,
    ].join('\n'),
  };
}

export type MonthlyMissionView = {
  monthLabel: string;
  headline: string;
  tagline: string;
  targetAmount: number;
  currentAmount: number;
  percent: number;
  rewardLevel: number;
  rewardTitle: string;
  status: 'pending' | 'in_progress' | 'completed';
  hint?: string;
};

function monthLabelEs(ym: string): string {
  const [ys, ms] = ym.split('-').map(Number);
  if (!Number.isFinite(ys) || !Number.isFinite(ms)) return ym;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return cap(new Date(ys, ms - 1, 1).toLocaleDateString('es-AR', { month: 'long' }));
}

export function getMonthlyMissionView(state: FinanceState, month: string): MonthlyMissionView {
  const achieved = highestAchievedLevel(state, month);
  const pipe = pipeForMonth(state, month);
  const monthName = monthLabelEs(month);

  if (achieved >= 10) {
    return {
      monthLabel: monthName,
      headline: `Misión de ${monthName}`,
      tagline: 'Ya dominaste el tablero de este mes.',
      targetAmount: pipe,
      currentAmount: pipe,
      percent: 100,
      rewardLevel: 10,
      rewardTitle: LEVEL_TITLES[10],
      status: 'completed',
    };
  }

  const gapInfo = getGapToNextInvestmentMilestone(state, month)!;

  let target = TH.L1;
  if (achieved === 0) target = TH.L1;
  else if (achieved === 1) target = TH.L2;
  else if (achieved === 2) target = TH.L3;
  else if (achieved === 3) target = TH.L4;
  else if (achieved === 4) {
    if (pipe < TH.L4) target = TH.L4;
    else if (monthDistinctInvestmentAssets(state, month) < 2) target = TH.L4;
    else target = TH.L6;
  } else if (achieved === 5) target = TH.L6;
  else target = TH.L6;

  const percent = target > 0 ? Math.min(100, (pipe / target) * 100) : 0;
  const status: MonthlyMissionView['status'] =
    percent >= 100 && !gapInfo.hint ? 'completed' : percent > 0 ? 'in_progress' : 'pending';

  return {
    monthLabel: monthName,
    headline: `Misión de ${monthName}`,
    tagline:
      achieved <= 1
        ? 'Cada carga suma al nivel del mes.'
        : 'El mes se gana cuando separás primero.',
    targetAmount: target,
    currentAmount: pipe,
    percent,
    rewardLevel: gapInfo.nextLevel,
    rewardTitle: gapInfo.nextTitle,
    status,
    hint: gapInfo.hint,
  };
}

export const LEVEL_RULES: readonly { level: number; name: string; condition: string }[] = [
  { level: 1, name: 'Semilla', condition: `Inversión del mes ≥ ${formatARS(TH.L1)}` },
  { level: 2, name: 'Ritmo', condition: `Inversión del mes ≥ ${formatARS(TH.L2)}` },
  { level: 3, name: 'Disciplina', condition: `Inversión del mes ≥ ${formatARS(TH.L3)}` },
  { level: 4, name: 'Constructor', condition: `Inversión del mes ≥ ${formatARS(TH.L4)}` },
  {
    level: 5,
    name: 'Diversificación',
    condition: `≥ ${formatARS(TH.L4)} en el mes y al menos 2 activos distintos`,
  },
  {
    level: 6,
    name: 'Dominio',
    condition: `Inversión del mes ≥ ${formatARS(TH.L6)} y más de una operación`,
  },
  {
    level: 7,
    name: 'Constancia',
    condition: `Tres meses seguidos con inversión ≥ ${formatARS(TH.STREAK3)}`,
  },
  {
    level: 8,
    name: 'Colchón',
    condition: `Fondo de emergencia ≥ ${formatARS(TH.EMERGENCY)}`,
  },
  {
    level: 9,
    name: 'Máquina',
    condition: `Seis meses seguidos con inversión ≥ ${formatARS(TH.STREAK6)}`,
  },
  {
    level: 10,
    name: 'Libertad',
    condition: 'Suma de inversiones registradas ≥ meta configurada',
  },
] as const;
