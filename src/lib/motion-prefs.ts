export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function canUsePointerParallax(): boolean {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  return window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
}
