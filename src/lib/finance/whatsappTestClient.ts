import type { WhatsAppJobKind } from '@/lib/finance/whatsappJobs';

export type WhatsAppTestClientResult = {
  ok: boolean;
  message: string;
  detail?: string;
};

/**
 * Dispara una prueba de WhatsApp vía el mismo endpoint del cron (modo test).
 * No cuenta para el anti-spam del automático.
 */
export async function requestWhatsAppTest(
  kind: WhatsAppJobKind = 'both',
): Promise<WhatsAppTestClientResult> {
  try {
    const url = `/api/finance-keepalive?whatsapp=test&kind=${encodeURIComponent(kind)}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      whatsapp?: {
        ok?: boolean;
        reminder?: { action?: string; skipReason?: string; error?: string };
        market?: { action?: string; skipReason?: string; error?: string };
      };
    } | null;

    if (!res.ok || !body) {
      return {
        ok: false,
        message: 'No se pudo contactar el servidor de avisos.',
        detail: body?.error,
      };
    }

    const reminder = body.whatsapp?.reminder;
    const market = body.whatsapp?.market;
    const parts: string[] = [];

    if (kind === 'both' || kind === 'investment') {
      if (reminder?.action === 'sent') parts.push('inversión enviada');
      else if (reminder?.error) parts.push(`inversión: ${reminder.error}`);
      else if (reminder?.skipReason) parts.push(`inversión omitida (${reminder.skipReason})`);
    }
    if (kind === 'both' || kind === 'market') {
      if (market?.action === 'sent') parts.push('mercado enviado');
      else if (market?.error) parts.push(`mercado: ${market.error}`);
      else if (market?.skipReason) parts.push(`mercado omitido (${market.skipReason})`);
    }

    const sent =
      (kind !== 'market' && reminder?.action === 'sent') ||
      (kind !== 'investment' && market?.action === 'sent');

    return {
      ok: Boolean(body.ok && sent),
      message: sent
        ? `Listo. Revisá WhatsApp (${parts.join(' · ')}).`
        : `No se envió mensaje. ${parts.join(' · ') || body.error || 'Revisá la key y el sync.'}`,
      detail: parts.join(' | '),
    };
  } catch (e) {
    return {
      ok: false,
      message: 'Error de red al pedir la prueba.',
      detail: e instanceof Error ? e.message : undefined,
    };
  }
}
