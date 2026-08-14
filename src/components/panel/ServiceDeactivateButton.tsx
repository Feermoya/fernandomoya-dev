import { useEffect, useId, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/panel/ui/button';
import { PanelPortal } from '@/components/panel/PanelPortal';
import type { ServiceRow } from '@/lib/panel/view-types';

type Props = {
  service: ServiceRow;
};

export function ServiceDeactivateButton({ service }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [endedAt, setEndedAt] = useState(service.ended_at ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!service.active) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/panel/api/services/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: service.id, endedAt: endedAt || null }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo dar de baja.');
        return;
      }
      window.location.reload();
    } catch {
      setError('Error de red.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="panel-mini-btn panel-mini-btn--muted" onClick={() => setOpen(true)}>
        Dar de baja
      </button>
      {open ? (
        <PanelPortal>
        <div className="panel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button type="button" className="panel-sheet__backdrop" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="panel-sheet__panel">
            <div className="panel-sheet__handle" aria-hidden />
            <header className="panel-sheet__header">
              <div className="min-w-0">
                <p className="panel-sheet__eyebrow">{service.name}</p>
                <h2 id={titleId} className="panel-sheet__title">
                  Dar de baja servicio
                </h2>
                <p className="panel-sheet__meta">No genera cobros futuros. El historial se conserva.</p>
              </div>
              <button type="button" className="panel-sheet__close" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2.25} />
              </button>
            </header>
            <form className="panel-sheet__form" onSubmit={onSubmit}>
              <label className="panel-field">
                <span className="panel-field__label">Fecha de baja</span>
                <input className="panel-input" type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />
              </label>
              {error ? <div className="panel-alert" role="alert">{error}</div> : null}
              <div className="panel-sheet__actions">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" loading={submitting}>
                  {submitting ? 'Guardando…' : 'Confirmar baja'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </PanelPortal>
      ) : null}
    </>
  );
}
