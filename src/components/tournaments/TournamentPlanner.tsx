import { useEffect, useMemo, useState } from 'react';
import { X, Shuffle } from 'lucide-react';
import { createKnockout, createRoundRobin, recordKnockoutResult, type BracketEntrant, type BracketFormat } from '@/lib/tournaments/bracket';
import type { MatchMode, MatchParticipant, TournamentMatch, TournamentPlayer } from '@/lib/tournaments/types';

type Format = BracketFormat | 'semifinal';
type Plan = { mode: MatchMode; format: Format; entrants: BracketEntrant[] };
type Props = {
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  groupId: string;
  matchdayId: string;
  onClose: () => void;
  onPlay: (mode: MatchMode, participants: MatchParticipant[]) => void;
};
const makeParticipants = (home: BracketEntrant, away: BracketEntrant): MatchParticipant[] => [
  ...home.playerIds.map((playerId, slot) => ({ playerId, side: 'home' as const, slot: slot as 0 | 1 })),
  ...away.playerIds.map((playerId, slot) => ({ playerId, side: 'away' as const, slot: slot as 0 | 1 })),
];
function findResult(matches: TournamentMatch[], home: BracketEntrant, away: BracketEntrant, used: Set<string>) {
  const key = (ids: string[]) => ids.slice().sort().join(':');
  const result = matches.find((m) => {
    if (used.has(m.id)) return false;
    const a = m.participants.filter((p) => p.side === 'home').map((p) => p.playerId);
    const b = m.participants.filter((p) => p.side === 'away').map((p) => p.playerId);
    return (key(a) === key(home.playerIds) && key(b) === key(away.playerIds)) ||
      (key(a) === key(away.playerIds) && key(b) === key(home.playerIds));
  });
  if (!result) return null;
  used.add(result.id);
  const homeIsHome = key(result.participants.filter((p) => p.side === 'home').map((p) => p.playerId)) === key(home.playerIds);
  const a = homeIsHome ? result.scoreHome : result.scoreAway;
  const b = homeIsHome ? result.scoreAway : result.scoreHome;
  if (a != null && b != null) return { a, b, complete: a !== b };
  const outcome = result.simplifiedOutcome;
  if (!outcome) return null;
  const homeWon = homeIsHome ? outcome === 'home' : outcome === 'away';
  const awayWon = homeIsHome ? outcome === 'away' : outcome === 'home';
  return { a: homeWon ? 1 : 0, b: awayWon ? 1 : 0, complete: outcome !== 'draw' };
}
export default function TournamentPlanner({ players, matches, groupId, matchdayId, onClose, onPlay }: Props) {
  const storageKey = `lf-plan:${groupId}:${matchdayId}`;
  const active = players.filter((p) => p.active);
  const [mode, setMode] = useState<MatchMode>('solo');
  const [format, setFormat] = useState<Format>('round-robin');
  const [selected, setSelected] = useState<string[]>(() => players.filter((p) => p.active).map((p) => p.id));
  const [plan, setPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Plan;
        if (parsed.entrants?.length >= 2 && ['solo', 'pairs'].includes(parsed.mode)) {
          setPlan(parsed); setMode(parsed.mode); setFormat(parsed.format);
        }
      }
    } catch { /* storage may be unavailable */ }
  }, [storageKey]);
  const entries = useMemo(() => {
    const ids = selected.filter((id) => active.some((p) => p.id === id));
    const perTeam = mode === 'solo' ? 1 : 2;
    const result: BracketEntrant[] = [];
    for (let i = 0; i + perTeam <= ids.length; i += perTeam) {
      const group = ids.slice(i, i + perTeam);
      result.push({ id: group.join(':'), label: group.map((id) => active.find((p) => p.id === id)?.displayName ?? id).join(' + '), playerIds: group });
    }
    return result;
  }, [selected, mode, players]);
  const fixtures = useMemo(() => {
    if (!plan) return { rounds: [] as Array<Array<{ id: string; home: BracketEntrant | null; away: BracketEntrant | null; score: string; done: boolean }>>, champion: '' };
    const used = new Set<string>();
    if (plan.format === 'round-robin') {
      const games = createRoundRobin(plan.entrants);
      const rounds = [...new Set(games.map((g) => g.round))].map((round) =>
        games.filter((g) => g.round === round).map((g, i) => {
          const result = findResult(matches, g.home, g.away, used);
          return { id: `r${round}-${i}`, home: g.home, away: g.away, score: result ? `${result.a} – ${result.b}` : 'Pendiente', done: Boolean(result) };
        }));
      return { rounds, champion: '' };
    }
    let bracket = createKnockout(plan.entrants);
    const rounds = bracket.rounds.map((round) => {
      const shown = round.map((game) => {
        const current = bracket.rounds[game.round]![game.slot]!;
        const result = current.home && current.away && !current.winnerId ? findResult(matches, current.home, current.away, used) : null;
        if (result?.complete) bracket = recordKnockoutResult(bracket, current.id, result.a, result.b);
        return { id: current.id, home: current.home, away: current.away, score: current.bye ? 'Pasa de ronda' : result ? `${result.a} – ${result.b}` : 'Pendiente', done: Boolean(current.bye || result?.complete) };
      });
      return shown;
    });
    return { rounds, champion: bracket.entrants.find((e) => e.id === bracket.championId)?.label ?? '' };
  }, [plan, matches]);
  function start() {
    if (mode === 'pairs' && selected.length % 2) { setMessage('Para parejas, seleccioná una cantidad par de jugadores.'); return; }
    if (entries.length < 2) { setMessage('Seleccioná al menos dos participantes o parejas.'); return; }
    if (format === 'semifinal' && entries.length !== 4) { setMessage('Las semifinales necesitan exactamente cuatro jugadores o parejas.'); return; }
    const next: Plan = { mode, format, entrants: entries };
    setPlan(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { setMessage('El plan no se pudo guardar en este dispositivo.'); }
  }
  function play(home: BracketEntrant | null, away: BracketEntrant | null) {
    if (!plan || !home || !away) return;
    onPlay(plan.mode, makeParticipants(home, away));
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Organizar torneo" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-top"><div><div className="dialog-kicker">LA FECHA</div><h2>Organizar torneo</h2></div><button type="button" className="close" aria-label="Cerrar" onClick={onClose}><X size={16}/></button></div>
        <div className="dialog-body">
          {!plan ? <>
            <p className="hint">Elegí cómo jugar. Los resultados se cargan como partidos normales y actualizan el ranking.</p>
            <div className="step-label">01 / Modalidad</div>
            <div className="mode-choice">{(['solo','pairs'] as const).map((value) => <button key={value} type="button" className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{value === 'solo' ? '1 VS 1' : '2 VS 2'}</button>)}</div>
            <div className="step-label">02 / Formato</div>
            <div className="mode-choice" style={{ flexWrap: 'wrap' }}>{([['round-robin','Todos contra todos'],['knockout','Eliminación directa'],['semifinal','Semifinales y final']] as const).map(([value,label]) => <button key={value} type="button" className={format === value ? 'active' : ''} onClick={() => setFormat(value)}>{label}</button>)}</div>
            <div className="form-line"><div className="step-label">03 / Participantes ({selected.length})</div><button type="button" className="small-btn" onClick={() => setSelected((ids) => [...ids].sort(() => Math.random() - 0.5))}><Shuffle size={14}/> MEZCLAR</button></div>
            <p className="hint">Tocá para incluir o excluir. En 2 vs 2, cada dos nombres consecutivos forman una pareja.</p>
            <div className="choices">{active.map((p) => <button type="button" key={p.id} className={`tg-chip ${selected.includes(p.id) ? 'active' : ''}`} aria-pressed={selected.includes(p.id)} onClick={() => setSelected((old) => old.includes(p.id) ? old.filter((id) => id !== p.id) : [...old,p.id])}>{p.displayName}</button>)}</div>
            <div className="group-panel"><h3>Participantes</h3>{entries.map((e) => <p key={e.id}>{e.label}</p>)}</div>
            <button type="button" className="primary-btn form-submit" onClick={start}>GENERAR CRUCES</button>
          </> : <>
            <p className="hint">Cruces de esta fecha. Tocá «Jugar» para cargar el resultado. Los ganadores avanzan automáticamente en eliminatorias.</p>
            {fixtures.rounds.map((round, index) => <section key={index} style={{ marginBottom: 22 }}><div className="section-header"><h3 className="section-title">{plan.format === 'round-robin' ? `Ronda ${index + 1}` : index === fixtures.rounds.length - 1 ? 'Final' : index === fixtures.rounds.length - 2 ? 'Semifinales' : `Ronda ${index + 1}`}</h3></div>{round.map((game) => <div key={game.id} className="pair-built" style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}><span>{game.home?.label ?? 'Por definir'} <strong>vs</strong> {game.away?.label ?? 'Por definir'} <small style={{ display: 'block' }}>{game.score}</small></span>{game.home && game.away && !game.done && <button type="button" className="small-btn" onClick={() => play(game.home,game.away)}>JUGAR</button>}</div>)}</section>)}
            {fixtures.champion && <div className="group-panel"><h3>Campeón del torneo</h3><p>{fixtures.champion}</p></div>}
            <button type="button" className="outline-mini" onClick={() => { if (!window.confirm('¿Crear otro cuadro? Se reemplaza la organización guardada en este dispositivo, no los partidos.')) return; setPlan(null); try { localStorage.removeItem(storageKey); } catch {} }}>NUEVO CUADRO</button>
          </>}
          {message && <p className="error" role="alert">{message}</p>}
          <p className="hint">La organización de los cruces se guarda en este dispositivo. Los partidos y rankings sí se guardan en el grupo.</p>
        </div>
      </div>
    </div>
  );
}
