import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Shuffle, X } from 'lucide-react';
import AnimatedPlayerChip from '@/components/tournaments/motion/AnimatedPlayerChip';
import MatchResultReveal from '@/components/tournaments/motion/MatchResultReveal';
import Scoreboard, { useScoreboard } from '@/components/tournaments/motion/Scoreboard';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';
import { faceColor, initials } from '@/components/tournaments/face';
import { drawMatch } from '@/lib/tournaments/draw';
import {
  clearNightLineup,
  drawNightPairs,
  fixtureKey,
  inferNightLineup,
  makeNightPair,
  matchFixtureKey,
  readNightLineup,
  roundRobin,
  writeNightLineup,
  type NightLineup,
  type NightPair,
} from '@/lib/tournaments/nightPairs';
import { pairLabel } from '@/lib/tournaments/pairs';
import type {
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
  TournamentMatch,
  TournamentPlayer,
} from '@/lib/tournaments/types';

type Phase = 'editing' | 'saving' | 'success';
type Intent = 'choose' | 'match' | 'night';

type Props = {
  players: TournamentPlayer[];
  publicId: string;
  matchdayId: string;
  playedMatches?: TournamentMatch[];
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
  if (!ids.length) return <div className="team-name">Por definir</div>;
  return (
    <div className="team-name">
      <AnimatePresence initial={false}>
        {ids.map((id, index) => (
          <motion.span
            key={id}
            initial={{ opacity: 0, y: 8 }}
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

export default function MatchComposer({
  players,
  publicId,
  matchdayId,
  playedMatches = [],
  rematch = null,
  onClose,
  onSave,
  onSaved,
}: Props) {
  const active = players.filter((p) => p.active);
  const activeIds = active.map((player) => player.id);
  const board = useScoreboard();
  const [intent, setIntent] = useState<Intent>(rematch ? 'match' : 'choose');
  const [mode, setMode] = useState<MatchMode>(rematch?.mode ?? 'pairs');
  const [selected, setSelected] = useState<string[]>(
    rematch?.participants
      .slice()
      .sort((a, b) => (a.side === b.side ? a.slot - b.slot : a.side === 'home' ? -1 : 1))
      .map((p) => p.playerId) ?? [],
  );
  const [lineup, setLineup] = useState<NightLineup | null>(() => {
    if (rematch) return null;
    return readNightLineup(publicId, matchdayId, activeIds) ?? inferNightLineup(playedMatches, activeIds);
  });
  const [draft, setDraft] = useState<NightPair[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [homeKey, setHomeKey] = useState<string | null>(null);
  const [awayKey, setAwayKey] = useState<string | null>(null);
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
  const names = useMemo(() => new Map(active.map((p) => [p.id, p.displayName])), [active]);

  const nightHome = lineup?.pairs.find((pair) => pair.key === homeKey) ?? null;
  const nightAway = lineup?.pairs.find((pair) => pair.key === awayKey) ?? null;
  const playingNight = intent === 'night' && Boolean(lineup);
  const teamA = playingNight ? (nightHome?.playerIds.slice() ?? []) : selected.slice(0, cut);
  const teamB = playingNight ? (nightAway?.playerIds.slice() ?? []) : selected.slice(cut, need);
  const ready = playingNight ? Boolean(nightHome && nightAway) : selected.length === need;

  const usedDraft = new Set(draft.flatMap((pair) => pair.playerIds));
  const unpaired = active.filter((player) => !usedDraft.has(player.id));
  const fixtures = lineup ? roundRobin(lineup.pairs) : [];
  const playedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const match of playedMatches) {
      const key = matchFixtureKey(match);
      if (key) keys.add(key);
    }
    return keys;
  }, [playedMatches]);

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

  function tapForPair(id: string) {
    setError(null);
    if (anchor === id) {
      setAnchor(null);
      return;
    }
    if (!anchor) {
      setAnchor(id);
      return;
    }
    setDraft((current) => [...current, makeNightPair(anchor, id)]);
    setAnchor(null);
    setCeremony((value) => value + 1);
  }

  function randomPairs() {
    const pool = draft.length ? unpaired.map((player) => player.id) : activeIds;
    const result = drawNightPairs(pool);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setDraft((current) => [...current, ...result.pairs]);
    setAnchor(null);
    setCeremony((value) => value + 1);
    setError(null);
  }

  function confirmPairs() {
    const loose = activeIds.filter((id) => !draft.some((pair) => pair.playerIds.includes(id)));
    const next: NightLineup = { pairs: draft, resting: loose };
    if (next.pairs.length < 2) {
      setError('Armá al menos dos parejas.');
      return;
    }
    writeNightLineup(publicId, matchdayId, next);
    setLineup(next);
    setHomeKey(null);
    setAwayKey(null);
    setError(null);
  }

  function redoPairs() {
    clearNightLineup(publicId, matchdayId);
    setLineup(null);
    setDraft([]);
    setAnchor(null);
    setHomeKey(null);
    setAwayKey(null);
    setError(null);
  }

  function pickFixture(left: NightPair, right: NightPair) {
    setHomeKey(left.key);
    setAwayKey(right.key);
    setCeremony((value) => value + 1);
    setError(null);
  }

  function randomFixture() {
    if (!lineup) return;
    const pending = fixtures.filter(([left, right]) => !playedKeys.has(fixtureKey(left.key, right.key)));
    const pool = pending.length ? pending : fixtures;
    if (!pool.length) {
      setError('Primero armá las parejas.');
      return;
    }
    const index = Math.floor(Math.random() * pool.length);
    const chosen = pool[index];
    if (!chosen) return;
    pickFixture(chosen[0], chosen[1]);
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
        mode: playingNight ? 'pairs' : mode,
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

  const title =
    phase === 'success' ? 'Resultado' : intent === 'choose' ? 'Cargar' : intent === 'night' && !lineup ? 'Parejas' : intent === 'night' ? 'Cruce' : 'Cargar resultado';

  return (
    <div className="overlay" onClick={phase === 'saving' ? undefined : phase === 'success' ? onSaved : onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={phase === 'success' ? 'Resultado guardado' : title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-top">
          <div>
            <div className="dialog-kicker">{phase === 'success' ? 'Final' : 'Nuevo encuentro'}</div>
            <h2>{title}</h2>
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
          ) : intent === 'choose' ? (
            <div className="intent-list">
              <button type="button" className="intent-card" onClick={() => setIntent('match')}>
                <strong>PARTIDO</strong>
                <span>Un cruce, el resultado, y listo.</span>
              </button>
              <button
                type="button"
                className="intent-card"
                onClick={() => {
                  setIntent('night');
                  setError(null);
                }}
              >
                <strong>TORNEO DE PAREJAS</strong>
                <span>Primero las parejas. Después, todos contra todos.</span>
              </button>
            </div>
          ) : intent === 'night' && !lineup ? (
            <>
              <div className="form-line">
                <div className="step-label">01 / Armá las parejas</div>
                <button type="button" className="small-btn" onClick={randomPairs}>
                  <Shuffle size={14} /> AL AZAR
                </button>
              </div>
              <p className="choose-status">Tocá dos nombres para juntarlos, o sorteá la noche.</p>
              <div className={`choices${ceremony > 0 ? ' is-drawing' : ''}`}>
                {ceremony > 0 && <span key={ceremony} className="draw-sweep is-on" aria-hidden />}
                {unpaired.map((player) => (
                  <AnimatedPlayerChip
                    key={player.id}
                    selected={anchor === player.id}
                    onClick={() => tapForPair(player.id)}
                    color={faceColor(player.displayName)}
                    mark={initials(player.displayName)}
                    name={player.displayName}
                  />
                ))}
              </div>
              {draft.map((pair) => (
                <div className="pair-built" key={pair.key}>
                  <b>{pairLabel(pair.key, names)}</b>
                  <button
                    type="button"
                    className="section-link"
                    onClick={() => setDraft((current) => current.filter((item) => item.key !== pair.key))}
                  >
                    QUITAR
                  </button>
                </div>
              ))}
              {unpaired.length === 1 && (
                <p className="choose-status">Descansa: {nameOf(unpaired[0]!.id)}</p>
              )}
              {error && <p className="error">{error}</p>}
              <button type="button" className="primary-btn form-submit" disabled={draft.length < 2} onClick={confirmPairs}>
                ESTAS SON LAS PAREJAS
              </button>
              <button type="button" className="section-link back-link" onClick={() => setIntent('choose')}>
                Volver
              </button>
            </>
          ) : intent === 'night' && lineup ? (
            <>
              <div className="form-line">
                <div className="step-label">02 / Elegí el cruce</div>
                <button type="button" className="small-btn" onClick={randomFixture}>
                  <Shuffle size={14} /> AL AZAR
                </button>
              </div>
              <div className="fixture-list">
                {fixtures.map(([left, right]) => {
                  const key = fixtureKey(left.key, right.key);
                  const played = playedKeys.has(key);
                  const activeFixture = homeKey === left.key && awayKey === right.key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`fixture-btn${activeFixture ? ' active' : ''}`}
                      onClick={() => pickFixture(left, right)}
                    >
                      <span>
                        {pairLabel(left.key, names)} vs {pairLabel(right.key, names)}
                      </span>
                      <small>{played ? 'JUGADO' : 'PENDIENTE'}</small>
                    </button>
                  );
                })}
              </div>
              {lineup.resting.length > 0 && (
                <p className="choose-status">Descansa: {lineup.resting.map(nameOf).join(', ')}</p>
              )}
              <ScoreBlock
                ready={ready}
                ceremony={ceremony}
                teamA={teamA}
                teamB={teamB}
                nameOf={nameOf}
                inputMode={inputMode}
                setInputMode={setInputMode}
                winner={winner}
                setWinner={setWinner}
                board={board}
                error={error}
                phase={phase}
                onSave={() => void save()}
                submitLabel="GUARDAR CRUCE"
              />
              <button type="button" className="section-link back-link" onClick={redoPairs}>
                Rehacer parejas
              </button>
            </>
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
                  <Shuffle size={14} /> AL AZAR
                </button>
              </div>
              <div className={`choices${ceremony > 0 ? ' is-drawing' : ''}`}>
                {ceremony > 0 && <span key={ceremony} className="draw-sweep is-on" aria-hidden />}
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
              <Teams
                ready={ready}
                ceremony={ceremony}
                selected={selected}
                teamA={teamA}
                teamB={teamB}
                nameOf={nameOf}
              />
              <ScoreBlock
                ready={ready}
                ceremony={ceremony}
                teamA={teamA}
                teamB={teamB}
                nameOf={nameOf}
                inputMode={inputMode}
                setInputMode={setInputMode}
                winner={winner}
                setWinner={setWinner}
                board={board}
                error={error}
                phase={phase}
                onSave={() => void save()}
                submitLabel="GUARDAR PARTIDO"
                hideTeams
              />
              {!rematch && (
                <button type="button" className="section-link back-link" onClick={() => setIntent('choose')}>
                  Volver
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Teams({
  ready,
  ceremony,
  selected,
  teamA,
  teamB,
  nameOf,
}: {
  ready: boolean;
  ceremony: number;
  selected: string[];
  teamA: string[];
  teamB: string[];
  nameOf: (id: string) => string;
}) {
  return (
    <div className={`teams-visual${ready ? ' is-ready' : ''}`}>
      {ready && <span key={`${ceremony}-${selected.join('-')}`} className="lineup-line is-on" aria-hidden />}
      <div className="team-preview">
        <div className="team-label">EQUIPO A</div>
        <TeamNames ids={teamA} nameOf={nameOf} />
      </div>
      <div key={ready ? `vs-${ceremony}` : 'vs-wait'} className={`versus${ready ? ' is-on' : ''}`}>
        VS
      </div>
      <div className="team-preview">
        <div className="team-label">EQUIPO B</div>
        <TeamNames ids={teamB} nameOf={nameOf} />
      </div>
    </div>
  );
}

function ScoreBlock({
  ready,
  ceremony,
  teamA,
  teamB,
  nameOf,
  inputMode,
  setInputMode,
  winner,
  setWinner,
  board,
  error,
  phase,
  onSave,
  submitLabel,
  hideTeams = false,
}: {
  ready: boolean;
  ceremony: number;
  teamA: string[];
  teamB: string[];
  nameOf: (id: string) => string;
  inputMode: 'score' | 'winner';
  setInputMode: (value: 'score' | 'winner') => void;
  winner: 'home' | 'away' | 'draw';
  setWinner: (value: 'home' | 'away' | 'draw') => void;
  board: ReturnType<typeof useScoreboard>;
  error: string | null;
  phase: Phase;
  onSave: () => void;
  submitLabel: string;
  hideTeams?: boolean;
}) {
  return (
    <>
      {!hideTeams && (
        <Teams
          ready={ready}
          ceremony={ceremony}
          selected={[...teamA, ...teamB]}
          teamA={teamA}
          teamB={teamB}
          nameOf={nameOf}
        />
      )}
      <div className="step-label">03 / Resultado</div>
      <div className="tab-row">
        <button type="button" className={`tab ${inputMode === 'score' ? 'active' : ''}`} onClick={() => setInputMode('score')}>
          Marcador
        </button>
        <button type="button" className={`tab ${inputMode === 'winner' ? 'active' : ''}`} onClick={() => setInputMode('winner')}>
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
      <button type="button" className="primary-btn form-submit" disabled={!ready || phase === 'saving'} onClick={onSave}>
        {phase === 'saving' ? 'GUARDANDO…' : submitLabel}
      </button>
    </>
  );
}
