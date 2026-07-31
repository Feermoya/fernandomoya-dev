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

/**
 * Aliases → campo interno.
 * Formato broker AR (Balanz-like): Nominales, Precio promedio de compra, Moneda, etc.
 * No mapear "Precio" (cotización actual) a averagePurchasePrice.
 */
const HEADER_ALIASES: Record<string, string> = {
  ticker: 'ticker',
  symbol: 'ticker',
  simbolo: 'ticker',
  símbolo: 'ticker',

  quantity: 'quantity',
  cantidad: 'quantity',
  qty: 'quantity',
  nominales: 'quantity',
  nominal: 'quantity',

  averagepurchaseprice: 'averagePurchasePrice',
  average_price: 'averagePurchasePrice',
  averageprice: 'averagePurchasePrice',
  precio_promedio: 'averagePurchasePrice',
  preciopromedio: 'averagePurchasePrice',
  precio_promedio_de_compra: 'averagePurchasePrice',
  preciopromediodecompra: 'averagePurchasePrice',
  ppc: 'averagePurchasePrice',

  // Cotización actual del broker — no usar como costo
  precio: '_marketPrice',
  price: '_marketPrice',
  last: '_marketPrice',
  ultimo: '_marketPrice',
  último: '_marketPrice',

  currency: 'currency',
  moneda: 'currency',

  broker: 'broker',
  purchasedate: 'purchaseDate',
  fecha_compra: 'purchaseDate',
  fechacompra: 'purchaseDate',

  displayname: 'displayName',
  nombre: 'displayName',
  name: 'displayName',
  descripcion: 'displayName',
  descripción: 'displayName',
  description: 'displayName',

  market: 'market',
  mercado: 'market',
  tipo_de_instrumento: 'instrumentType',
  tipodeinstrumento: 'instrumentType',
  instrumento: 'instrumentType',
  tipo: 'instrumentType',

  notes: 'notes',
  nota: 'notes',
};

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeHeaderKey(h: string): string {
  return stripDiacritics(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '');
}

function normalizeHeader(h: string): string {
  const key = normalizeHeaderKey(h);
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  // sin guiones bajos
  const compact = key.replace(/_/g, '');
  return HEADER_ALIASES[compact] ?? HEADER_ALIASES[key] ?? h.trim();
}

export function detectDelimiter(sample: string): ',' | ';' | '\t' {
  const firstLine = sample.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  if (tabs >= semis && tabs >= commas && tabs > 0) return '\t';
  if (semis > commas) return ';';
  return ',';
}

