import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { drawMatch } from '@/lib/tournaments/draw';
import type {
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
  TournamentPlayer,
} from '@/lib/tournaments/types';

type Props = {
  players: TournamentPlayer[];
  recentPairKeys?: string[];
  rematch?: {
    mode: MatchMode;
    participants: MatchParticipant[];
  } | null;
  onClose: () => void;
  onSave: (payload: {
    mode: MatchMode;
    participants: MatchParticipant[];
    scoreHome?: number | null;
    scoreAway?: number | null;
    simplifiedOutcome?: SimplifiedOutcome | null;
  }) => Promise<void>;
};

export default function MatchEntrySheet({
  players,
  rematch = null,
  onClose,
  onSave,
}: Props) {
  const reduceMotion = useReducedMotion();
  const active = players.filter((p) => p.active);
  const [mode, setMode] = useState<MatchMode>(rematch?.mode ?? 'pairs');
  const [selected, setSelected] = useState<string[]>(
    rematch?.participants.map((p) => p.playerId) ?? [],
  );
  const [home, setHome] = useState<string[]>(
    rematch?.participants.filter((p) => p.side === 'home').map((p) => p.playerId) ?? [],
  );
  const [away, setAway] = useState<string[]>(
    rematch?.participants.filter((p) => p.side === 'away').map((p) => p.playerId) ?? [],
  );
  const [scoreMode, setScoreMode] = useState<'exact' | 'simple'>('exact');
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [simple, setSimple] = useState<SimplifiedOutcome>('home');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resting, setResting] = useState<string[]>([]);

  const need = mode === 'solo' ? 2 : 4;

  const nameOf = useMemo(() => {
    const m = new Map(active.map((p) => [p.id, p.displayName]));
    return (id: string) => m.get(id) ?? id;
  }, [active]);

  function togglePlayer(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        setHome((h) => h.filter((x) => x !== id));
        setAway((a) => a.filter((x) => x !== id));
        return next;
      }
      if (prev.length >= need) return prev;
      return [...prev, id];
    });
  }

  function assignTeams() {
    if (selected.length !== need) return;
    if (mode === 'solo') {
      setHome([selected[0]!]);
      setAway([selected[1]!]);
      return;
    }
    setHome([selected[0]!, selected[1]!]);
    setAway([selected[2]!, selected[3]!]);
  }

  function swapSides() {
    setHome(away);
    setAway(home);
  }

  function moveToSide(id: string, side: 'home' | 'away') {
    if (mode === 'solo') {
      if (side === 'home') {
        setHome([id]);
        setAway((a) => a.filter((x) => x !== id));
        if (away[0] === id) setAway([]);
      } else {
        setAway([id]);
        setHome((h) => h.filter((x) => x !== id));
      }
      return;
    }
    const max = 2;
    if (side === 'home') {
      setAway((a) => a.filter((x) => x !== id));
      setHome((h) => {
        if (h.includes(id)) return h;
        if (h.length >= max) return h;
        return [...h, id];
      });
    } else {
      setHome((h) => h.filter((x) => x !== id));
      setAway((a) => {
        if (a.includes(id)) return a;
        if (a.length >= max) return a;
        return [...a, id];
      });
    }
  }

  function onDraw() {
    const result = drawMatch(
      active.map((p) => p.id),
      mode,
    );
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setMode(result.mode);
    setSelected(result.participants.map((p) => p.playerId));
    setHome(result.participants.filter((p) => p.side === 'home').map((p) => p.playerId));
    setAway(result.participants.filter((p) => p.side === 'away').map((p) => p.playerId));
    setResting(result.resting);
    setError(null);
  }

  async function save() {
    const participants: MatchParticipant[] = [
      ...home.map((id, i) => ({
        playerId: id,
        side: 'home' as const,
        slot: (i === 1 ? 1 : 0) as 0 | 1,
      })),
      ...away.map((id, i) => ({
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
        scoreHome: scoreMode === 'exact' ? scoreHome : null,
        scoreAway: scoreMode === 'exact' ? scoreAway : null,
        simplifiedOutcome: scoreMode === 'simple' ? simple : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setBusy(false);
    }
  }

  const teamsReady =
    mode === 'solo'
      ? home.length === 1 && away.length === 1
      : home.length === 2 && away.length === 2;

  return (
    <motion.div
      className="tg-sheet-backdrop"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="tg-sheet"
        initial={reduceMotion ? false : { y: 40 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cargar partido"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Cargar partido</h2>
          <button type="button" className="tg-icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className={`tg-btn ${mode === 'pairs' ? 'tg-btn-primary' : 'tg-btn-secondary'}`}
            onClick={() => {
              setMode('pairs');
              setSelected([]);
              setHome([]);
              setAway([]);
            }}
          >
            2 vs 2
          </button>
          <button
            type="button"
            className={`tg-btn ${mode === 'solo' ? 'tg-btn-primary' : 'tg-btn-secondary'}`}
            onClick={() => {
              setMode('solo');
              setSelected([]);
              setHome([]);
              setAway([]);
            }}
          >
            1 vs 1
          </button>
          <button type="button" className="tg-btn tg-btn-secondary" onClick={onDraw}>
            Sortear
          </button>
        </div>

        <p className="tg-nav-hint mb-2">
          Elegí {need} jugadores ({selected.length}/{need})
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {active.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                className={`tg-chip ${on ? 'tg-chip-on' : ''}`}
                onClick={() => togglePlayer(p.id)}
              >
                {p.displayName}
              </button>
            );
          })}
        </div>

        {selected.length === need && !teamsReady && (
          <button type="button" className="tg-btn tg-btn-secondary mb-3" onClick={assignTeams}>
            Armar equipos automáticamente
          </button>
        )}

        {selected.length > 0 && (
          <div className="tg-teams mb-4">
            <div>
              <p className="tg-label mb-2">Local</p>
              <div className="flex flex-wrap gap-2">
                {selected.map((id) => (
                  <button
                    key={`h-${id}`}
                    type="button"
                    className={`tg-chip ${home.includes(id) ? 'tg-chip-on' : ''}`}
                    onClick={() => moveToSide(id, 'home')}
                  >
                    {nameOf(id)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="tg-label mb-2">Visitante</p>
              <div className="flex flex-wrap gap-2">
                {selected.map((id) => (
                  <button
                    key={`a-${id}`}
                    type="button"
                    className={`tg-chip ${away.includes(id) ? 'tg-chip-on' : ''}`}
                    onClick={() => moveToSide(id, 'away')}
                  >
                    {nameOf(id)}
                  </button>
                ))}
              </div>
            </div>
            {teamsReady && (
              <button type="button" className="tg-btn tg-btn-ghost w-auto px-0" onClick={swapSides}>
                Intercambiar lados
              </button>
            )}
          </div>
        )}

        {resting.length > 0 && (
          <p className="tg-nav-hint mb-3">
            Descansan: {resting.map(nameOf).join(', ')}
          </p>
        )}

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={`tg-btn ${scoreMode === 'exact' ? 'tg-btn-primary' : 'tg-btn-secondary'}`}
            onClick={() => setScoreMode('exact')}
          >
            Marcador
          </button>
          <button
            type="button"
            className={`tg-btn ${scoreMode === 'simple' ? 'tg-btn-primary' : 'tg-btn-secondary'}`}
            onClick={() => setScoreMode('simple')}
          >
            Solo ganador
          </button>
        </div>

        {scoreMode === 'exact' ? (
          <div className="tg-scoreboard mb-4">
            <ScoreStepper value={scoreHome} onChange={setScoreHome} label="Local" />
            <span className="tg-score-sep">:</span>
            <ScoreStepper value={scoreAway} onChange={setScoreAway} label="Visitante" />
          </div>
        ) : (
          <div className="mb-4 flex gap-2">
            {(
              [
                ['home', 'Gana local'],
                ['away', 'Gana visitante'],
                ['draw', 'Empate'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`tg-btn ${simple === value ? 'tg-btn-primary' : 'tg-btn-secondary'}`}
                onClick={() => setSimple(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {error && <p className="tg-error mb-3">{error}</p>}

        <button
          type="button"
          className="tg-btn tg-btn-primary"
          disabled={!teamsReady || busy}
          onClick={() => void save()}
        >
          {busy ? 'Guardando…' : 'Confirmar resultado'}
        </button>
      </motion.div>
    </motion.div>
  );
}

function ScoreStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="tg-stepper">
      <span className="tg-label">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="tg-step-btn"
          aria-label={`Bajar ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          −
        </button>
        <motion.span
          key={value}
          className="tg-score-num"
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {value}
        </motion.span>
        <button
          type="button"
          className="tg-step-btn"
          aria-label={`Subir ${label}`}
          onClick={() => onChange(Math.min(99, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  );
}
