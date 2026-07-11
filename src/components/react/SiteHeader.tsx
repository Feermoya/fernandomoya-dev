import { useMotionValueEvent, useScroll } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type NavLink = { href: string; label: string };

type Props = {
  siteName: string;
  links: readonly NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
  backHref?: string;
  backLabel?: string;
  logoHref?: string;
};

export default function SiteHeader({
  siteName,
  links,
  ctaHref = '#contacto',
  ctaLabel = 'Hablemos',
  backHref,
  backLabel = 'Volver al trabajo',
  logoHref = '#inicio',
}: Props) {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonId = 'site-header-menu-btn';
  const menuPanelId = 'site-header-menu-panel';

  useMotionValueEvent(scrollY, 'change', (y) => {
    setIsScrolled(y > 24);
  });

  const closeMenu = useCallback((returnFocus = false) => {
    setMenuOpen(false);
    document.body.style.overflow = '';
    if (returnFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = '';
      return;
    }

    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu(true);
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, closeMenu]);

  const handleMobileNavClick = useCallback(() => {
    closeMenu();
  }, [closeMenu]);

  return (
    <div className="site-header-shell">
      <header id="site-header" aria-label="Sitio">
        <div
          className="site-header-bar"
          data-scrolled={isScrolled ? 'true' : 'false'}
        >
          <a href={logoHref} className="site-header-logo" aria-label={`${siteName} — Inicio`}>
            <span className="site-header-logo-mark" aria-hidden="true">
              FM
            </span>
            <span className="site-header-logo-name">{siteName}</span>
          </a>

          {backHref ? (
            <nav className="site-header-nav site-header-nav--case" aria-label="Caso de estudio">
              <a href={backHref} className="site-header-nav-link">
                {backLabel}
              </a>
            </nav>
          ) : (
            <nav className="site-header-nav" aria-label="Principal">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="site-header-nav-link">
                  {l.label}
                </a>
              ))}
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <a href={ctaHref} className="site-header-cta">
              {ctaLabel}
            </a>

            <div className="site-header-menu-btn-wrap shrink-0">
              <button
                ref={menuButtonRef}
                id={menuButtonId}
                type="button"
                className="site-header-menu-btn motion-reduce:transition-none"
                aria-expanded={menuOpen}
                aria-controls={menuPanelId}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {menuOpen ? 'Cerrar' : 'Menú'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <button
                type="button"
                className="site-header-mobile-backdrop lg:hidden"
                aria-label="Cerrar menú"
                onClick={() => closeMenu(true)}
              />
              <nav
                ref={menuPanelRef}
                id={menuPanelId}
                className="site-header-mobile-panel lg:hidden"
                role="navigation"
                aria-label="Móvil"
              >
                {backHref ? (
                  <a
                    href={backHref}
                    className="site-header-mobile-link motion-reduce:transition-none"
                    onClick={handleMobileNavClick}
                  >
                    {backLabel}
                  </a>
                ) : (
                  links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="site-header-mobile-link motion-reduce:transition-none"
                      onClick={handleMobileNavClick}
                    >
                      {link.label}
                    </a>
                  ))
                )}
                <div className="site-header-mobile-cta">
                  <a
                    href={ctaHref}
                    className="site-header-cta motion-reduce:transition-none"
                    onClick={handleMobileNavClick}
                  >
                    {ctaLabel}
                  </a>
                </div>
              </nav>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
