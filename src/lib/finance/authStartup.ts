/**
 * Restore the persisted Supabase session before registering auth listeners.
 * Registering onAuthStateChange during getSession initialization can
 * deadlock around the browser Web Lock when a token is almost expired.
 */
export type InitialAuthResult<S> = { data: { session: S | null }; error: unknown };
export type FinanceAuthStartup<S> = {
  getSession: () => Promise<InitialAuthResult<S>>;
  subscribe: (onChange: (session: S | null) => void) => () => void;
};
export type FinanceAuthStartupEvents<S> = {
  onSession: (session: S | null) => void;
  onSlow: () => void;
  onError: () => void;
};

export function startFinanceAuthSession<S>(
  auth: FinanceAuthStartup<S>,
  events: FinanceAuthStartupEvents<S>,
  slowAfterMs = 6500,
): () => void {
  let active = true, settled = false;
  let unsubscribe: (() => void) | undefined;
  let subscriptionTimer: ReturnType<typeof setTimeout> | undefined;

  const slowTimer = setTimeout(() => {
    if (active && !settled) events.onSlow();
  }, slowAfterMs);
  const onError = () => {
    if (!active) return;
    settled = true;
    clearTimeout(slowTimer);
    events.onError();
  };

  void Promise.resolve()
    .then(() => auth.getSession())
    .then(({ data, error }) => {
      if (!active) return;
      if (error) { onError(); return; }
      settled = true;
      clearTimeout(slowTimer);
      events.onSession(data.session ?? null);
      // Next macrotask: let auth-js release its internal lock first.
      subscriptionTimer = setTimeout(() => {
        if (!active) return;
        try {
          unsubscribe = auth.subscribe((session) => {
            if (active) events.onSession(session);
          });
        } catch {
          onError();
        }
      }, 0);
    })
    .catch(onError);

  return () => {
    active = false;
    clearTimeout(slowTimer);
    if (subscriptionTimer !== undefined) clearTimeout(subscriptionTimer);
    unsubscribe?.();
  };
}
