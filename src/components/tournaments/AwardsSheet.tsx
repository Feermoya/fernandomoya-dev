import { useState } from 'react';
import { X } from 'lucide-react';
import type { TournamentPlayer } from '@/lib/tournaments/types';

export default function AwardsSheet({
  players,
  bestGoalId,
  bestGoalNote,
  busy,
  onClose,
  onSave,
  onFinish,
}: {
  players: TournamentPlayer[];
  bestGoalId: string;
  bestGoalNote: string;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: { bestGoalId: string; bestGoalNote: string }) => Promise<void>;
  onFinish: (payload: { bestGoalId: string; bestGoalNote: string }) => Promise<void>;
}) {
  const [goal, setGoal] = useState(bestGoalId);
  const [note, setNote] = useState(bestGoalNote);
  const active = players.filter((p) => p.active);
  const payload = { bestGoalId: goal, bestGoalNote: note };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Cerrar la fecha"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-top">
          <div>
            <div className="dialog-kicker">El tercer tiempo</div>
            <h2>Cerrar la fecha</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          <p className="hint" style={{ marginTop: 0 }}>
            Se reconoce al mejor jugador de 1 vs 1 y a la mejor pareja de 2 vs 2 cuando se jugaron ambas modalidades. Solo elegís el gol destacado.
          </p>
          <div className="form-group"><label>¿Quién hizo el mejor gol? (opcional)</label><div className="choices"><button type="button" className={`tg-chip ${!goal ? "active" : ""}`} aria-pressed={!goal} onClick={() => setGoal("")}>Sin elegir</button>{active.map((p) => <button type="button" key={p.id} className={`tg-chip ${goal === p.id ? "active" : ""}`} aria-pressed={goal === p.id} onClick={() => setGoal(p.id)}>{p.displayName}</button>)}</div></div>
          {goal && (
            <div className="form-group">
              <label htmlFor="award-note">Descripción del gol</label>
              <input
                id="award-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          )}
          <div className="notice">
            Al cerrar la fecha se calculan los mejores de cada modalidad. El mejor gol es opcional.
          </div>
          <button
            type="button"
            className="primary-btn form-submit"
            disabled={busy}
            onClick={() => void onFinish(payload)}
          >
            {busy ? 'CERRANDO…' : 'FINALIZAR FECHA'}
          </button>
          <button
            type="button"
            className="outline-mini"
            style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
            disabled={busy}
            onClick={() => void onSave(payload)}
          >
            GUARDAR PREMIOS Y SEGUIR JUGANDO
          </button>
        </div>
      </div>
    </div>
  );
}
