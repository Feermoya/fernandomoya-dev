import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { userMustChoosePassword } from '@/lib/finance/accountAccess';
import { FinanceLogin } from '@/components/finance/FinanceLogin';
import { FinanceSetPassword } from '@/components/finance/FinanceSetPassword';
import { FinanceBootScreen } from '@/components/finance/FinanceBootScreen';
import { FinanceStartupErrorBoundary } from '@/components/finance/FinanceStartupErrorBoundary';
import { getFinanceAuthClient, signOutOfFinance } from '@/lib/finance/authClient';

// El dashboard, PDFs, gráficos y la cartera no bloquean la primera pantalla.
const FinanceGameApp = lazy(() => import('@/components/finance/FinanceGameApp'));

export default function FinanceAppRoot() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [authIssue, setAuthIssue] = useState(false);
  const [slow, setSlow] = useState(false);
  const [passwordChosen, setPasswordChosen] = useState(false);
  const sessionUserId = session?.user?.id;

  useEffect(() => { setPasswordChosen(false); }, [sessionUserId]);

  useEffect(() => {
    const client = getFinanceAuthClient();
    if (!client) { setSession(null); return; }
    let active = true;
    const slower = window.setTimeout(() => { if (active) setSlow(true); }, 4500);

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) { setAuthIssue(true); return; }
      setSession(data.session ?? null);
    }).catch(() => {
      if (active) setAuthIssue(true);
    });

    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setAuthIssue(false);
      setSession(next);
    });
    return () => {
      active = false;
      clearTimeout(slower);
      data.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <FinanceBootScreen
        description={authIssue ? 'No se pudo recuperar tu sesión.' : 'Abriendo tu cuenta…'}
        slow={slow || authIssue}
      />
    );
  }

  if (!session?.user) return <FinanceLogin />;

  if (userMustChoosePassword(session.user.user_metadata) && !passwordChosen) {
    return (
      <FinanceSetPassword
        email={session.user.email ?? ''}
        onDone={() => setPasswordChosen(true)}
        onSignOut={() => {
          setPasswordChosen(false);
          setSession(null);
          void signOutOfFinance();
        }}
      />
    );
  }

  return (
    <FinanceStartupErrorBoundary>
      <Suspense fallback={<FinanceBootScreen description="Preparando tu tablero…" slow={slow} />}>
        <FinanceGameApp
          key={session.user.id}
          userId={session.user.id}
          email={session.user.email ?? ''}
          onSignOut={() => {
            setSession(null);
            void signOutOfFinance();
          }}
        />
      </Suspense>
    </FinanceStartupErrorBoundary>
  );
}
