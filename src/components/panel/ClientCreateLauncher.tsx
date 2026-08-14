import { useEffect, useId, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/panel/ui/button';
import { todayIsoDate } from '@/lib/panel/view-types';

type Props = {
  onCreated?: (clientId: string) => void;
};

export function ClientCreateLauncher({ onCreated }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState('');
  const [createServiceNext, setCreateServiceNext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function reset() {
    setName('');
    setStartDate(todayIsoDate());
    setNotes('');
    setCreateServiceNext(true);
    setError(null);
    setSubmitting(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/panel/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, startDate, notes: notes.trim() || null }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; client?: { id: string } };
      if (!res.ok || !data.ok || !data.client) {
        setError(data.error || 'No se pudo crear el cliente.');
        return;
      }
      setFeedback('Cliente creado');
      setOpen(false);
      reset();
      if (createServiceNext) {
        onCreated?.(data.client.id);
        window.location.href = `/panel/clientes/${data.client.id}?nuevoServicio=1`;
        return;
      }
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      setError('Error de red. Probá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="panel-header__cta" onClick={() => { reset(); setOpen(true); }}>
        <Plus size={16} strokeWidth={2.25} aria-hidden />
        <span>Nuevo cliente</span>
      </button>

      {feedback ? (
        <p className="panel-toast panel-toast--fixed" role="status">
          {feedback}
        </p>
      ) : null}

      {open ? (
        <div className="panel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button type="button" className="panel-sheet__backdrop" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="panel-sheet__panel">
            <div className="panel-sheet__handle" aria-hidden />
            <header className="panel-sheet__header">
              <div className="min-w-0">
                <p className="panel-sheet__eyebrow">Clientes</p>
                <h2 id={titleId} className="panel-sheet__title">
                  Nuevo cliente
                </h2>
              </div>
              <button type="button" className="panel-sheet__close" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2.25} />
              </button>
            </header>

            <form className="panel-sheet__form" onSubmit={onSubmit}>
              <label className="panel-field">
                <span className="panel-field__label">Nombre</span>
                <input className="panel-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </label>
              <label className="panel-field">
                <span className="panel-field__label">Fecha de inicio</span>
                <input className="panel-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </label>
              <label className="panel-field">
                <span className="panel-field__label">Nota (opcional)</span>
                <textarea className="panel-input panel-input--area" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <label className="panel-check">
                <input
                  type="checkbox"
                  checked={createServiceNext}
                  onChange={(e) => setCreateServiceNext(e.target.checked)}
                />
                <span>Crear el primer servicio después</span>
              </label>
              {error ? <div className="panel-alert" role="alert">{error}</div> : null}
              <div className="panel-sheet__actions">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Crear cliente'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
