import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Shuffle, X } from 'lucide-react';
import AnimatedPlayerChip from '@/components/tournaments/motion/AnimatedPlayerChip';
import MatchResultReveal from '@/components/tournaments/motion/MatchResultReveal';
import Scoreboard, { useScoreboard } from '@/components/tournaments/motion/Scoreboard';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';
import { faceColor, initials } from '@/components/tournaments/face';
import { drawMatch } from '@/lib/tournaments/draw';
import type {
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
  TournamentPlayer,
} from '@/lib/tournaments/types';

type Phase = 'editing' | 'saving' | 'success';

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
  onSaved: () => void;
};

function TeamNames({ ids, nameOf }: { ids: string[]; nameOf: (id: string) => string }) {
  const reduced = useReducedMotion() ?? false;
  if (!ids.length) return <div className="team-name">Por definir</div>;
  return (
    <div className="team-name">
      <AnimatePresence initial={false}>
        {ids.map((id, index) => (
          <motion.span
            key={id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: lfDuration.chip, ease: lfEaseOut }}
          >
            {index > 0 ? ' + ' : ''}
            {nameOf(id)}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function MatchComposer({ players, rematch = null, onClose, onSave, onSaved }: Props) {
  const reduced = useReducedMotion() ?? false;
  const active = players.filter((p) => p.active);
  const board = useScoreboard();
  const [mode, setMode] = useState<MatchMode>(rematch?.mode ?? 'pairs');
  const [selected, setSelected] = useState<string[]>(
    rematch?.participants
      .slice()
      .sort((a, b) => (a.side === b.side ? a.slot - b.slot : a.side === 'home' ? -1 : 1))
      .map((p) => p.playerId) ?? [],
  );
  const [inputMode, setInputMode] = useState<'score' | 'winner'>('score');
  const [winner, setWinner] = useState<'home' | 'away' | 'draw'>('home');
  const [phase, setPhase] = useState<Phase>('editing');
  const [error, setError] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState(0);

  const need = mode === 'solo' ? 2 : 4;
  const cut = mode === 'solo' ? 1 : 2;
  const nameOf = useMemo(() => {
    const map = new Map(active.map((p) => [p.id, p.displayName]));
    return (id: string) => map.get(id) ?? id;
  }, [active]);

  const teamA = selected.slice(0, cut);
  const teamB = selected.slice(cut, need);
  const ready = selected.length === need;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (phase === 'saving') return;
      if (phase === 'success') onSaved();
      else onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose, onSaved]);

  function toggle(id: string) {
    setCeremony(0);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
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
    setCeremony((value) => value + 1);
    setError(null);
  }

  async function save() {
    if (phase === 'saving' || phase === 'success' || !ready) return;
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
    setPhase('saving');
    setError(null);
    try {
      await onSave({
        mode,
        participants,
        scoreHome: inputMode === 'score' ? board.home : null,
        scoreAway: inputMode === 'score' ? board.away : null,
        simplifiedOutcome: inputMode === 'winner' ? winner : null,
      });
      setPhase('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setPhase('editing');
    }
  }

  return (
    <div className="overlay" onClick={phase === 'saving' ? undefined : phase === 'success' ? onSaved : onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={phase === 'success' ? 'Resultado guardado' : 'Cargar resultado'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-top">
          <div>
            <div className="dialog-kicker">{phase === 'success' ? 'Final' : 'Nuevo encuentro'}</div>
            <h2>{phase === 'success' ? 'Resultado' : 'Cargar resultado'}</h2>
          </div>
          <button
            type="button"
            className="close"
            onClick={phase === 'success' ? onSaved : onClose}
            disabled={phase === 'saving'}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          {phase === 'success' ? (
            <MatchResultReveal
              home={teamA.map(nameOf)}
              away={teamB.map(nameOf)}
              scoreHome={inputMode === 'score' ? board.home : null}
              scoreAway={inputMode === 'score' ? board.away : null}
              outcome={inputMode === 'winner' ? winner : null}
              onContinue={onSaved}
            />
          ) : (
            <>
              <div className="step-label">01 / Modalidad de juego</div>
              <div className="mode-choice">
                <button
                  type="button"
                  className={mode === 'pairs' ? 'active' : ''}
                  onClick={() => {
                    setMode('pairs');
                    setSelected([]);
                    setCeremony(0);
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
                    setCeremony(0);
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
              <div className={`choices${ceremony > 0 ? ' is-drawing' : ''}`}>
                {ceremony > 0 && !reduced && (
                  <motion.span
                    key={ceremony}
                    className="draw-sweep"
                    aria-hidden
                    initial={{ scaleX: 0, opacity: 0.85 }}
                    animate={{ scaleX: 1, opacity: 0 }}
                    transition={{ duration: lfDuration.draw, ease: lfEaseOut }}
                  />
                )}
                {active.map((p) => (
                  <AnimatedPlayerChip
                    key={p.id}
                    selected={selected.includes(p.id)}
                    onClick={() => toggle(p.id)}
                    color={faceColor(p.displayName)}
                    mark={initials(p.displayName)}
                    name={p.displayName}
                  />
                ))}
              </div>
              <div className="choose-status">
                {ready ? 'Equipos listos. Cargá el marcador.' : 'Tocá los nombres en orden para armar los equipos.'}
              </div>
              <div className={`teams-visual${ready ? ' is-ready' : ''}`}>
                {ready && (
                  <motion.span
                    key={`${ceremony}-${selected.join('-')}`}
                    className="lineup-line"
                    aria-hidden
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: reduced ? 0 : lfDuration.draw, ease: lfEaseOut }}
                  />
                )}
                <div className="team-preview">
                  <div className="team-label">EQUIPO A</div>
                  <TeamNames ids={teamA} nameOf={nameOf} />
                </div>
                <motion.div
                  key={ready ? `vs-${ceremony}` : 'vs-wait'}
                  className="versus"
                  initial={ready && !reduced ? { scale: 0.82, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: ready ? lfDuration.draw : lfDuration.chip, ease: lfEaseOut }}
                >
                  VS
                </motion.div>
                <div className="team-preview">
                  <div className="team-label">EQUIPO B</div>
                  <TeamNames ids={teamB} nameOf={nameOf} />
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
                <Scoreboard {...board} />
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
                disabled={!ready || phase === 'saving'}
                onClick={() => void save()}
              >
                {phase === 'saving' ? 'GUARDANDO…' : 'GUARDAR PARTIDO'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
