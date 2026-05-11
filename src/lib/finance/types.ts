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

/** Meta opcional para nivel 10 (patrimonio / inversión total). */
export type FinanceState = {
  entries: FinanceEntry[];
  goals: FinanceGoal[];
  challenges: MonthlyChallenge[];
  currentMonth: string;
  wealthTarget?: number;
};

export type MonthlyLevelResult = {
  level: number;
  title: string;
  message: string;
  nextTarget: string;
};
