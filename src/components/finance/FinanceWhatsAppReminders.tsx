import { useMemo, useState } from 'react';
import { formatARS, getMonthlyInvested, MONTHLY_STREAK_MINIMUM_ARS } from '@/lib/finance/calculations';
import {
  buildWhatsAppLink,
  cronReminderRunKey,
  DEFAULT_REMINDER_MESSAGE,
  markCronReminderSent,
  normalizePreferences,
  reminderMessageForMonth,
  sendCallMeBotWhatsApp,
} from '@/lib/finance/preferences';
import { getArgentinaDateParts, monthLabelEsFromKey } from '@/lib/finance/timezone';
import type { FinancePreferences, FinanceState } from '@/lib/finance/types';

type Props = {
  state: FinanceState;
  onPreferencesChange: (prefs: FinancePreferences) => void;
};

const DAY_OPTIONS = [1, 5, 10, 15, 20, 25] as const;


export function FinanceWhatsAppReminders({ state, onPreferencesChange }: Props) {
  const prefs = normalizePreferences(state.preferences);
  const reminder = prefs.reminder;
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const { monthKey, day } = getArgentinaDateParts();
  const invested = getMonthlyInvested(state.entries, monthKey);
  const previewText = useMemo(
    () =>
      reminderMessageForMonth(
        reminder.messageTemplate ?? DEFAULT_REMINDER_MESSAGE,
        monthLabelEsFromKey(monthKey),
        invested,
      ),
    [reminder.messageTemplate, monthKey, invested],
  );

  const waLink = buildWhatsAppLink(reminder.phoneDigits, previewText);

  const patchReminder = (partial: Partial<typeof reminder>) => {
    onPreferencesChange({
      ...prefs,
      reminder: { ...reminder, ...partial },
    });
  };

  const toggleDay = (day: number) => {
    const set = new Set(reminder.daysOfMonth);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    patchReminder({ daysOfMonth: [...set].sort((a, b) => a - b) });
  };

  const sendAuto = async () => {
    if (!reminder.callMeBotApiKey?.trim()) {
      setSendResult('Agregá tu API key de CallMeBot (gratis en callmebot.com).');
      return;
    }
    setSending(true);
    setSendResult(null);
    const res = await sendCallMeBotWhatsApp(reminder.phoneDigits, previewText, reminder.callMeBotApiKey);
    setSending(false);
    if (res.ok) {
      setSendResult('Pedido enviado. Revisá WhatsApp en unos segundos.');
      patchReminder(markCronReminderSent(reminder, cronReminderRunKey(monthKey, day)));
    } else {
      setSendResult(res.error ?? 'No se pudo enviar.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold leading-relaxed text-slate-300">
        Recordatorios por WhatsApp: abrís un chat con el mensaje listo, o envío automático con CallMeBot.
      </p>

      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-3">
        <input
          type="checkbox"
          checked={reminder.enabled}
          onChange={(e) => patchReminder({ enabled: e.target.checked })}
          className="h-5 w-5 rounded border-white/20"
        />
        <span className="text-sm font-bold text-white">Activar recordatorios</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase text-slate-400">Tu WhatsApp (con código país)</span>
        <input
          type="tel"
          inputMode="numeric"
          placeholder="5491123456789"
          className="finance-input-mobile min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 text-sm font-bold text-white"
          value={reminder.phoneDigits}
          onChange={(e) => patchReminder({ phoneDigits: e.target.value.replace(/\D/g, '') })}
        />
        <span className="text-[10px] text-slate-500">Argentina: 54 + 9 + área + número (sin + ni espacios).</span>
      </label>

      <div>
        <p className="text-[10px] font-bold uppercase text-slate-400">Días del mes</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAY_OPTIONS.map((d) => {
            const on = reminder.daysOfMonth.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`min-h-[40px] min-w-[44px] rounded-xl border px-3 text-sm font-black transition ${
                  on
                    ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                    : 'border-white/15 bg-white/5 text-slate-400'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Solo avisa si este mes invertiste menos de {formatARS(MONTHLY_STREAK_MINIMUM_ARS)} (nada o poco). Si
          ya llegaste a ese mínimo, no manda WhatsApp ni banner.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase text-slate-400">
          Mensaje ({'{mes}'}, {'{invertido}'}, {'{falta}'})
        </span>
        <textarea
          rows={3}
          className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          value={reminder.messageTemplate ?? DEFAULT_REMINDER_MESSAGE}
          onChange={(e) => patchReminder({ messageTemplate: e.target.value })}
        />
      </label>

      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
        <p className="text-[10px] font-bold uppercase text-emerald-200/70">Vista previa</p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-50/90">{previewText}</p>
      </div>

      <div className="flex flex-col gap-2">
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-center rounded-xl bg-[#25D366] text-sm font-black text-white shadow-md active:scale-[0.99]"
          >
            Abrir WhatsApp con este mensaje
          </a>
        ) : (
          <p className="text-xs text-amber-200/90">Cargá tu número para habilitar WhatsApp.</p>
        )}

        <label className="mt-2 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            API key CallMeBot (opcional, envío automático)
          </span>
          <input
            type="password"
            autoComplete="off"
            placeholder="Pegá la key de callmebot.com"
            className="finance-input-mobile min-h-[44px] rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
            value={reminder.callMeBotApiKey ?? ''}
            onChange={(e) => patchReminder({ callMeBotApiKey: e.target.value })}
          />
        </label>

        <button
          type="button"
          disabled={sending || !reminder.phoneDigits}
          onClick={() => void sendAuto()}
          className="min-h-[48px] rounded-xl border border-white/15 bg-white/10 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'Enviar por WhatsApp ahora (CallMeBot)'}
        </button>

        {sendResult ? <p className="text-xs font-semibold text-slate-400">{sendResult}</p> : null}

        <p className="text-[10px] leading-relaxed text-slate-500">
          CallMeBot es gratuito: vinculá tu número en{' '}
          <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" className="text-cyan-400 underline" target="_blank" rel="noreferrer">
            callmebot.com
          </a>
          . En producción, un cron de Vercel puede enviar el recordatorio solo los días que elijas (5, 15, 25…)
          si configurás <code className="text-slate-400">CALLMEBOT_API_KEY</code> y{' '}
          <code className="text-slate-400">CRON_SECRET</code> en el hosting (sin costo extra en hobby).
        </p>
      </div>
    </div>
  );
}
