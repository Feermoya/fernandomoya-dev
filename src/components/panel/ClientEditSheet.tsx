import { useEffect, useId, useState, type FormEvent } from 'react';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/panel/ui/button';
import type { ClientRow } from '@/lib/panel/view-types';

type Props = {
  client: ClientRow;
};

export function ClientEditSheet({ client }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'edit' | 'deactivate'>('edit');
  const [name, setName] = useState(client.name);
  const [startDate, setStartDate] = useState(client.start_date);
  const [notes, setNotes] = useState(client.notes ?? '');
  const [endedAt, setEndedAt] = useState(client.ended_at ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(client.name);
    setStartDate(client.start_date);
    setNotes(client.notes ?? '');
    setEndedAt(client.ended_at ?? '');
    setMode('edit');
    setError(null);
  }, [open, client]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/panel/api/clients/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: client.id,
          name,
          startDate,
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo guardar.');
        return;
      }
      window.location.reload();
    } catch {
      setError('Error de red.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeactivate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/panel/api/clients/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id: client.id,
          endedAt: endedAt || null,
        }),
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

  if (!client.active && mode === 'deactivate') {
    // already inactive
  }

  return (
    <>
      <button type="button" className="panel-header__cta panel-header__cta--ghost" onClick={() => setOpen(true)}>
        <Pencil size={15} strokeWidth={2.25} aria-hidden />
        <span>Editar</span>
      </button>

      {open ? (
        <div className="panel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button type="button" className="panel-sheet__backdrop" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="panel-sheet__panel">
            <div className="panel-sheet__handle" aria-hidden />
            <header className="panel-sheet__header">
              <div className="min-w-0">
                <p className="panel-sheet__eyebrow">Cliente</p>
                <h2 id={titleId} className="panel-sheet__title">
                  {mode === 'edit' ? 'Editar cliente' : 'Dar de baja'}
                </h2>
              </div>
              <button type="button" className="panel-sheet__close" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2.25} />
              </button>
            </header>

            {mode === 'edit' ? (
              <form className="panel-sheet__form" onSubmit={onSave}>
                <label className="panel-field">
                  <span className="panel-field__label">Nombre</span>
                  <input className="panel-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label className="panel-field">
                  <span className="panel-field__label">Fecha de inicio</span>
                  <input className="panel-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </label>
                <label className="panel-field">
                  <span className="panel-field__label">Notas</span>
                  <textarea className="panel-input panel-input--area" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
                {error ? <div className="panel-alert" role="alert">{error}</div> : null}
                <div className="panel-sheet__actions">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Guardando…' : 'Guardar'}
                  </Button>
                </div>
                {client.active ? (
                  <button
                    type="button"
                    className="panel-link-danger"
                    onClick={() => setMode('deactivate')}
                    disabled={submitting}
                  >
                    Dar de baja cliente…
                  </button>
                ) : null}
              </form>
            ) : (
              <form className="panel-sheet__form" onSubmit={onDeactivate}>
                <p className="panel-sheet__meta">
                  No se borra el historial. Deja de generar cobros futuros.
                </p>
                <label className="panel-field">
                  <span className="panel-field__label">Fecha de baja</span>
                  <input className="panel-input" type="date" value={endedAt} onChange={(e) => setEndedAt(e.target.value)} />
                </label>
                {error ? <div className="panel-alert" role="alert">{error}</div> : null}
                <div className="panel-sheet__actions">
                  <Button type="button" variant="outline" onClick={() => setMode('edit')} disabled={submitting}>
                    Volver
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Guardando…' : 'Confirmar baja'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
