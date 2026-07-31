import { useMemo, useState } from 'react';
import { sileo } from 'sileo';
import {
  holdingsFromCsvPreview,
  isSpreadsheetFile,
  parsePortfolioCsv,
  portfolioSpreadsheetToCsvText,
  type CsvRowPreview,
} from '@/lib/finance/portfolio/csvImport';
import { mergePortfolioHoldings } from '@/lib/finance/portfolio/mergeHoldings';
import type {
  FinancePortfolioHolding,
  PortfolioDuplicateStrategy,
} from '@/lib/finance/portfolio/types';

type Props = {
  existing: FinancePortfolioHolding[];
  onApply: (next: FinancePortfolioHolding[]) => void;
  onClose: () => void;
};

export function FinancePortfolioCsvImport({ existing, onApply, onClose }: Props) {
  const [rows, setRows] = useState<CsvRowPreview[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<PortfolioDuplicateStrategy>('combine');
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const importable = useMemo(() => {
    if (!rows) return [];
    return holdingsFromCsvPreview(
      rows.filter((r) => !excluded.has(r.rowIndex)),
      true,
    );
  }, [rows, excluded]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setParseError(null);
    setRows(null);
    setExcluded(new Set());
    try {
      let text: string;
      if (isSpreadsheetFile(file)) {
        const buffer = await file.arrayBuffer();
        text = await portfolioSpreadsheetToCsvText(buffer);
      } else {
        text = await file.text();
      }
      const parsed = parsePortfolioCsv(text);
      if (!parsed.ok) {
        setParseError(parsed.error || 'Archivo inválido');
        sileo.error({ title: 'Error de archivo', description: parsed.error });
        return;
      }

      // Fondos: excluidos por defecto (se pueden volver a marcar)
      const autoExcluded = new Set<number>();
      for (const row of parsed.rows) {
        if ((row.raw.instrumentType ?? '').toLowerCase().includes('fondo')) {
          autoExcluded.add(row.rowIndex);
        }
      }
      setExcluded(autoExcluded);
      setRows(parsed.rows);
      sileo.info({
        title: 'Archivo leído',
        description: `${parsed.validCount} válidas · ${parsed.warningCount} con avisos · ${parsed.invalidCount} inválidas`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo leer el archivo';
      setParseError(msg);
      sileo.error({ title: 'Error de archivo', description: msg });
    }
  };

  const confirm = () => {
    if (importable.length === 0) {
      sileo.warning({ title: 'Nada para importar', description: 'No hay filas válidas seleccionadas.' });
      return;
    }
    const merged = mergePortfolioHoldings({
      existing,
      incoming: importable,
      strategy,
    });
    onApply(merged.holdings);
    sileo.success({
      title: 'Importación lista',
      description: `+${merged.added} · combinadas ${merged.combined} · reemplazadas ${merged.replaced} · ignoradas ${merged.ignored}`,
    });
    if (merged.ignored > 0) {
      sileo.info({
        title: 'Filas omitidas',
        description: `${merged.ignored} duplicados ignorados según la estrategia.`,
      });
    }
    onClose();
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <p className="text-sm font-bold text-slate-900">Importar Excel / CSV del broker</p>
        <p className="mt-0.5 text-[11px] font-medium text-slate-500">
          Podés subir el .xlsx tal cual (Ticker, Nominales, Precio promedio de compra, Moneda). No hace
          falta renombrar columnas. Los fondos se excluyen por defecto.
        </p>
      </div>

      <input
        type="file"
        accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="block w-full text-xs"
        onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
      />

      {parseError ? (
        <p className="text-xs font-semibold text-red-600" role="alert">
          {parseError}
        </p>
      ) : null}

      {rows ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="finance-label">Duplicados (mismo ticker + moneda)</span>
            <select
              className="finance-input-mobile min-h-[40px] rounded-xl px-3 text-sm font-semibold"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as PortfolioDuplicateStrategy)}
            >
              <option value="combine">Combinar (promedio ponderado)</option>
              <option value="replace">Reemplazar</option>
              <option value="ignore">Ignorar</option>
            </select>
          </label>

          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {rows.map((row) => (
              <li
                key={row.rowIndex}
                className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                  row.status === 'invalid'
                    ? 'border-red-200 bg-red-50'
                    : row.status === 'warning'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800">
                      Fila {row.rowIndex}: {row.raw.ticker || '—'} · {row.raw.quantity} @{' '}
                      {row.raw.averagePurchasePrice} {row.raw.currency}
                    </p>
                    {row.errors.length > 0 ? (
                      <p className="mt-0.5 font-semibold text-red-700">
                        {row.errors.map((e) => e.message).join(' ')}
                      </p>
                    ) : null}
                    {row.warnings.length > 0 ? (
                      <p className="mt-0.5 font-medium text-amber-800">{row.warnings.join(' ')}</p>
                    ) : null}
                  </div>
                  {row.holding ? (
                    <label className="flex shrink-0 items-center gap-1 font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={!excluded.has(row.rowIndex)}
                        onChange={(e) => {
                          setExcluded((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.delete(row.rowIndex);
                            else next.add(row.rowIndex);
                            return next;
                          });
                        }}
                      />
                      Incluir
                    </label>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirm}
              className="finance-primary-button min-h-[40px] px-4 text-xs"
            >
              Confirmar importación ({importable.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              className="finance-secondary-button min-h-[40px] px-4 text-xs"
            >
              Cancelar
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
