import { formatARS } from '@/lib/finance/calculations';
import type { MarketAlert } from '@/lib/finance/marketAlerts';

function formatPercentEs(value: number): string {
  return Math.abs(value).toLocaleString('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatMoneyWhatsApp(amount: number, currency?: string): string {
  const cur = (currency ?? 'ARS').toUpperCase();
  const hasCents = Math.abs(amount % 1) > 1e-9;
  const num = amount.toLocaleString('es-AR', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  if (cur === 'USD') return `US$ ${num}`;
  return `$ ${num}`;
}

function monthLabelForMessage(monthLabel: string): string {
  return monthLabel.trim().toLocaleLowerCase('es-AR');
}

export function formatInvestmentWhatsAppMessage(params: {
  kind: 'low' | 'near_level' | 'push';
  monthLabel: string;
  invested: number;
  amountMissing: number;
  level: number;
  nextLevel: number;
  nextTitle: string;
}): string {
  const { kind, monthLabel, invested, amountMissing, level, nextLevel, nextTitle } = params;
  const month = monthLabelForMessage(monthLabel);
  const monthlyAmount = formatARS(invested);
  const amountToNext = formatARS(amountMissing);
  const nextLevelLabel = `${nextLevel} · ${nextTitle}`;

  if (kind === 'low') {
    return [
      '🟡 *Inversión mensual*',
      '',
      `Llevás *${monthlyAmount}* en ${month}.`,
      `Te faltan *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`,
      '',
      'Sumá una inversión cuando puedas.',
    ].join('\n');
  }

  if (kind === 'near_level') {
    if (level <= 0) {
      return [
        '🎯 *Estás cerca de empezar*',
        '',
        `Llevás *${monthlyAmount}* en ${month}.`,
        `Te faltan *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`,
      ].join('\n');
    }
    return [
      '🎯 *Estás cerca del próximo nivel*',
      '',
      `Llevás *${monthlyAmount}* en ${month}.`,
      `Te faltan solo *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`,
    ].join('\n');
  }

  return [
    '📊 *Progreso de inversión*',
    '',
    `Llevás *${monthlyAmount}* en ${month}.`,
    `Estás en el nivel *${level}*.`,
    '',
    `Te faltan *${amountToNext}* para llegar al nivel *${nextLevelLabel}*.`,
  ].join('\n');
}

export function formatInvestmentTestWhatsAppMessage(monthlyAmount: number): string {
  return [
    '✅ *Prueba de inversión*',
    '',
    `Este mes llevás *${formatARS(monthlyAmount)}*.`,
    'No hay alertas pendientes.',
  ].join('\n');
}

export function formatMarketTestEmptyWhatsAppMessage(): string {
  return [
    '✅ *Prueba de mercado*',
    '',
    'No hay movimientos importantes en tus activos.',
  ].join('\n');
}

function formatMarketAlertBlock(alert: MarketAlert): string {
  const pct =
    typeof alert.changePercent === 'number' && Number.isFinite(alert.changePercent)
      ? formatPercentEs(alert.changePercent)
      : null;
  const hasBuy =
    typeof alert.buyPrice === 'number' &&
    alert.buyPrice > 0 &&
    typeof alert.currentPrice === 'number' &&
    alert.currentPrice > 0;
  const hasCurrent = typeof alert.currentPrice === 'number' && alert.currentPrice > 0;
  const buyMoney = hasBuy ? formatMoneyWhatsApp(alert.buyPrice!, alert.buyCurrency) : null;
  const currentMoney = hasCurrent
    ? formatMoneyWhatsApp(alert.currentPrice!, alert.currentCurrency)
    : null;

  if (alert.kind === 'loss-since-buy') {
    const title = pct
      ? `🔴 *${alert.ticker} está ${pct}% abajo de tu compra*`
      : `🔴 *${alert.ticker} está abajo de tu compra*`;
    if (buyMoney && currentMoney) {
      return [title, '', `Compra: *${buyMoney}*`, `Precio actual: *${currentMoney}*`].join('\n');
    }
    return title;
  }

  if (alert.kind === 'gain-since-buy') {
    const title = pct
      ? `🟢 *${alert.ticker} subió ${pct}% desde tu compra*`
      : `🟢 *${alert.ticker} subió desde tu compra*`;
    if (buyMoney && currentMoney) {
      return [title, '', `Compra: *${buyMoney}*`, `Precio actual: *${currentMoney}*`].join('\n');
    }
    return title;
  }

  if (alert.kind === 'daily-drop') {
    const title = pct
      ? `🔴 *${alert.ticker} bajó ${pct}% hoy*`
      : `🔴 *${alert.ticker} bajó hoy*`;
    if (currentMoney) {
      return [title, '', `Precio actual: *${currentMoney}*`].join('\n');
    }
    return title;
  }

  if (alert.kind === 'daily-rise') {
    const title = pct
      ? `🟢 *${alert.ticker} subió ${pct}% hoy*`
      : `🟢 *${alert.ticker} subió hoy*`;
    if (currentMoney) {
      return [title, '', `Precio actual: *${currentMoney}*`].join('\n');
    }
    return title;
  }

  return `🟡 *${alert.title}*`;
}

export function formatMarketWhatsAppMessage(alerts: MarketAlert[]): string {
  if (alerts.length === 0) return formatMarketTestEmptyWhatsAppMessage();

  const header =
    alerts.length === 1 ? '🔔 *Alerta de mercado*' : '🔔 *Alertas de mercado*';
  const blocks = alerts.map(formatMarketAlertBlock);

  return [header, '', ...blocks.flatMap((block, i) => (i === 0 ? [block] : ['', block]))].join(
    '\n',
  );
}
