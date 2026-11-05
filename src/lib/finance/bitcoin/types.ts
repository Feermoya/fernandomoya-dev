/** Estado persistente del módulo Bitcoin (simulación / planificación). */

export type FinanceBitcoinModule = {
  /** Objetivo IBIT en % (0–100). BTC = 100 − este valor. */
  targetIbitPercent: number;
  /** Cantidad de BTC en wallet personal. */
  btcQuantity: number;
  /**
   * Valor actual manual de IBIT en ARS.
   * Se usa cuando no hay cantidad/precio fiable desde la cartera.
   */
  manualIbitValueArs?: number;
  /** Valor actual manual de BTC directo en ARS. */
  manualBtcValueArs?: number;
  /** Precio unitario manual de IBIT en ARS (para nominales). */
  manualIbitPriceArs?: number;
  /** Precio unitario manual de BTC en USD. */
  manualBtcPriceUsd?: number;
  /** Tipo de cambio USD→ARS manual (necesario para valorar BTC en pesos). */
  manualUsdArsRate?: number;
  updatedAt?: string;
};

export type BitcoinValueSource =
  | 'portfolio_live'
  | 'portfolio_cost'
  | 'manual'
  | 'unavailable';

export type BitcoinLegValue = {
  valueArs: number;
  source: BitcoinValueSource;
  quantity?: number;
  unitPrice?: number;
  unitCurrency?: 'ARS' | 'USD';
  detail?: string;
};

export type BitcoinAllocationInput = {
  ibitActual: number;
  btcActual: number;
  nuevaInversion: number;
  /** 0–1 */
  porcentajeIBIT: number;
};

export type BitcoinAllocationResult = {
  nuevaInversion: number;
  totalFuturo: number;
  ibitObjetivo: number;
  btcObjetivo: number;
  compraIBIT: number;
  compraBTC: number;
  ibitFuturo: number;
  btcFuturo: number;
  pctIbitActual: number;
  pctBtcActual: number;
  pctIbitProyectado: number;
  pctBtcProyectado: number;
  explanationKind: 'empty' | 'balanced' | 'favor_btc' | 'favor_ibit' | 'partial';
  explanation: string;
};

export type BitcoinQuantityHint = {
  ibitUnits?: number;
  ibitSpendExecutable?: number;
  ibitRemainder?: number;
  btcAmount?: number;
};
