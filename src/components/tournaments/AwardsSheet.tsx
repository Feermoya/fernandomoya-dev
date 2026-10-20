import { useState } from 'react';
import { X } from 'lucide-react';
import type { TournamentPlayer } from '@/lib/tournaments/types';

export default function AwardsSheet({
  players,
  mvpId,
  bestGoalId,
  bestGoalNote,
  busy,
  onClose,
  onSave,
  onFinish,
}: {
  players: TournamentPlayer[];
  mvpId: string;
  bestGoalId: string;
  bestGoalNote: string;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: { mvpId: string; bestGoalId: string; bestGoalNote: string }) => Promise<void>;
  onFinish: (payload: { mvpId: string; bestGoalId: string; bestGoalNote: string }) => Promise<void>;
}) {
  const [mvp, setMvp] = useState(mvpId);
  const [goal, setGoal] = useState(bestGoalId);
  const [note, setNote] = useState(bestGoalNote);
  const active = players.filter((p) => p.active);
  const payload = { mvpId: mvp, bestGoalId: goal, bestGoalNote: note };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Premios de la noche"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-top">
          <div>
            <div className="dialog-kicker">El tercer tiempo</div>
            <h2>Premios de la noche</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          <p className="hint" style={{ marginTop: 0 }}>
            Elegí los premios opcionales. La pareja ganadora la calcula la tabla.
          </p>
          <div className="form-group">
            <label htmlFor="award-mvp">El MVP de la noche</label>
            <select id="award-mvp" value={mvp} onChange={(e) => setMvp(e.target.value)}>
              <option value="">Sin elegir</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="award-goal">El autor del mejor gol</label>
            <select id="award-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">Sin elegir</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
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
            Cuando cierren la fecha, se genera una tarjeta de campeones para compartir. Los premios
            no son obligatorios.
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
