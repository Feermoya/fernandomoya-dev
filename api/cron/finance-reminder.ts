import { runFinanceReminderCron } from '../../src/lib/finance/reminderCron';

type Res = {
  status(code: number): { json(body: unknown): void };
};

function isAuthorized(req: { headers?: { authorization?: string } }): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers?.authorization ?? '';
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron → CallMeBot + Supabase (gratis en hobby). */
export default async function handler(req: { headers?: { authorization?: string }; method?: string }, res: Res) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const result = await runFinanceReminderCron();
    const status = result.action === 'error' ? 500 : 200;
    return res.status(status).json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ ok: false, action: 'error', error: msg });
  }
}
