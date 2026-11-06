import { useState, type FormEvent } from 'react';
import { FinanceAuthError, replaceTemporaryFinancePassword } from '@/lib/finance/authClient';
import { FinancePasswordField } from '@/components/finance/FinancePasswordField';
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

        <div className="mt-5">
          <FinancePasswordField
            id="finance-new-password"
            label="Contraseña nueva"
            autoComplete="new-password"
            value={password}
            disabled={busy}
            onChange={setPassword}
          />
        </div>

        <div className="mt-3">
          <FinancePasswordField
            id="finance-confirm-password"
            label="Repetila"
            autoComplete="new-password"
            value={confirm}
            disabled={busy}
            onChange={setConfirm}
          />
        </div>

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
