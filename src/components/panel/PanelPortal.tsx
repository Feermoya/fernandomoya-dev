import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Renders children on document.body so fixed sheets aren't clipped by .panel-shell overflow. */
export function PanelPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
