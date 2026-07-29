import type { MarketAlert } from '@/lib/finance/marketAlerts';
import { evaluateInvestmentWhatsAppNudge } from '@/lib/finance/levels';
import {
  formatInvestmentTestWhatsAppMessage,
  formatInvestmentWhatsAppMessage,
  formatMarketTestEmptyWhatsAppMessage,
  formatMarketWhatsAppMessage,
} from '@/lib/finance/whatsappCopy';
import type { FinanceState } from '@/lib/finance/types';
import { getArgentinaDateParts } from '@/lib/finance/timezone';

export type WhatsAppTestClientResult = {
  ok: boolean;
  message: string;
  detail?: string;
};

async function postWhatsAppTexts(texts: string[]): Promise<WhatsAppTestClientResult> {
  try {
    const res = await fetch('/api/finance-whatsapp-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(texts.length === 1 ? { text: texts[0] } : { texts }),
      cache: 'no-store',
    });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      sent?: number;
      note?: string;
      results?: { ok: boolean; detail: string }[];
    } | null;

    if (!res.ok || !body) {
      return {
        ok: false,
        message: 'No se pudo contactar el envío WhatsApp.',
        detail: body?.error,
      };
    }

    if (!body.ok && !(body.sent && body.sent > 0)) {
      return {
        ok: false,
        message: body.error || 'CallMeBot no aceptó el mensaje.',
        detail: body.results?.[0]?.detail,
      };
    }

    return {
      ok: true,
      message:
        'Pedido aceptado. Revisá WhatsApp: CallMeBot gratis a veces tarda unos minutos en entregar.',
      detail: body.note ?? body.results?.[0]?.detail,
    };
  } catch (e) {
    return {
      ok: false,
      message: 'Error de red al pedir el envío.',
      detail: e instanceof Error ? e.message : undefined,
    };
  }
}

/** Prueba de mercado con alertas ya calculadas en la UI (sin re-scrape en servidor). */
export async function requestMarketWhatsAppTest(
  alerts: MarketAlert[],
): Promise<WhatsAppTestClientResult> {
  const actionable = alerts.filter((a) => a.kind !== 'neutral');
  const text =
    actionable.length > 0
      ? formatMarketWhatsAppMessage(actionable)
      : formatMarketTestEmptyWhatsAppMessage();
  return postWhatsAppTexts([text]);
}

/** Prueba de inversión con el estado local (sin cron / precios). */
export async function requestInvestmentWhatsAppTest(
  state: FinanceState,
): Promise<WhatsAppTestClientResult> {
  const { monthKey } = getArgentinaDateParts();
  const nudge = evaluateInvestmentWhatsAppNudge(state, monthKey);
  const text = nudge.shouldNotify
    ? nudge.message
    : formatInvestmentTestWhatsAppMessage(nudge.invested);
  return postWhatsAppTexts([text]);
}

/** Envía inversión + mercado en pedidos separados (espaciados en el servidor). */
export async function requestCombinedWhatsAppTest(
  state: FinanceState,
  alerts: MarketAlert[],
): Promise<WhatsAppTestClientResult> {
  const { monthKey } = getArgentinaDateParts();
  const nudge = evaluateInvestmentWhatsAppNudge(state, monthKey);
  const investmentText = nudge.shouldNotify
    ? nudge.message
    : formatInvestmentTestWhatsAppMessage(nudge.invested);

  const actionable = alerts.filter((a) => a.kind !== 'neutral');
  const marketText =
    actionable.length > 0
      ? formatMarketWhatsAppMessage(actionable)
      : formatMarketTestEmptyWhatsAppMessage();

  return postWhatsAppTexts([investmentText, marketText]);
}

/** @deprecated usar requestMarket / requestInvestment */
export async function requestWhatsAppTest(
  kind: 'investment' | 'market' | 'both' = 'both',
  opts?: { state?: FinanceState; alerts?: MarketAlert[] },
): Promise<WhatsAppTestClientResult> {
  if (kind === 'investment' && opts?.state) {
    return requestInvestmentWhatsAppTest(opts.state);
  }
  if (kind === 'market' && opts?.alerts) {
    return requestMarketWhatsAppTest(opts.alerts);
  }
  if (kind === 'both' && opts?.state) {
    return requestCombinedWhatsAppTest(opts.state, opts.alerts ?? []);
  }
  return {
    ok: false,
    message: 'Faltan datos para armar el mensaje de prueba.',
  };
}

// re-export for callers that build messages themselves
export { formatInvestmentWhatsAppMessage };
