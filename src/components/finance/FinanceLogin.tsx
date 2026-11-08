import { useState, type FormEvent } from 'react';
import { FinanceAuthError, getFinanceAuthClient, signInToFinance } from '@/lib/finance/authClient';
import { FinancePasswordField } from '@/components/finance/FinancePasswordField';
import { FocoPrimaryButton } from '@/components/finance/ui';
import { FinanceInstallHint } from '@/components/finance/FinanceInstallHint';

export function FinanceLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = getFinanceAuthClient() !== null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInToFinance(email, password);
    } catch (e) {
      setError(e instanceof FinanceAuthError ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="finance-app-shell mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-8">
      <form onSubmit={onSubmit} className="finance-card w-full">
        <p className="finance-label">Acceso</p>
        <div className="mt-3 flex items-center gap-3">
          <img src="/foco/icon-192.png" width="54" height="54" alt=""
            className="h-[54px] w-[54px] shrink-0 rounded-2xl shadow-sm" />
          <h1 className="finance-brand-title">Foco financiero</h1>
        </div>
        <p className="finance-brand-sub mt-2">
          Entrá con la cuenta que te crearon. Cada persona ve solo sus inversiones.
        </p>

        {!configured ? (
          <p className="mt-4 rounded-[var(--radius-inner)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-semibold text-[var(--danger-text)]" role="alert">
            La nube no está configurada en este entorno.
          </p>
        ) : null}

        <label className="mt-5 block text-xs font-bold text-[var(--text-secondary)]" htmlFor="finance-email">
          Correo
        </label>
        <input
          id="finance-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          disabled={!configured || busy}
          onChange={(event) => setEmail(event.target.value)}
          className="finance-input-mobile mt-1 min-h-[44px] w-full rounded-xl px-3 py-2 text-sm font-semibold"
        />

        <div className="mt-3">
          <FinancePasswordField
            id="finance-password"
            label="Contraseña"
            autoComplete="current-password"
            value={password}
            disabled={!configured || busy}
            onChange={setPassword}
          />
        </div>

        {error ? (
          <p className="mt-3 rounded-[var(--radius-inner)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-semibold text-[var(--danger-text)]" role="alert">
            {error}
          </p>
        ) : null}

        <FocoPrimaryButton type="submit" showPlus={false} disabled={!configured || busy} className="mt-5 w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </FocoPrimaryButton>

        <p className="mt-4 text-xs font-medium text-[var(--text-muted)]">
          El alta y la recuperación de la contraseña se hacen en Supabase. Esta pantalla no registra cuentas nuevas.
        </p>
        <FinanceInstallHint variant="card" />
      </form>
    </div>
  );
}
