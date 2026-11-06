import { useState, type FormEvent } from 'react';
import { FinanceAuthError, replaceTemporaryFinancePassword } from '@/lib/finance/authClient';
import { FocoPrimaryButton } from '@/components/finance/ui';

type Props = {
  email: string;
  onDone: () => void;
  onSignOut: () => void;
};

export function FinanceSetPassword({ email, onDone, onSignOut }: Props) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password.length < 6) {
      setError('Usá al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await replaceTemporaryFinancePassword(password);
      onDone();
    } catch (e) {
      setError(e instanceof FinanceAuthError ? e.message : 'No se pudo guardar la contraseña.');
      setBusy(false);
    }
  }

  return (
    <div className="finance-app-shell mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-8">
      <form onSubmit={onSubmit} className="finance-card w-full">
        <p className="finance-label">Primera entrada</p>
        <h1 className="finance-brand-title mt-2">Elegí tu contraseña</h1>
        <p className="finance-brand-sub mt-2">
          La que te pasaron es temporal. Elegí una fácil de recordar. Solo la vas a usar vos, {email}.
        </p>

        <label className="mt-5 block text-xs font-bold text-[var(--text-secondary)]" htmlFor="finance-new-password">
          Contraseña nueva
        </label>
        <input
          id="finance-new-password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          disabled={busy}
          onChange={(event) => setPassword(event.target.value)}
          className="finance-input-mobile mt-1 min-h-[44px] w-full rounded-xl px-3 py-2 text-sm font-semibold"
        />

        <label className="mt-3 block text-xs font-bold text-[var(--text-secondary)]" htmlFor="finance-confirm-password">
          Repetila
        </label>
        <input
          id="finance-confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          disabled={busy}
          onChange={(event) => setConfirm(event.target.value)}
          className="finance-input-mobile mt-1 min-h-[44px] w-full rounded-xl px-3 py-2 text-sm font-semibold"
        />

        {error ? (
          <p className="mt-3 rounded-[var(--radius-inner)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-semibold text-[var(--danger-text)]" role="alert">
            {error}
          </p>
        ) : null}

        <FocoPrimaryButton type="submit" showPlus={false} disabled={busy} className="mt-5 w-full">
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </FocoPrimaryButton>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-3 w-full text-xs font-semibold text-[var(--text-muted)]"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
