import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Overlay de navegación entre rutas del panel (SSR tarda en cobros/clientes).
 * Se muestra al clickear links internos /panel y se limpia al cargar la nueva página.
 */
export function PanelRouteLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!url.pathname.startsWith('/panel')) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      setVisible(true);
    };

    const hide = () => setVisible(false);
    window.addEventListener('click', onClick, true);
    window.addEventListener('pageshow', hide);
    window.addEventListener('pagehide', hide);

    return () => {
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('pageshow', hide);
      window.removeEventListener('pagehide', hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="panel-route-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="panel-route-loading__card">
        <Loader2 size={22} className="animate-spin" aria-hidden />
        <p className="panel-route-loading__text">Cargando…</p>
      </div>
    </div>
  );
}
