import { initSplitTextElements } from '@/lib/split-text-animate';

function boot() {
  queueMicrotask(() => initSplitTextElements(document.body));
}

boot();
document.addEventListener('astro:page-load', boot);
