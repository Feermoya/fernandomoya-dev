import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { useState } from 'react';

export type NavLink = { href: string; label: string };

type Props = {
  siteName: string;
  links: readonly NavLink[];
};

export default function SiteHeader({ siteName, links }: Props) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    setIsScrolled(y > 50);
  });

  return (
    <header
      id="site-header"
      className="site-header-glass sticky top-0 z-50 border-b border-white/[0.08]"
      data-scrolled={isScrolled ? 'true' : 'false'}
    >
      <div className="header-inner container-page flex items-center justify-between gap-4 py-2 sm:py-2.5 lg:py-2">
        <a
          href="#inicio"
          className="group inline-flex items-center gap-2 font-semibold tracking-tight text-text transition-colors duration-200 ease-out hover:text-accent motion-reduce:transition-none"
        >
          <motion.span
            className="glass-pill inline-flex h-8 w-8 items-center justify-center rounded-lg p-0 text-[11px] font-semibold text-accent will-change-transform motion-reduce:will-change-auto"
            aria-hidden="true"
            whileHover={reduce ? undefined : { rotate: 5, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            FM
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

        <details className="relative lg:hidden">
          <summary className="glass-surface-sm list-none rounded-lg px-3 py-2 text-sm font-medium text-text [&::-webkit-details-marker]:hidden">
            Menú
          </summary>
          <div
            className="glass-panel absolute right-0 mt-2 w-52 overflow-hidden rounded-xl p-1.5 shadow-elevated"
            role="navigation"
            aria-label="Móvil"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-200 ease-out hover:bg-white/[0.06] hover:text-text motion-reduce:transition-none"
              >
                {link.label}
              </a>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
