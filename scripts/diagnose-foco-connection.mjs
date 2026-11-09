/**
 * Network-only cold-start diagnostics, no auth credentials or user data.
 * Run: npm run diagnose:foco
 * Differentiates DNS/connection timeouts from delayed React authentication.
 */
import { lookup } from 'node:dns/promises';
import { performance } from 'node:perf_hooks';

const hosts = ['www.fermoyadev.com.ar', 'fernandomoya-dev.vercel.app'];
for (const host of hosts) {
  const dnsStart = performance.now();
  try {
    const addresses = await Promise.race([
      lookup(host, { all: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 7000)),
    ]);
    console.log(`[DNS] ${host}: ${Math.round(performance.now()-dnsStart)}ms, IPv${addresses.map(a=>a.family).join('/IPv')}`);
  } catch (error) {
    console.error(`[DNS] ${host}: ${error.message}`);
    process.exitCode = 1;
  }

  const httpStart = performance.now();
  try {
    const response = await fetch(`https://${host}/foco-financiero`, {
      headers: {Accept:'text/html'},
      signal: AbortSignal.timeout(12000),
    });
    const html = await response.text();
    const shell = html.includes('foco-boot-static');
    console.log(`[HTTP] ${host}: status=${response.status}, elapsed=${Math.round(performance.now()-httpStart)}ms, HTML-shell=${shell}, CDN=${response.headers.get('x-vercel-cache') ?? 'unknown'}`);
    if (!response.ok || !shell) process.exitCode = 1;
  } catch (error) {
    console.error(`[HTTP] ${host}: ${error.message}, elapsed=${Math.round(performance.now()-httpStart)}ms`);
    process.exitCode = 1;
  }
}
