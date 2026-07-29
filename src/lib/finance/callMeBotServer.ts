/** Envío CallMeBot en servidor (lee respuesta; no usar `no-cors`). */
const CALLMEBOT_TIMEOUT_MS = 10_000;

export async function sendCallMeBotWhatsAppServer(
  phoneDigits: string,
  text: string,
  apiKey: string,
): Promise<{ ok: boolean; detail: string }> {
  const phone = phoneDigits.replace(/\D/g, '');
  const key = apiKey.trim();
  if (!phone || !key) {
    return { ok: false, detail: 'Falta teléfono o API key de CallMeBot.' };
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(CALLMEBOT_TIMEOUT_MS),
    });
    const detail = (await res.text()).trim().slice(0, 500);
    const lower = detail.toLowerCase();
    const looksError =
      lower.includes('error') ||
      lower.includes('invalid') ||
      lower.includes('not allowed') ||
      lower.includes('forbidden');
    const ok = res.ok && detail.length > 0 && !looksError;
    return { ok, detail: detail || `HTTP ${res.status}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed';
    if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')) {
      // CallMeBot a menudo encola y tarda en ACK; el mensaje puede llegar igual.
      return {
        ok: true,
        detail: 'CallMeBot no respondió a tiempo; el mensaje puede estar en cola.',
      };
    }
    return { ok: false, detail: msg };
  }
}
