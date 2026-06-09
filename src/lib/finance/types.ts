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

export type FinanceEntryMarketSnapshot = {
  ticker: string;
  price: number;
  currency: string;
  source: 'google-finance' | 'yahoo-finance' | 'fallback' | 'missing';
  fetchedAt: string;
  exchange?: string;
  url?: string;
};

export type FinanceEntryMarketData = {
  ticker?: string;
  buyPrice?: number;
  buyCurrency?: string;
  estimatedUnits?: number;
  buySnapshot?: FinanceEntryMarketSnapshot;
};

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
  /** Ticker normalizado comprado en esta entrada, ej. SPY, GOOGL, BTC. */
  ticker?: string;
  /** Precio de mercado al momento de cargar la compra. No es precio en vivo. */
  buyPrice?: number;
  /** Moneda del precio de compra, ej. ARS o USD. */
  buyCurrency?: string;
  /** Cantidad estimada comprada: amount / buyPrice (solo si moneda compatible). */
  estimatedUnits?: number;
  /** Snapshot opcional del precio al cargar la compra. */
  buySnapshot?: FinanceEntryMarketSnapshot;
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
  /** Precio de referencia manual (ARS), ej. CEDEAR en BCBA. Legacy/fallback; el flujo principal usa precios dinámicos. */
  referencePrice?: number;
  /** Cantidad objetivo mínima a cubrir (default 1). */
  targetUnits?: number;
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