/** CSV/TSV/SSV: soporta comillas y delimitador auto. */
export function parseCsvText(text: string, delimiter?: ',' | ';' | '\t'): string[][] {
  const delim = delimiter ?? detectDelimiter(text);
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
    if (ch === delim) {
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

function parseNumberLoose(raw: string): number {
  const t = raw.trim();
  if (!t) return Number.NaN;
  // 1.234,56 (es-AR) vs 1234.56
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^\d+,\d+$/.test(t)) {
    return Number(t.replace(/\./g, '').replace(',', '.'));
  }
  return Number(t.replace(/,/g, ''));
}

export type ParsePortfolioCsvOptions = {
  nowIso?: string;
  /**
   * Preset Balanz (default en la UI de importación):
   * - broker = Balanz
   * - CEDEAR / acciones locales → ARS (el Excel a veces marca Dólares por error)
   * - sin avisos por falta de broker/fecha (el export no los trae)
   */
  brokerPreset?: 'balanz' | 'generic';
  defaultBroker?: string;
};

function isBalanzEquityInstrument(instrumentType: string): boolean {
  const t = instrumentType
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  return t.includes('cedear') || t.includes('accion') || t.includes('etf');
}

function marketFromInstrument(instrumentType: string): string | undefined {
  const t = instrumentType
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  if (t.includes('cedear')) return 'CEDEAR';
  if (t.includes('accion')) return 'BCBA';
  if (t.includes('etf')) return 'ETF';
  if (t.includes('fondo')) return 'FCI';
  return undefined;
}

export function parsePortfolioCsv(
  text: string,
  nowIsoOrOpts?: string | ParsePortfolioCsvOptions,
): CsvParseResult {
  const opts: ParsePortfolioCsvOptions =
    typeof nowIsoOrOpts === 'string'
      ? { nowIso: nowIsoOrOpts }
      : (nowIsoOrOpts ?? {});
  const preset = opts.brokerPreset ?? 'generic';
  const defaultBroker =
    opts.defaultBroker ?? (preset === 'balanz' ? 'Balanz' : undefined);

  const matrix = parseCsvText(text);
  if (matrix.length < 2) {
    return {
      ok: false,
      error: 'El archivo necesita encabezado y al menos una fila.',
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
      const hint =
        req === 'quantity'
          ? ' (ej. Nominales / cantidad)'
          : req === 'averagePurchasePrice'
            ? ' (ej. Precio promedio de compra)'
            : req === 'currency'
              ? ' (ej. Moneda)'
              : '';
      return {
        ok: false,
        error: `Falta la columna obligatoria: ${req}${hint}.`,
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
      const val = (cells[idx] ?? '').trim();
      if (!raw[h] || raw[h] === '') raw[h] = val;
    });

    const quantity = parseNumberLoose(raw.quantity ?? '');
    const averagePurchasePrice = parseNumberLoose(raw.averagePurchasePrice ?? '');
    const instrument = raw.instrumentType ?? '';
    let currency = raw.currency;
    const warnings: string[] = [];

    // Balanz: CEDEARs y acciones BCBA cotizan en pesos; el export a veces pone Dólares.
    if (preset === 'balanz' && isBalanzEquityInstrument(instrument)) {
      const normalized = (currency ?? '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toUpperCase();
      if (normalized.includes('DOLAR') || normalized === 'USD' || normalized === 'US$') {
        warnings.push('Moneda corregida a ARS (CEDEAR/acción Balanz).');
      }
      currency = 'ARS';
    }

    const broker = raw.broker?.trim() || defaultBroker;
    const market = raw.market || marketFromInstrument(instrument);

    const candidate = {
      ticker: raw.ticker,
      quantity,
      averagePurchasePrice,
      currency,
      broker,
      purchaseDate: raw.purchaseDate || undefined,
      displayName: raw.displayName || undefined,
      market,
      notes: raw.notes || undefined,
      source: 'csv' as const,
    };

    const result = normalizeAndValidateHolding(candidate, { nowIso: opts.nowIso });

    if (preset === 'generic') {
      if (!broker) warnings.push('Sin broker.');
      if (!raw.purchaseDate) warnings.push('Sin fecha de compra.');
    }

    if (instrument.toLowerCase().includes('fondo')) {
      warnings.push('Fondo: la cotización automática puede no estar disponible.');
    }

    if (!result.ok) {
      invalidCount += 1;
      rows.push({
        rowIndex: i + 1,
        raw: {
          ticker: raw.ticker ?? '',
          quantity: raw.quantity ?? '',
          averagePurchasePrice: raw.averagePurchasePrice ?? '',
          currency: currency ?? '',
        },
        status: 'invalid',
        errors: result.errors,
        warnings,
      });
      continue;
    }

    const previewRaw = {
      ticker: result.holding.ticker,
      quantity: String(result.holding.quantity),
      averagePurchasePrice: String(result.holding.averagePurchasePrice),
      currency: result.holding.currency,
      displayName: result.holding.displayName ?? '',
      instrumentType: instrument,
      broker: result.holding.broker ?? '',
    };

    if (warnings.length > 0) {
      warningCount += 1;
      rows.push({
        rowIndex: i + 1,
        raw: previewRaw,
        status: 'warning',
        errors: [],
        warnings,
        holding: result.holding,
      });
    } else {
      validCount += 1;
      rows.push({
        rowIndex: i + 1,
        raw: previewRaw,
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

/** Convierte la primera hoja de un .xlsx/.xls a texto CSV para el mismo parser. */
export async function portfolioSpreadsheetToCsvText(buffer: ArrayBuffer): Promise<string> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const name = wb.SheetNames[0];
  if (!name) throw new Error('El Excel no tiene hojas.');
  const sheet = wb.Sheets[name];
  return XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n' });
}

export function isSpreadsheetFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    n.endsWith('.xlsx') ||
    n.endsWith('.xls') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel'
  );
}
