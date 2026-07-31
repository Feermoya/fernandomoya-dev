import {
  normalizeAndValidateHolding,
  type HoldingValidationError,
} from '@/lib/finance/portfolio/validateHolding';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';

export type CsvRowPreview = {
  rowIndex: number;
  raw: Record<string, string>;
  status: 'valid' | 'warning' | 'invalid';
  errors: HoldingValidationError[];
  warnings: string[];
  holding?: FinancePortfolioHolding;
};

export type CsvParseResult = {
  ok: boolean;
  error?: string;
  rows: CsvRowPreview[];
  validCount: number;
  warningCount: number;
  invalidCount: number;
};

const HEADER_ALIASES: Record<string, string> = {
  ticker: 'ticker',
  symbol: 'ticker',
  simbolo: 'ticker',
  símbolo: 'ticker',
  quantity: 'quantity',
  cantidad: 'quantity',
  qty: 'quantity',
  averagepurchaseprice: 'averagePurchasePrice',
  average_price: 'averagePurchasePrice',
  averageprice: 'averagePurchasePrice',
  precio_promedio: 'averagePurchasePrice',
  preciopromedio: 'averagePurchasePrice',
  precio: 'averagePurchasePrice',
  currency: 'currency',
  moneda: 'currency',
  broker: 'broker',
  purchasedate: 'purchaseDate',
  fecha_compra: 'purchaseDate',
  fechacompra: 'purchaseDate',
  displayname: 'displayName',
  nombre: 'displayName',
  name: 'displayName',
  market: 'market',
  mercado: 'market',
  notes: 'notes',
  nota: 'notes',
};

function normalizeHeader(h: string): string {
  const key = h.trim().toLowerCase().replace(/\s+/g, '_');
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[key.replace(/_/g, '')] ?? h.trim();
}

/** CSV mínimo: soporta comillas simples y comas. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = '';
  };
  const pushRow = () => {
    if (row.length === 1 && row[0] === '' && rows.length === 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      pushCell();
      continue;
    }
    if (ch === '\n') {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === '\r') continue;
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    pushCell();
    pushRow();
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function parsePortfolioCsv(text: string, nowIso?: string): CsvParseResult {
  const matrix = parseCsvText(text);
  if (matrix.length < 2) {
    return {
      ok: false,
      error: 'El CSV necesita encabezado y al menos una fila.',
      rows: [],
      validCount: 0,
      warningCount: 0,
      invalidCount: 0,
    };
  }

  const headers = matrix[0].map(normalizeHeader);
  const required = ['ticker', 'quantity', 'averagePurchasePrice', 'currency'];
  for (const req of required) {
    if (!headers.includes(req)) {
      return {
        ok: false,
        error: `Falta la columna obligatoria: ${req}.`,
        rows: [],
        validCount: 0,
        warningCount: 0,
        invalidCount: 0,
      };
    }
  }

  const rows: CsvRowPreview[] = [];
  let validCount = 0;
  let warningCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i];
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h] = (cells[idx] ?? '').trim();
    });

    const candidate = {
      ticker: raw.ticker,
      quantity: Number(raw.quantity.replace(',', '.')),
      averagePurchasePrice: Number(raw.averagePurchasePrice.replace(',', '.')),
      currency: raw.currency,
      broker: raw.broker || undefined,
      purchaseDate: raw.purchaseDate || undefined,
      displayName: raw.displayName || undefined,
      market: raw.market || undefined,
      notes: raw.notes || undefined,
      source: 'csv' as const,
    };

    const result = normalizeAndValidateHolding(candidate, { nowIso });
    const warnings: string[] = [];
    if (!raw.broker) warnings.push('Sin broker.');
    if (!raw.purchaseDate) warnings.push('Sin fecha de compra.');

    if (!result.ok) {
      invalidCount += 1;
      rows.push({
        rowIndex: i + 1,
        raw,
        status: 'invalid',
        errors: result.errors,
        warnings,
      });
      continue;
    }

    if (warnings.length > 0) {
      warningCount += 1;
      rows.push({
        rowIndex: i + 1,
        raw,
        status: 'warning',
        errors: [],
        warnings,
        holding: result.holding,
      });
    } else {
      validCount += 1;
      rows.push({
        rowIndex: i + 1,
        raw,
        status: 'valid',
        errors: [],
        warnings: [],
        holding: result.holding,
      });
    }
  }

  return {
    ok: true,
    rows,
    validCount,
    warningCount,
    invalidCount,
  };
}

export function holdingsFromCsvPreview(
  rows: CsvRowPreview[],
  includeWarnings = true,
): FinancePortfolioHolding[] {
  return rows
    .filter((r) => r.holding && (r.status === 'valid' || (includeWarnings && r.status === 'warning')))
    .map((r) => r.holding!);
}
