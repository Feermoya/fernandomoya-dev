import { formatARS } from '@/lib/finance/calculations';
import type { MarketAlert } from '@/lib/finance/marketAlerts';

const BOT_SIGN =
  '👋 Hola, soy tu bot de *Foco financiero*. Te escribo para acompañarte, no para apurarte.';

function levelLine(level: number, nextLevel: number, nextTitle: string): string {
  if (level <= 0) {
    return `🌱 Todavía no arrancaste el nivel este mes. El primero es *${nextTitle}* (nivel ${nextLevel}).`;
  }
  return `🎯 Estás en el *nivel ${level}*. El siguiente es *${nextLevel} · ${nextTitle}*.`;
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
  const investedLine = `💰 Este mes llevás *${formatARS(invested)}*.`;
  const gapLine = `Te faltan *${formatARS(amountMissing)}* para pasar al siguiente nivel.`;

  let body: string;
  if (kind === 'low') {
    body = [
      `📊 ${monthLabel}: todavía hay poco movimiento.`,
      investedLine,
      gapLine,
      '',
      'Si podés, cargá algo aunque sea chico. El mes se arma de a poco y después cuesta menos 💪',
    ].join('\n');
  } else if (kind === 'near_level') {
    body = [
      `🔥 ${monthLabel}: *estás muy cerca* de subir.`,
      levelLine(level, nextLevel, nextTitle),
      investedLine,
      gapLine,
      '',
      'Revisá si podés sumar un poco más y cerrás el nivel. Vale la pena el empujón final ✨',
    ].join('\n');
  } else {
    body = [
      `📈 ${monthLabel}: buen ritmo, pero todavía hay margen.`,
      levelLine(level, nextLevel, nextTitle),
      investedLine,
      gapLine,
      '',
      'Cuando puedas, meté una carga más. Mantener el foco ahora cambia el cierre del mes 🙌',
    ].join('\n');
  }

  return [BOT_SIGN, '', body, '', '_Cuando cargues plata en la app, dejo de insistir un rato._'].join('\n');
}

function emojiForAlert(alert: MarketAlert): string {
  switch (alert.kind) {
    case 'daily-drop':
    case 'loss-since-buy':
      return '📉';
    case 'daily-rise':
    case 'gain-since-buy':
      return '📈';
    default:
      return '🔔';
  }
}

function humanDetail(alert: MarketAlert): string {
  switch (alert.kind) {
    case 'loss-since-buy':
      return 'Bajó frente a tu precio de compra. Revisá con calma si querés promediar, esperar o no hacer nada.';
    case 'gain-since-buy':
      return 'Está arriba de tu compra. Buen dato para repasar si sigue alineado con tu plan.';
    case 'daily-drop':
      return 'Movimiento fuerte a la baja hoy. Puede servir mirarlo sin apurarte.';
    case 'daily-rise':
      return 'Subió bastante hoy. Un chequeo rápido alcanza.';
    default:
      return alert.detail;
  }
}

export function formatMarketWhatsAppMessage(alerts: MarketAlert[]): string {
  const blocks = alerts.map((alert) => {
    return [`${emojiForAlert(alert)} *${alert.title}*`, humanDetail(alert)].join('\n');
  });

  return [
    BOT_SIGN,
    '',
    '🔔 *Alertas de mercado* según tus activos cargados:',
    '',
    ...blocks.flatMap((block, i) => (i === 0 ? [block] : ['', block])),
    '',
    '_Esto es seguimiento informativo, no asesoramiento financiero._',
    'Cuando puedas, miralo en Foco. Si no hace falta mover nada, también está bien 👍',
  ].join('\n');
}
