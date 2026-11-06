import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { userMustChoosePassword } from '@/lib/finance/accountAccess';
import FinanceGameApp from '@/components/finance/FinanceGameApp';
import { FinanceLogin } from '@/components/finance/FinanceLogin';
import { FinanceSetPassword } from '@/components/finance/FinanceSetPassword';
import { getFinanceAuthClient, signOutOfFinance } from '@/lib/finance/authClient';

export default function FinanceAppRoot() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [passwordChosen, setPasswordChosen] = useState(false);
  const sessionUserId = session?.user?.id;

  useEffect(() => {
    setPasswordChosen(false);
  }, [sessionUserId]);

  useEffect(() => {
    const client = getFinanceAuthClient();
    if (!client) {
      setSession(null);
      return;
    }
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
    });
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="finance-app-shell px-4 py-8" role="status">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">Cargando sesión…</p>
      </div>
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
    <FinanceGameApp
      key={session.user.id}
      userId={session.user.id}
      email={session.user.email ?? ''}
      onSignOut={() => {
        setSession(null);
        void signOutOfFinance();
      }}
    />
  );
}
