import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function getFinanceAuthClient(): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_FINANCE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.PUBLIC_FINANCE_SUPABASE_ANON_KEY as string | undefined;
  if (!url?.trim() || !key?.trim()) return null;
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'fm-finance-auth',
      },
    });
  }
  return browserClient;
}

export class FinanceAuthError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status = 401, code?: string) {
    super(message);
    this.name = 'FinanceAuthError';
    this.status = status;
    this.code = code;
  }
}

export async function assertFinanceSessionUser(userId: string): Promise<void> {
  const client = getFinanceAuthClient();
  if (!client) throw new FinanceAuthError('La nube no está configurada.', 503);
  const { data, error } = await client.auth.getSession();
  if (error || !data.session || data.session.user.id !== userId) {
    throw new FinanceAuthError('La sesión cambió.');
  }
}

export async function getFinanceAccessToken(): Promise<string> {
  const client = getFinanceAuthClient();
  if (!client) throw new FinanceAuthError('La nube no está configurada.', 503);
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new FinanceAuthError('Tenés que iniciar sesión.');
  }
  return data.session.access_token;
}

export async function signInToFinance(email: string, password: string): Promise<Session> {
  const client = getFinanceAuthClient();
  if (!client) throw new FinanceAuthError('La nube no está configurada.', 503);
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.session) {
    throw new FinanceAuthError('Correo o contraseña incorrectos.');
  }
  return data.session;
}

export async function replaceTemporaryFinancePassword(password: string): Promise<void> {
  const client = getFinanceAuthClient();
  if (!client) throw new FinanceAuthError('La nube no está configurada.', 503);
  const { error } = await client.auth.updateUser({
    password,
    data: { must_set_password: false },
  });
  if (error) throw new FinanceAuthError('No se pudo guardar la contraseña. Probá con otra.');
}

export async function signOutOfFinance(): Promise<void> {
  const client = getFinanceAuthClient();
  if (!client) return;
  await client.auth.signOut();
}
