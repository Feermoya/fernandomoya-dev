import { useMemo, useState } from 'react';
import { Shuffle, X } from 'lucide-react';
import { faceColor, initials } from '@/components/tournaments/face';
import { drawMatch } from '@/lib/tournaments/draw';
import type {
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
  TournamentPlayer,
} from '@/lib/tournaments/types';

type Props = {
  players: TournamentPlayer[];
  rematch?: { mode: MatchMode; participants: MatchParticipant[] } | null;
  onClose: () => void;
  onSave: (payload: {
    mode: MatchMode;
    participants: MatchParticipant[];
    scoreHome?: number | null;
    scoreAway?: number | null;
    simplifiedOutcome?: SimplifiedOutcome | null;
  }) => Promise<void>;
};

export default function MatchComposer({ players, rematch = null, onClose, onSave }: Props) {
  const active = players.filter((p) => p.active);
  const [mode, setMode] = useState<MatchMode>(rematch?.mode ?? 'pairs');
  const [selected, setSelected] = useState<string[]>(
    rematch?.participants
      .slice()
      .sort((a, b) => (a.side === b.side ? a.slot - b.slot : a.side === 'home' ? -1 : 1))
      .map((p) => p.playerId) ?? [],
  );
  const [inputMode, setInputMode] = useState<'score' | 'winner'>('score');
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [winner, setWinner] = useState<'home' | 'away' | 'draw'>('home');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const need = mode === 'solo' ? 2 : 4;
  const cut = mode === 'solo' ? 1 : 2;
  const nameOf = useMemo(() => {
    const map = new Map(active.map((p) => [p.id, p.displayName]));
    return (id: string) => map.get(id) ?? id;
  }, [active]);

  const teamA = selected.slice(0, cut);
  const teamB = selected.slice(cut, need);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= need) return prev;
      return [...prev, id];
    });
  }

  function shuffle() {
    const result = drawMatch(
      active.map((p) => p.id),
      mode,
    );
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setSelected(result.participants.map((p) => p.playerId));
    setError(null);
  }

  async function save() {
    const participants: MatchParticipant[] = [
      ...teamA.map((id, i) => ({
        playerId: id,
        side: 'home' as const,
        slot: (i === 1 ? 1 : 0) as 0 | 1,
      })),
      ...teamB.map((id, i) => ({
        playerId: id,
        side: 'away' as const,
        slot: (i === 1 ? 1 : 0) as 0 | 1,
      })),
    ];
    setBusy(true);
    setError(null);
    try {
      await onSave({
        mode,
        participants,
        scoreHome: inputMode === 'score' ? scoreHome : null,
        scoreAway: inputMode === 'score' ? scoreAway : null,
        simplifiedOutcome: inputMode === 'winner' ? winner : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Cargar resultado"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-top">
          <div>
            <div className="dialog-kicker">Nuevo encuentro</div>
            <h2>Cargar resultado</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          <div className="step-label">01 / Modalidad de juego</div>
          <div className="mode-choice">
            <button
              type="button"
              className={mode === 'pairs' ? 'active' : ''}
              onClick={() => {
                setMode('pairs');
                setSelected([]);
              }}
            >
              2 VS 2
            </button>
            <button
              type="button"
              className={mode === 'solo' ? 'active' : ''}
              onClick={() => {
                setMode('solo');
                setSelected([]);
              }}
            >
              1 VS 1
            </button>
          </div>
          <div className="form-line">
            <div className="step-label">
              02 / Elegí a los jugadores ({selected.length}/{need})
            </div>
            <button type="button" className="small-btn" onClick={shuffle}>
              <Shuffle size={14} /> SORTEAR
            </button>
          </div>
          <div className="choices">
            {active.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`choice ${selected.includes(p.id) ? 'selected' : ''}`}
                onClick={() => toggle(p.id)}
              >
                <span className="player-face" style={{ background: faceColor(p.displayName) }}>
                  {initials(p.displayName)}
                </span>
                {p.displayName}
              </button>
            ))}
          </div>
          <div className="choose-status">
            {selected.length === need
              ? 'Equipos listos. Cargá el marcador.'
              : 'Tocá los nombres en orden para armar los equipos.'}
          </div>
          <div className="teams-visual">
            <div className="team-preview">
              <div className="team-label">EQUIPO A</div>
              <div className="team-name">{teamA.map(nameOf).join(' + ') || 'Por definir'}</div>
            </div>
            <div className="versus">VS</div>
            <div className="team-preview">
              <div className="team-label">EQUIPO B</div>
              <div className="team-name">{teamB.map(nameOf).join(' + ') || 'Por definir'}</div>
            </div>
          </div>
          <div className="step-label">03 / Resultado</div>
          <div className="tab-row">
            <button
              type="button"
              className={`tab ${inputMode === 'score' ? 'active' : ''}`}
              onClick={() => setInputMode('score')}
            >
              Marcador
            </button>
            <button
              type="button"
              className={`tab ${inputMode === 'winner' ? 'active' : ''}`}
              onClick={() => setInputMode('winner')}
            >
              Solo ganador
            </button>
          </div>
          {inputMode === 'score' ? (
            <div className="score-edit">
              <div className="score-control">
                <button type="button" aria-label="Restar local" onClick={() => setScoreHome((n) => Math.max(0, n - 1))}>
                  −
                </button>
                <b>{scoreHome}</b>
                <button type="button" aria-label="Sumar local" onClick={() => setScoreHome((n) => Math.min(99, n + 1))}>
                  +
                </button>
              </div>
              <div className="score-divider">:</div>
              <div className="score-control">
                <button type="button" aria-label="Restar visitante" onClick={() => setScoreAway((n) => Math.max(0, n - 1))}>
                  −
                </button>
                <b>{scoreAway}</b>
                <button type="button" aria-label="Sumar visitante" onClick={() => setScoreAway((n) => Math.min(99, n + 1))}>
                  +
                </button>
              </div>
            </div>
          ) : (
            <div className="quick-winner">
              <button type="button" className={winner === 'home' ? 'active' : ''} onClick={() => setWinner('home')}>
                Ganó equipo A
              </button>
              <button type="button" className={winner === 'away' ? 'active' : ''} onClick={() => setWinner('away')}>
                Ganó equipo B
              </button>
              <button type="button" className={winner === 'draw' ? 'active' : ''} onClick={() => setWinner('draw')}>
                Empate
              </button>
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <button
            type="button"
            className="primary-btn form-submit"
            disabled={selected.length !== need || busy}
            onClick={() => void save()}
          >
            {busy ? 'GUARDANDO…' : 'GUARDAR PARTIDO'}
          </button>
        </div>
      </div>
    </div>
  );
}
