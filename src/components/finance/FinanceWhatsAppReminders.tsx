import { useMemo } from 'react';
import { site } from '@/data/site';
import { evaluateInvestmentWhatsAppNudge } from '@/lib/finance/levels';
import { normalizePreferences, whatsappAutomationReadiness } from '@/lib/finance/preferences';
import { getArgentinaDateParts } from '@/lib/finance/timezone';
import type { FinancePreferences, FinanceState } from '@/lib/finance/types';

type Props = {
  state: FinanceState;
  onPreferencesChange: (prefs: FinancePreferences) => void;
};

export function FinanceWhatsAppReminders({ state, onPreferencesChange }: Props) {
  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;
  const readiness = whatsappAutomationReadiness(reminder);
  const { monthKey } = getArgentinaDateParts();

  const nudge = useMemo(
    () => evaluateInvestmentWhatsAppNudge(state, monthKey),
    [state, monthKey],
  );

  const patchReminder = (partial: Partial<typeof reminder>) => {
    onPreferencesChange({
      ...prefs,
      reminder: { ...reminder, ...partial },
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold leading-relaxed text-slate-600">
        Avisos automáticos a {site.social.whatsappPhoneDigits} por el cron diario (~11:00 AR). La app
        detecta si este mes invertiste poco o si estás cerca de subir de nivel; si ya llegaste a un
        buen volumen, no molesta.
      </p>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <input
          type="checkbox"
          checked={reminder.enabled}
          onChange={(e) => patchReminder({ enabled: e.target.checked })}
          className="h-5 w-5 rounded border-slate-300 text-blue-600"
        />
        <span className="text-sm font-bold text-slate-900">Recordatorio de inversión</span>
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
        <input
          type="checkbox"
          checked={Boolean(reminder.marketWhatsAppEnabled)}
          onChange={(e) => patchReminder({ marketWhatsAppEnabled: e.target.checked })}
          className="h-5 w-5 rounded border-slate-300 text-blue-600"
        />
        <span className="text-sm font-bold text-slate-900">Alertas de mercado</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="finance-label">API key CallMeBot (una sola vez)</span>
        <input
          type="password"
          autoComplete="off"
          placeholder="Pegá acá la key que te mandó el bot"
          className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm"
          value={reminder.callMeBotApiKey ?? ''}
          onChange={(e) => patchReminder({ callMeBotApiKey: e.target.value.trim() })}
        />
        <span className="text-[10px] text-slate-500">
          Se guarda con tu sync a la nube. No hace falta variable en Vercel.
        </span>
      </label>

      {reminder.enabled ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="finance-label text-emerald-600">Qué vería el cron ahora</p>
          {nudge.shouldNotify ? (
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-emerald-800">
              {nudge.message}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-emerald-800">
              Sin aviso: el volumen del mes alcanza. Silencio hasta el próximo mes / si baja el ritmo.
            </p>
          )}
        </div>
      ) : null}

      <ul className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600">
        <li className="text-emerald-700">Número fijo: {site.social.whatsappPhoneDigits}</li>
        <li className={readiness.apiKeyOk ? 'text-emerald-700' : 'text-amber-700'}>
          {readiness.apiKeyOk ? 'CallMeBot key guardada' : 'Falta pegar la API key arriba'}
        </li>
        <li className={readiness.anyJobEnabled ? 'text-emerald-700' : 'text-amber-700'}>
          {readiness.anyJobEnabled
            ? 'Al menos un aviso automático activado'
            : 'Activá inversión y/o mercado'}
        </li>
        <li className={readiness.ready ? 'text-emerald-700' : 'text-slate-500'}>
          {readiness.ready
            ? 'Listo: el cron puede enviarte WhatsApp (~11:00 AR)'
            : 'Completá key + un aviso activado'}
        </li>
      </ul>

      <p className="text-[10px] leading-relaxed text-slate-500">
        CallMeBot:{' '}
        <a
          href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
          className="text-blue-600 underline"
          target="_blank"
          rel="noreferrer"
        >
          callmebot.com
        </a>
        . Pegá la key solo en esta pantalla (no en el chat ni en GitHub).
      </p>
    </div>
  );
}
