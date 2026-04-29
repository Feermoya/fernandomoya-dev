import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type NavLink = { href: string; label: string };

type Props = {
  siteName: string;
  links: readonly NavLink[];
};

export default function SiteHeader({ siteName, links }: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const menuButtonId = 'site-header-menu-btn';
  const menuPanelId = 'site-header-menu-panel';

  useMotionValueEvent(scrollY, 'change', (y) => {
    setIsScrolled(y > 50);
  });

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (menuRootRef.current?.contains(t)) return;
      if (menuPanelRef.current?.contains(t)) return;
      closeMenu();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [menuOpen, closeMenu]);

  return (
    <header
      id="site-header"
      className="site-header-glass sticky top-0 z-50 overflow-visible border-b border-white/[0.08] pt-[env(safe-area-inset-top,0px)]"
      data-scrolled={isScrolled ? 'true' : 'false'}
    >
      <div className="header-inner container-page flex min-h-0 flex-nowrap items-center justify-between gap-3 py-2 sm:gap-4 sm:py-2.5 lg:py-2">
        <a
          href="#inicio"
          className="group inline-flex min-w-0 shrink items-center gap-2.5 font-semibold tracking-tight text-text transition-colors duration-200 ease-out hover:text-accent motion-reduce:transition-none"
        >
          <motion.span
            className="site-logo-fm-wrap inline-flex h-9 min-w-[2.625rem] items-center justify-center overflow-hidden rounded-lg border border-white/[0.12] bg-white/[0.05] px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] will-change-transform motion-reduce:will-change-auto"
            aria-hidden="true"
            whileHover={reduce ? undefined : { rotate: 4, scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <span className="site-logo-fm">
              <span className="site-logo-fm__letter">F</span>
              <span className="site-logo-fm__letter">M</span>
            </span>
          </motion.span>
          <span className="hidden text-sm sm:inline">{siteName}</span>
        </a>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Principal">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative rounded-md px-2.5 py-2 pb-2.5 text-sm text-muted transition-colors duration-200 ease-out hover:text-text motion-reduce:transition-none"
            >
              <span className="relative z-10">{l.label}</span>
              <span className="nav-underline-grow" aria-hidden="true" />
            </a>
          ))}
        </nav>

        <div ref={menuRootRef} className="shrink-0 lg:hidden">
          <button
            id={menuButtonId}
            type="button"
            className="glass-surface-sm inline-flex h-9 w-[5.75rem] shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-2 text-sm font-medium text-text"
            aria-expanded={menuOpen}
            aria-controls={menuPanelId}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? 'Cerrar' : 'Menú'}
          </button>
        </div>
      </div>
      {menuOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[200] lg:hidden" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Cerrar menú"
                onClick={closeMenu}
              />
              {/*
                .glass-panel fuerza position:relative en global.css y anula `fixed` de Tailwind:
                el menú quedaba al final del body (invisible). !absolute dentro de este layer fixed.
              */}
              <nav
                ref={menuPanelRef}
                id={menuPanelId}
                className="glass-panel !absolute left-4 right-4 z-[1] mx-auto max-h-[min(24rem,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-5.5rem))] w-full max-w-sm overflow-y-auto rounded-xl p-1.5 shadow-elevated"
                style={{
                  top: 'max(4rem, calc(env(safe-area-inset-top, 0px) + 3.35rem + 0.5rem))',
                }}
                role="navigation"
                aria-label="Móvil"
              >
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-200 ease-out hover:bg-white/[0.06] hover:text-text motion-reduce:transition-none"
                    onClick={closeMenu}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
