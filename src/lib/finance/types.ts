export type FinanceEntryType =
  | 'income'
  | 'fixed_expense'
  | 'variable_expense'
  | 'investment'
  | 'saving'
  | 'debt_payment'
  | 'free_spending';

export type FinanceAsset =
  | 'ARS'
  | 'USD'
  | 'BTC'
  | 'CEDEAR'
  | 'ETF'
  | 'EMERGENCY_FUND'
  | 'PROJECT'
  | 'OTHER';

export type FinanceEntry = {
  id: string;
  month: string;
  type: FinanceEntryType;
  amount: number;
  asset?: FinanceAsset;
  platform?: string;
  category?: string;
  note?: string;
  createdAt: string;
};

export type FinanceGoalCategory =
  | 'emergency'
  | 'investment'
  | 'car'
  | 'home'
  | 'business'
  | 'travel'
  | 'freedom'
  | 'other';

export type FinanceGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category: FinanceGoalCategory;
  deadline?: string;
  createdAt: string;
};

export type MonthlyChallenge = {
  id: string;
  month: string;
  title: string;
  targetAmount: number;
  completed: boolean;
};

export type MonthlyInvestmentPlanItemStatus = 'pending' | 'completed';

export type MonthlyInvestmentPlanItem = {
  id: string;
  month: string;
  label: string;
  matchTerms: string[];
  createdAt: string;
};

export type FinanceReminderSettings = {
  enabled: boolean;
  /** Solo dígitos, con código país (ej. 5491123456789). */
  phoneDigits: string;
  /** Días del mes (1–28) en los que querés el empujón. */
  daysOfMonth: number[];
  /** Opcional: API key de CallMeBot para envío automático por WhatsApp. */
  callMeBotApiKey?: string;
  messageTemplate?: string;
  /** YYYY-MM del último aviso in-app descartado (legacy). */
  lastAutoReminderMonth?: string;
  /** Claves enviadas por cron/manual: `YYYY-MM-D` (ej. `2026-05-15`). */
  lastCronReminderKeys?: string[];
};

export type FinancePreferences = {
  quickAmounts: number[];
  reminder: FinanceReminderSettings;
};

/** Meta opcional para nivel 10 (patrimonio / inversión total). */
export type FinanceState = {
  entries: FinanceEntry[];
  goals: FinanceGoal[];
  challenges: MonthlyChallenge[];
  currentMonth: string;
  wealthTarget?: number;
  preferences?: FinancePreferences;
  monthlyInvestmentPlan?: MonthlyInvestmentPlanItem[];
};

export type MonthlyLevelResult = {
  level: number;
  title: string;
  message: string;
  nextTarget: string;
};
