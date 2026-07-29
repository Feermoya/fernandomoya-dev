import { Toaster } from 'sileo';
import 'sileo/styles.css';

/** Unico Toaster de notificaciones transitorias de Foco. */
export function FinanceToaster() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      offset={{ top: 'max(0.75rem, env(safe-area-inset-top))', right: '0.75rem' }}
    />
  );
}
