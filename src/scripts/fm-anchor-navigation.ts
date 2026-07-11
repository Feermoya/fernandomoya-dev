function normalizePath(path: string): string {
  const trimmed = path.replace(/\/$/, '');
  return trimmed || '/';
}

function scrollToHash(hash: string, updateHistory = false): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return false;

  const target = document.getElementById(id);
  if (!target) return false;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  target.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block: 'start',
  });

  if (updateHistory && window.location.hash !== hash) {
    history.pushState(null, '', hash);
  }

  return true;
}

function isModifiedClick(event: MouseEvent): boolean {
  return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0;
}

function handleHashClick(event: MouseEvent): void {
  const anchor = (event.target as Element | null)?.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
  if (event.defaultPrevented) return;
  if (isModifiedClick(event)) return;

  const href = anchor.getAttribute('href');
  if (!href || !href.includes('#')) return;

  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }

  if (normalizePath(url.pathname) !== normalizePath(window.location.pathname)) {
    return;
  }

  const hash = url.hash;
  if (!hash || hash === '#') return;

  const id = decodeURIComponent(hash.slice(1));
  if (!document.getElementById(id)) return;

  event.preventDefault();
  scrollToHash(hash, true);
}

function scrollToCurrentHash(): void {
  const { hash } = window.location;
  if (!hash) return;
  requestAnimationFrame(() => {
    scrollToHash(hash, false);
  });
}

let initialized = false;

function initAnchorNavigation(): void {
  if (!initialized) {
    document.addEventListener('click', handleHashClick);
    window.addEventListener('popstate', scrollToCurrentHash);
    initialized = true;
  }
  scrollToCurrentHash();
}

initAnchorNavigation();
document.addEventListener('astro:page-load', initAnchorNavigation);
