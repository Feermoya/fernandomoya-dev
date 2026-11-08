/** PWA abierta en modo app instalada. */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
export type FinanceInstallPlatform = 'ios' | 'android' | 'desktop';
export function detectInstallPlatform(userAgent: string, touches = 0): FinanceInstallPlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && touches > 1)) return 'ios';
  return ua.includes('android') ? 'android' : 'desktop';
}
