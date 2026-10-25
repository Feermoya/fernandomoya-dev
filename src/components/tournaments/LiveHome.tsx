import { ChevronRight, Plus, Trophy, Users, Zap } from 'lucide-react';
import LeaderboardHero from '@/components/tournaments/LeaderboardHero';
import MatchRow from '@/components/tournaments/MatchRow';
import QuietNumber from '@/components/tournaments/motion/QuietNumber';
import type {
  StandingRow,
  TournamentMatch,
  TournamentMatchday,
  TournamentPlayer,
} from '@/lib/tournaments/types';

function Pitch() {
  return (
    <svg className="pitch" viewBox="0 0 410 450" fill="none" stroke="#e5f9c4" strokeWidth="2" aria-hidden>
      <rect x="25" y="25" width="360" height="400" rx="2" />
      <path className="pitch-line" d="M25 225h360" stroke="#C5F64C" strokeWidth="1.5" />
      <circle cx="205" cy="225" r="65" />
      <circle cx="205" cy="225" r="3" fill="currentColor" />
      <rect x="111" y="25" width="188" height="68" />
      <rect x="111" y="357" width="188" height="68" />
      <path d="M155 93a55 55 0 0 0 100 0M155 357a55 55 0 0 1 100 0" />
    </svg>
  );
}

export default function LiveHome({
  matchday,
  finished,
  matches,
  players,
  leader,
  leaderWins,
  streakLeader,
  isAdmin,
  mvpName,
  nameOf,
  onLoadMatch,
  onPlan,
  onStart,
  onSeeRanking,
  onSeeMatches,
  onExport,
  onReopen,
  onAwards,
  freshIds = [],
  onFreshDone,
}: {
  matchday: TournamentMatchday | null;
  finished: boolean;
  matches: TournamentMatch[];
  players: TournamentPlayer[];
  leader: StandingRow | null;
  leaderWins: number;
  streakLeader: { row: StandingRow; mode: 'solo' | 'pairsPlayer' | 'pairs' } | null;
  isAdmin: boolean;
  mvpName?: string;
  nameOf: (id: string) => string;
  onLoadMatch: () => void;
  onPlan: () => void;
  onStart: () => void;
  onSeeRanking: () => void;
  onSeeMatches: () => void;
  onExport: () => void;
  onReopen?: () => void;
  onAwards?: () => void;
  freshIds?: string[];
  onFreshDone?: (id: string) => void;
}) {
  const seq = matchday ? String(matchday.sequenceNumber).padStart(2, '0') : '—';
  const status = !matchday ? 'SIN FECHA' : finished ? 'CERRADA' : 'EN JUEGO';
  const activeCount = players.filter((p) => p.active).length;
  const recent = matches.slice().sort((a, b) => b.sortOrder - a.sortOrder).slice(0, 3);

  return (
    <>


      {finished && matchday ? (
        <div className="finished">
          <div className="cup">
            <Trophy size={56} />
          </div>
          <span className="small-lime">{matchday.name} terminó</span>
          <h2>Fecha finalizada</h2>
          <div className="winning">{leader?.label ?? 'Sin ganador'}</div>
          <p>
            {leader
              ? `${leader.wins} victorias · ${leader.points} puntos`
              : 'La fecha terminó sin partidos.'}
          </p>
          {mvpName ? (
            <p>
              MVP de la noche: <b>{mvpName}</b>
            </p>
          ) : null}
          <div className="actions">
            <button type="button" className="primary-btn" onClick={onExport}>
              GUARDAR TARJETA
            </button>
            {isAdmin && onReopen && (
              <button type="button" className="outline-mini" onClick={onReopen}>
                REABRIR FECHA
              </button>
            )}
            {isAdmin && onAwards && (
              <button type="button" className="outline-mini" onClick={onAwards}>
                PREMIOS
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="hero">
          <Pitch />
          <div className="hero-noise" />
          <div className="hero-shine" />
          <div className="hero-watermark">{seq === '—' ? '00' : seq}</div>
          <div className="hero-inner">
            <div className="hero-kicker">
              {matchday ? `${matchday.name} · ${status}` : 'SIN FECHA ACTIVA'}
            </div>
            <h1 className="hero-title">LA <span>FECHA</span></h1>
            <div className="hero-bottom">
              {isAdmin && matchday && (
                <button type="button" className="primary-btn" onClick={onLoadMatch}>
                  <Plus size={16} /> CARGAR RESULTADO <ChevronRight size={16} />
                </button>
              )}
              {matchday && !finished && (
                <button type="button" className="outline-mini" onClick={onPlan}>{isAdmin ? 'ORGANIZAR TORNEO' : 'VER CRUCES'}</button>
              )}
              {isAdmin && !matchday && (
                <button type="button" className="primary-btn" onClick={onStart}>
                  <Plus size={16} /> INICIAR FECHA
                </button>
              )}
              {!isAdmin && !matchday && (
                <p className="hero-sub">Sin fecha activa.</p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="stat-strip">
        <div className="stat">
          <span className="stat-icon">
            <Zap size={16} />
          </span>
          <span>
            <span className="number">
              <QuietNumber value={matches.length} />
            </span>
            <small>Partidos</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Users size={16} />
          </span>
          <span>
            <span className="number">
              <QuietNumber value={activeCount} />
            </span>
            <small>Jugadores</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-icon">
            <Trophy size={16} />
          </span>
          <span>
            <span className="number">
              <QuietNumber value={leaderWins} />
            </span>
            <small>Victorias del líder</small>
          </span>
        </div>
      </section>

      {streakLeader && streakLeader.row.undefeatedRun >= 2 && (
        <div className="streak-card" aria-label={`Racha invicta de ${streakLeader.row.label}: ${streakLeader.row.undefeatedRun} partidos`}>
          <span className="streak-fire-scene" aria-hidden="true"><svg className="streak-flame-sprite" viewBox="0 0 12 14" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges"><g className="streak-flame-frame streak-flame-frame-1"><rect x="2" y="0" width="1" height="1" fill="#ff451e"/><rect x="7" y="0" width="1" height="1" fill="#ff451e"/><rect x="2" y="1" width="1" height="1" fill="#ff451e"/><rect x="3" y="1" width="1" height="1" fill="#ff451e"/><rect x="6" y="1" width="1" height="1" fill="#ff451e"/><rect x="7" y="1" width="1" height="1" fill="#ff451e"/><rect x="1" y="2" width="1" height="1" fill="#ff451e"/><rect x="2" y="2" width="1" height="1" fill="#ff451e"/><rect x="3" y="2" width="1" height="1" fill="#ff451e"/><rect x="5" y="2" width="1" height="1" fill="#ff451e"/><rect x="6" y="2" width="1" height="1" fill="#ff451e"/><rect x="7" y="2" width="1" height="1" fill="#ff451e"/><rect x="1" y="3" width="1" height="1" fill="#ff451e"/><rect x="2" y="3" width="1" height="1" fill="#ff451e"/><rect x="3" y="3" width="1" height="1" fill="#ff451e"/><rect x="4" y="3" width="1" height="1" fill="#ff451e"/><rect x="5" y="3" width="1" height="1" fill="#ff451e"/><rect x="6" y="3" width="1" height="1" fill="#ff451e"/><rect x="7" y="3" width="1" height="1" fill="#ff451e"/><rect x="8" y="3" width="1" height="1" fill="#ff451e"/><rect x="0" y="4" width="1" height="1" fill="#ff451e"/><rect x="1" y="4" width="1" height="1" fill="#ff451e"/><rect x="2" y="4" width="1" height="1" fill="#ff9824"/><rect x="3" y="4" width="1" height="1" fill="#ff9824"/><rect x="4" y="4" width="1" height="1" fill="#ff9824"/><rect x="5" y="4" width="1" height="1" fill="#ff9824"/><rect x="6" y="4" width="1" height="1" fill="#ff9824"/><rect x="7" y="4" width="1" height="1" fill="#ff9824"/><rect x="8" y="4" width="1" height="1" fill="#ff9824"/><rect x="0" y="5" width="1" height="1" fill="#ff451e"/><rect x="1" y="5" width="1" height="1" fill="#ff451e"/><rect x="2" y="5" width="1" height="1" fill="#ff9824"/><rect x="3" y="5" width="1" height="1" fill="#ff9824"/><rect x="4" y="5" width="1" height="1" fill="#ff9824"/><rect x="5" y="5" width="1" height="1" fill="#ff9824"/><rect x="6" y="5" width="1" height="1" fill="#ff9824"/><rect x="7" y="5" width="1" height="1" fill="#ff9824"/><rect x="8" y="5" width="1" height="1" fill="#ff9824"/><rect x="9" y="5" width="1" height="1" fill="#ff9824"/><rect x="0" y="6" width="1" height="1" fill="#ff451e"/><rect x="1" y="6" width="1" height="1" fill="#ff451e"/><rect x="2" y="6" width="1" height="1" fill="#ff9824"/><rect x="3" y="6" width="1" height="1" fill="#ff9824"/><rect x="4" y="6" width="1" height="1" fill="#ff9824"/><rect x="5" y="6" width="1" height="1" fill="#ff9824"/><rect x="6" y="6" width="1" height="1" fill="#ff9824"/><rect x="7" y="6" width="1" height="1" fill="#ff9824"/><rect x="8" y="6" width="1" height="1" fill="#ff9824"/><rect x="9" y="6" width="1" height="1" fill="#ff9824"/><rect x="10" y="6" width="1" height="1" fill="#ff451e"/><rect x="0" y="7" width="1" height="1" fill="#ff451e"/><rect x="1" y="7" width="1" height="1" fill="#ff451e"/><rect x="2" y="7" width="1" height="1" fill="#ff9824"/><rect x="3" y="7" width="1" height="1" fill="#ff9824"/><rect x="4" y="7" width="1" height="1" fill="#ffe568"/><rect x="5" y="7" width="1" height="1" fill="#ffe568"/><rect x="6" y="7" width="1" height="1" fill="#ffe568"/><rect x="7" y="7" width="1" height="1" fill="#ffe568"/><rect x="8" y="7" width="1" height="1" fill="#ff9824"/><rect x="9" y="7" width="1" height="1" fill="#ff9824"/><rect x="10" y="7" width="1" height="1" fill="#ff451e"/><rect x="0" y="8" width="1" height="1" fill="#ff451e"/><rect x="1" y="8" width="1" height="1" fill="#ff451e"/><rect x="2" y="8" width="1" height="1" fill="#ff9824"/><rect x="3" y="8" width="1" height="1" fill="#ff9824"/><rect x="4" y="8" width="1" height="1" fill="#ffe568"/><rect x="5" y="8" width="1" height="1" fill="#ffe568"/><rect x="6" y="8" width="1" height="1" fill="#ffe568"/><rect x="7" y="8" width="1" height="1" fill="#ffe568"/><rect x="8" y="8" width="1" height="1" fill="#ff9824"/><rect x="9" y="8" width="1" height="1" fill="#ff9824"/><rect x="10" y="8" width="1" height="1" fill="#ff451e"/><rect x="0" y="9" width="1" height="1" fill="#ff451e"/><rect x="1" y="9" width="1" height="1" fill="#ff451e"/><rect x="2" y="9" width="1" height="1" fill="#ff9824"/><rect x="3" y="9" width="1" height="1" fill="#ff9824"/><rect x="4" y="9" width="1" height="1" fill="#ffe568"/><rect x="5" y="9" width="1" height="1" fill="#ffe568"/><rect x="6" y="9" width="1" height="1" fill="#ffe568"/><rect x="7" y="9" width="1" height="1" fill="#ffe568"/><rect x="8" y="9" width="1" height="1" fill="#ff9824"/><rect x="9" y="9" width="1" height="1" fill="#ff9824"/><rect x="10" y="9" width="1" height="1" fill="#ff451e"/><rect x="1" y="10" width="1" height="1" fill="#ff451e"/><rect x="2" y="10" width="1" height="1" fill="#ff9824"/><rect x="3" y="10" width="1" height="1" fill="#ffe568"/><rect x="4" y="10" width="1" height="1" fill="#ffe568"/><rect x="5" y="10" width="1" height="1" fill="#ffe568"/><rect x="6" y="10" width="1" height="1" fill="#ffe568"/><rect x="7" y="10" width="1" height="1" fill="#ffe568"/><rect x="8" y="10" width="1" height="1" fill="#ffe568"/><rect x="9" y="10" width="1" height="1" fill="#ff9824"/><rect x="1" y="11" width="1" height="1" fill="#ff451e"/><rect x="2" y="11" width="1" height="1" fill="#ff9824"/><rect x="3" y="11" width="1" height="1" fill="#ffe568"/><rect x="4" y="11" width="1" height="1" fill="#ffe568"/><rect x="5" y="11" width="1" height="1" fill="#ffe568"/><rect x="6" y="11" width="1" height="1" fill="#ffe568"/><rect x="7" y="11" width="1" height="1" fill="#ffe568"/><rect x="8" y="11" width="1" height="1" fill="#ffe568"/><rect x="9" y="11" width="1" height="1" fill="#ff9824"/><rect x="2" y="12" width="1" height="1" fill="#ff9824"/><rect x="3" y="12" width="1" height="1" fill="#ffe568"/><rect x="4" y="12" width="1" height="1" fill="#ffe568"/><rect x="5" y="12" width="1" height="1" fill="#ffe568"/><rect x="6" y="12" width="1" height="1" fill="#ffe568"/><rect x="7" y="12" width="1" height="1" fill="#ffe568"/><rect x="8" y="12" width="1" height="1" fill="#ffe568"/><rect x="3" y="13" width="1" height="1" fill="#ffe568"/><rect x="4" y="13" width="1" height="1" fill="#ffe568"/><rect x="5" y="13" width="1" height="1" fill="#ffe568"/><rect x="6" y="13" width="1" height="1" fill="#ffe568"/><rect x="7" y="13" width="1" height="1" fill="#ffe568"/></g><g className="streak-flame-frame streak-flame-frame-2"><rect x="3" y="0" width="1" height="1" fill="#ff451e"/><rect x="6" y="0" width="1" height="1" fill="#ff451e"/><rect x="2" y="1" width="1" height="1" fill="#ff451e"/><rect x="3" y="1" width="1" height="1" fill="#ff451e"/><rect x="4" y="1" width="1" height="1" fill="#ff451e"/><rect x="6" y="1" width="1" height="1" fill="#ff451e"/><rect x="7" y="1" width="1" height="1" fill="#ff451e"/><rect x="2" y="2" width="1" height="1" fill="#ff451e"/><rect x="3" y="2" width="1" height="1" fill="#ff451e"/><rect x="4" y="2" width="1" height="1" fill="#ff451e"/><rect x="5" y="2" width="1" height="1" fill="#ff451e"/><rect x="6" y="2" width="1" height="1" fill="#ff451e"/><rect x="7" y="2" width="1" height="1" fill="#ff451e"/><rect x="8" y="2" width="1" height="1" fill="#ff451e"/><rect x="1" y="3" width="1" height="1" fill="#ff451e"/><rect x="2" y="3" width="1" height="1" fill="#ff451e"/><rect x="3" y="3" width="1" height="1" fill="#ff451e"/><rect x="4" y="3" width="1" height="1" fill="#ff451e"/><rect x="5" y="3" width="1" height="1" fill="#ff451e"/><rect x="6" y="3" width="1" height="1" fill="#ff451e"/><rect x="7" y="3" width="1" height="1" fill="#ff451e"/><rect x="8" y="3" width="1" height="1" fill="#ff451e"/><rect x="1" y="4" width="1" height="1" fill="#ff451e"/><rect x="2" y="4" width="1" height="1" fill="#ff9824"/><rect x="3" y="4" width="1" height="1" fill="#ff9824"/><rect x="4" y="4" width="1" height="1" fill="#ff9824"/><rect x="5" y="4" width="1" height="1" fill="#ff9824"/><rect x="6" y="4" width="1" height="1" fill="#ff9824"/><rect x="7" y="4" width="1" height="1" fill="#ff9824"/><rect x="8" y="4" width="1" height="1" fill="#ff9824"/><rect x="9" y="4" width="1" height="1" fill="#ff9824"/><rect x="0" y="5" width="1" height="1" fill="#ff451e"/><rect x="1" y="5" width="1" height="1" fill="#ff451e"/><rect x="2" y="5" width="1" height="1" fill="#ff9824"/><rect x="3" y="5" width="1" height="1" fill="#ff9824"/><rect x="4" y="5" width="1" height="1" fill="#ff9824"/><rect x="5" y="5" width="1" height="1" fill="#ff9824"/><rect x="6" y="5" width="1" height="1" fill="#ff9824"/><rect x="7" y="5" width="1" height="1" fill="#ff9824"/><rect x="8" y="5" width="1" height="1" fill="#ff9824"/><rect x="9" y="5" width="1" height="1" fill="#ff9824"/><rect x="0" y="6" width="1" height="1" fill="#ff451e"/><rect x="1" y="6" width="1" height="1" fill="#ff451e"/><rect x="2" y="6" width="1" height="1" fill="#ff9824"/><rect x="3" y="6" width="1" height="1" fill="#ff9824"/><rect x="4" y="6" width="1" height="1" fill="#ff9824"/><rect x="5" y="6" width="1" height="1" fill="#ff9824"/><rect x="6" y="6" width="1" height="1" fill="#ff9824"/><rect x="7" y="6" width="1" height="1" fill="#ff9824"/><rect x="8" y="6" width="1" height="1" fill="#ff9824"/><rect x="9" y="6" width="1" height="1" fill="#ff9824"/><rect x="10" y="6" width="1" height="1" fill="#ff451e"/><rect x="0" y="7" width="1" height="1" fill="#ff451e"/><rect x="1" y="7" width="1" height="1" fill="#ff451e"/><rect x="2" y="7" width="1" height="1" fill="#ff9824"/><rect x="3" y="7" width="1" height="1" fill="#ff9824"/><rect x="4" y="7" width="1" height="1" fill="#ffe568"/><rect x="5" y="7" width="1" height="1" fill="#ffe568"/><rect x="6" y="7" width="1" height="1" fill="#ffe568"/><rect x="7" y="7" width="1" height="1" fill="#ffe568"/><rect x="8" y="7" width="1" height="1" fill="#ff9824"/><rect x="9" y="7" width="1" height="1" fill="#ff9824"/><rect x="10" y="7" width="1" height="1" fill="#ff451e"/><rect x="0" y="8" width="1" height="1" fill="#ff451e"/><rect x="1" y="8" width="1" height="1" fill="#ff451e"/><rect x="2" y="8" width="1" height="1" fill="#ff9824"/><rect x="3" y="8" width="1" height="1" fill="#ff9824"/><rect x="4" y="8" width="1" height="1" fill="#ffe568"/><rect x="5" y="8" width="1" height="1" fill="#ffe568"/><rect x="6" y="8" width="1" height="1" fill="#ffe568"/><rect x="7" y="8" width="1" height="1" fill="#ffe568"/><rect x="8" y="8" width="1" height="1" fill="#ff9824"/><rect x="9" y="8" width="1" height="1" fill="#ff9824"/><rect x="10" y="8" width="1" height="1" fill="#ff451e"/><rect x="0" y="9" width="1" height="1" fill="#ff451e"/><rect x="1" y="9" width="1" height="1" fill="#ff451e"/><rect x="2" y="9" width="1" height="1" fill="#ff9824"/><rect x="3" y="9" width="1" height="1" fill="#ff9824"/><rect x="4" y="9" width="1" height="1" fill="#ffe568"/><rect x="5" y="9" width="1" height="1" fill="#ffe568"/><rect x="6" y="9" width="1" height="1" fill="#ffe568"/><rect x="7" y="9" width="1" height="1" fill="#ffe568"/><rect x="8" y="9" width="1" height="1" fill="#ff9824"/><rect x="9" y="9" width="1" height="1" fill="#ff9824"/><rect x="10" y="9" width="1" height="1" fill="#ff451e"/><rect x="0" y="10" width="1" height="1" fill="#ff451e"/><rect x="1" y="10" width="1" height="1" fill="#ff451e"/><rect x="2" y="10" width="1" height="1" fill="#ff9824"/><rect x="3" y="10" width="1" height="1" fill="#ffe568"/><rect x="4" y="10" width="1" height="1" fill="#ffe568"/><rect x="5" y="10" width="1" height="1" fill="#ffe568"/><rect x="6" y="10" width="1" height="1" fill="#ffe568"/><rect x="7" y="10" width="1" height="1" fill="#ffe568"/><rect x="8" y="10" width="1" height="1" fill="#ffe568"/><rect x="9" y="10" width="1" height="1" fill="#ff9824"/><rect x="1" y="11" width="1" height="1" fill="#ff451e"/><rect x="2" y="11" width="1" height="1" fill="#ff9824"/><rect x="3" y="11" width="1" height="1" fill="#ffe568"/><rect x="4" y="11" width="1" height="1" fill="#ffe568"/><rect x="5" y="11" width="1" height="1" fill="#ffe568"/><rect x="6" y="11" width="1" height="1" fill="#ffe568"/><rect x="7" y="11" width="1" height="1" fill="#ffe568"/><rect x="8" y="11" width="1" height="1" fill="#ffe568"/><rect x="9" y="11" width="1" height="1" fill="#ff9824"/><rect x="2" y="12" width="1" height="1" fill="#ff9824"/><rect x="3" y="12" width="1" height="1" fill="#ffe568"/><rect x="4" y="12" width="1" height="1" fill="#ffe568"/><rect x="5" y="12" width="1" height="1" fill="#ffe568"/><rect x="6" y="12" width="1" height="1" fill="#ffe568"/><rect x="7" y="12" width="1" height="1" fill="#ffe568"/><rect x="8" y="12" width="1" height="1" fill="#ffe568"/><rect x="3" y="13" width="1" height="1" fill="#ffe568"/><rect x="4" y="13" width="1" height="1" fill="#ffe568"/><rect x="5" y="13" width="1" height="1" fill="#ffe568"/><rect x="6" y="13" width="1" height="1" fill="#ffe568"/><rect x="7" y="13" width="1" height="1" fill="#ffe568"/></g><g className="streak-flame-frame streak-flame-frame-3"><rect x="4" y="0" width="1" height="1" fill="#ff451e"/><rect x="7" y="0" width="1" height="1" fill="#ff451e"/><rect x="3" y="1" width="1" height="1" fill="#ff451e"/><rect x="4" y="1" width="1" height="1" fill="#ff451e"/><rect x="6" y="1" width="1" height="1" fill="#ff451e"/><rect x="7" y="1" width="1" height="1" fill="#ff451e"/><rect x="8" y="1" width="1" height="1" fill="#ff451e"/><rect x="2" y="2" width="1" height="1" fill="#ff451e"/><rect x="3" y="2" width="1" height="1" fill="#ff451e"/><rect x="4" y="2" width="1" height="1" fill="#ff451e"/><rect x="5" y="2" width="1" height="1" fill="#ff451e"/><rect x="6" y="2" width="1" height="1" fill="#ff451e"/><rect x="7" y="2" width="1" height="1" fill="#ff451e"/><rect x="8" y="2" width="1" height="1" fill="#ff451e"/><rect x="2" y="3" width="1" height="1" fill="#ff451e"/><rect x="3" y="3" width="1" height="1" fill="#ff451e"/><rect x="4" y="3" width="1" height="1" fill="#ff451e"/><rect x="5" y="3" width="1" height="1" fill="#ff451e"/><rect x="6" y="3" width="1" height="1" fill="#ff451e"/><rect x="7" y="3" width="1" height="1" fill="#ff451e"/><rect x="8" y="3" width="1" height="1" fill="#ff451e"/><rect x="9" y="3" width="1" height="1" fill="#ff451e"/><rect x="1" y="4" width="1" height="1" fill="#ff451e"/><rect x="2" y="4" width="1" height="1" fill="#ff9824"/><rect x="3" y="4" width="1" height="1" fill="#ff9824"/><rect x="4" y="4" width="1" height="1" fill="#ff9824"/><rect x="5" y="4" width="1" height="1" fill="#ff9824"/><rect x="6" y="4" width="1" height="1" fill="#ff9824"/><rect x="7" y="4" width="1" height="1" fill="#ff9824"/><rect x="8" y="4" width="1" height="1" fill="#ff9824"/><rect x="9" y="4" width="1" height="1" fill="#ff9824"/><rect x="0" y="5" width="1" height="1" fill="#ff451e"/><rect x="1" y="5" width="1" height="1" fill="#ff451e"/><rect x="2" y="5" width="1" height="1" fill="#ff9824"/><rect x="3" y="5" width="1" height="1" fill="#ff9824"/><rect x="4" y="5" width="1" height="1" fill="#ff9824"/><rect x="5" y="5" width="1" height="1" fill="#ff9824"/><rect x="6" y="5" width="1" height="1" fill="#ff9824"/><rect x="7" y="5" width="1" height="1" fill="#ff9824"/><rect x="8" y="5" width="1" height="1" fill="#ff9824"/><rect x="9" y="5" width="1" height="1" fill="#ff9824"/><rect x="0" y="6" width="1" height="1" fill="#ff451e"/><rect x="1" y="6" width="1" height="1" fill="#ff451e"/><rect x="2" y="6" width="1" height="1" fill="#ff9824"/><rect x="3" y="6" width="1" height="1" fill="#ff9824"/><rect x="4" y="6" width="1" height="1" fill="#ff9824"/><rect x="5" y="6" width="1" height="1" fill="#ff9824"/><rect x="6" y="6" width="1" height="1" fill="#ff9824"/><rect x="7" y="6" width="1" height="1" fill="#ff9824"/><rect x="8" y="6" width="1" height="1" fill="#ff9824"/><rect x="9" y="6" width="1" height="1" fill="#ff9824"/><rect x="10" y="6" width="1" height="1" fill="#ff451e"/><rect x="0" y="7" width="1" height="1" fill="#ff451e"/><rect x="1" y="7" width="1" height="1" fill="#ff451e"/><rect x="2" y="7" width="1" height="1" fill="#ff9824"/><rect x="3" y="7" width="1" height="1" fill="#ff9824"/><rect x="4" y="7" width="1" height="1" fill="#ffe568"/><rect x="5" y="7" width="1" height="1" fill="#ffe568"/><rect x="6" y="7" width="1" height="1" fill="#ffe568"/><rect x="7" y="7" width="1" height="1" fill="#ffe568"/><rect x="8" y="7" width="1" height="1" fill="#ff9824"/><rect x="9" y="7" width="1" height="1" fill="#ff9824"/><rect x="10" y="7" width="1" height="1" fill="#ff451e"/><rect x="0" y="8" width="1" height="1" fill="#ff451e"/><rect x="1" y="8" width="1" height="1" fill="#ff451e"/><rect x="2" y="8" width="1" height="1" fill="#ff9824"/><rect x="3" y="8" width="1" height="1" fill="#ff9824"/><rect x="4" y="8" width="1" height="1" fill="#ffe568"/><rect x="5" y="8" width="1" height="1" fill="#ffe568"/><rect x="6" y="8" width="1" height="1" fill="#ffe568"/><rect x="7" y="8" width="1" height="1" fill="#ffe568"/><rect x="8" y="8" width="1" height="1" fill="#ff9824"/><rect x="9" y="8" width="1" height="1" fill="#ff9824"/><rect x="10" y="8" width="1" height="1" fill="#ff451e"/><rect x="0" y="9" width="1" height="1" fill="#ff451e"/><rect x="1" y="9" width="1" height="1" fill="#ff451e"/><rect x="2" y="9" width="1" height="1" fill="#ff9824"/><rect x="3" y="9" width="1" height="1" fill="#ff9824"/><rect x="4" y="9" width="1" height="1" fill="#ffe568"/><rect x="5" y="9" width="1" height="1" fill="#ffe568"/><rect x="6" y="9" width="1" height="1" fill="#ffe568"/><rect x="7" y="9" width="1" height="1" fill="#ffe568"/><rect x="8" y="9" width="1" height="1" fill="#ff9824"/><rect x="9" y="9" width="1" height="1" fill="#ff9824"/><rect x="10" y="9" width="1" height="1" fill="#ff451e"/><rect x="1" y="10" width="1" height="1" fill="#ff451e"/><rect x="2" y="10" width="1" height="1" fill="#ff9824"/><rect x="3" y="10" width="1" height="1" fill="#ffe568"/><rect x="4" y="10" width="1" height="1" fill="#ffe568"/><rect x="5" y="10" width="1" height="1" fill="#ffe568"/><rect x="6" y="10" width="1" height="1" fill="#ffe568"/><rect x="7" y="10" width="1" height="1" fill="#ffe568"/><rect x="8" y="10" width="1" height="1" fill="#ffe568"/><rect x="9" y="10" width="1" height="1" fill="#ff9824"/><rect x="10" y="10" width="1" height="1" fill="#ff451e"/><rect x="1" y="11" width="1" height="1" fill="#ff451e"/><rect x="2" y="11" width="1" height="1" fill="#ff9824"/><rect x="3" y="11" width="1" height="1" fill="#ffe568"/><rect x="4" y="11" width="1" height="1" fill="#ffe568"/><rect x="5" y="11" width="1" height="1" fill="#ffe568"/><rect x="6" y="11" width="1" height="1" fill="#ffe568"/><rect x="7" y="11" width="1" height="1" fill="#ffe568"/><rect x="8" y="11" width="1" height="1" fill="#ffe568"/><rect x="9" y="11" width="1" height="1" fill="#ff9824"/><rect x="2" y="12" width="1" height="1" fill="#ff9824"/><rect x="3" y="12" width="1" height="1" fill="#ffe568"/><rect x="4" y="12" width="1" height="1" fill="#ffe568"/><rect x="5" y="12" width="1" height="1" fill="#ffe568"/><rect x="6" y="12" width="1" height="1" fill="#ffe568"/><rect x="7" y="12" width="1" height="1" fill="#ffe568"/><rect x="8" y="12" width="1" height="1" fill="#ffe568"/><rect x="3" y="13" width="1" height="1" fill="#ffe568"/><rect x="4" y="13" width="1" height="1" fill="#ffe568"/><rect x="5" y="13" width="1" height="1" fill="#ffe568"/><rect x="6" y="13" width="1" height="1" fill="#ffe568"/><rect x="7" y="13" width="1" height="1" fill="#ffe568"/></g><g className="streak-flame-frame streak-flame-frame-4"><rect x="2" y="0" width="1" height="1" fill="#ff451e"/><rect x="5" y="0" width="1" height="1" fill="#ff451e"/><rect x="2" y="1" width="1" height="1" fill="#ff451e"/><rect x="3" y="1" width="1" height="1" fill="#ff451e"/><rect x="4" y="1" width="1" height="1" fill="#ff451e"/><rect x="5" y="1" width="1" height="1" fill="#ff451e"/><rect x="6" y="1" width="1" height="1" fill="#ff451e"/><rect x="1" y="2" width="1" height="1" fill="#ff451e"/><rect x="2" y="2" width="1" height="1" fill="#ff451e"/><rect x="3" y="2" width="1" height="1" fill="#ff451e"/><rect x="4" y="2" width="1" height="1" fill="#ff451e"/><rect x="5" y="2" width="1" height="1" fill="#ff451e"/><rect x="6" y="2" width="1" height="1" fill="#ff451e"/><rect x="7" y="2" width="1" height="1" fill="#ff451e"/><rect x="1" y="3" width="1" height="1" fill="#ff451e"/><rect x="2" y="3" width="1" height="1" fill="#ff451e"/><rect x="3" y="3" width="1" height="1" fill="#ff451e"/><rect x="4" y="3" width="1" height="1" fill="#ff451e"/><rect x="5" y="3" width="1" height="1" fill="#ff451e"/><rect x="6" y="3" width="1" height="1" fill="#ff451e"/><rect x="7" y="3" width="1" height="1" fill="#ff451e"/><rect x="8" y="3" width="1" height="1" fill="#ff451e"/><rect x="0" y="4" width="1" height="1" fill="#ff451e"/><rect x="1" y="4" width="1" height="1" fill="#ff451e"/><rect x="2" y="4" width="1" height="1" fill="#ff9824"/><rect x="3" y="4" width="1" height="1" fill="#ff9824"/><rect x="4" y="4" width="1" height="1" fill="#ff9824"/><rect x="5" y="4" width="1" height="1" fill="#ff9824"/><rect x="6" y="4" width="1" height="1" fill="#ff9824"/><rect x="7" y="4" width="1" height="1" fill="#ff9824"/><rect x="8" y="4" width="1" height="1" fill="#ff9824"/><rect x="0" y="5" width="1" height="1" fill="#ff451e"/><rect x="1" y="5" width="1" height="1" fill="#ff451e"/><rect x="2" y="5" width="1" height="1" fill="#ff9824"/><rect x="3" y="5" width="1" height="1" fill="#ff9824"/><rect x="4" y="5" width="1" height="1" fill="#ff9824"/><rect x="5" y="5" width="1" height="1" fill="#ff9824"/><rect x="6" y="5" width="1" height="1" fill="#ff9824"/><rect x="7" y="5" width="1" height="1" fill="#ff9824"/><rect x="8" y="5" width="1" height="1" fill="#ff9824"/><rect x="9" y="5" width="1" height="1" fill="#ff9824"/><rect x="0" y="6" width="1" height="1" fill="#ff451e"/><rect x="1" y="6" width="1" height="1" fill="#ff451e"/><rect x="2" y="6" width="1" height="1" fill="#ff9824"/><rect x="3" y="6" width="1" height="1" fill="#ff9824"/><rect x="4" y="6" width="1" height="1" fill="#ff9824"/><rect x="5" y="6" width="1" height="1" fill="#ff9824"/><rect x="6" y="6" width="1" height="1" fill="#ff9824"/><rect x="7" y="6" width="1" height="1" fill="#ff9824"/><rect x="8" y="6" width="1" height="1" fill="#ff9824"/><rect x="9" y="6" width="1" height="1" fill="#ff9824"/><rect x="10" y="6" width="1" height="1" fill="#ff451e"/><rect x="0" y="7" width="1" height="1" fill="#ff451e"/><rect x="1" y="7" width="1" height="1" fill="#ff451e"/><rect x="2" y="7" width="1" height="1" fill="#ff9824"/><rect x="3" y="7" width="1" height="1" fill="#ff9824"/><rect x="4" y="7" width="1" height="1" fill="#ffe568"/><rect x="5" y="7" width="1" height="1" fill="#ffe568"/><rect x="6" y="7" width="1" height="1" fill="#ffe568"/><rect x="7" y="7" width="1" height="1" fill="#ffe568"/><rect x="8" y="7" width="1" height="1" fill="#ff9824"/><rect x="9" y="7" width="1" height="1" fill="#ff9824"/><rect x="10" y="7" width="1" height="1" fill="#ff451e"/><rect x="0" y="8" width="1" height="1" fill="#ff451e"/><rect x="1" y="8" width="1" height="1" fill="#ff451e"/><rect x="2" y="8" width="1" height="1" fill="#ff9824"/><rect x="3" y="8" width="1" height="1" fill="#ff9824"/><rect x="4" y="8" width="1" height="1" fill="#ffe568"/><rect x="5" y="8" width="1" height="1" fill="#ffe568"/><rect x="6" y="8" width="1" height="1" fill="#ffe568"/><rect x="7" y="8" width="1" height="1" fill="#ffe568"/><rect x="8" y="8" width="1" height="1" fill="#ff9824"/><rect x="9" y="8" width="1" height="1" fill="#ff9824"/><rect x="10" y="8" width="1" height="1" fill="#ff451e"/><rect x="0" y="9" width="1" height="1" fill="#ff451e"/><rect x="1" y="9" width="1" height="1" fill="#ff451e"/><rect x="2" y="9" width="1" height="1" fill="#ff9824"/><rect x="3" y="9" width="1" height="1" fill="#ff9824"/><rect x="4" y="9" width="1" height="1" fill="#ffe568"/><rect x="5" y="9" width="1" height="1" fill="#ffe568"/><rect x="6" y="9" width="1" height="1" fill="#ffe568"/><rect x="7" y="9" width="1" height="1" fill="#ffe568"/><rect x="8" y="9" width="1" height="1" fill="#ff9824"/><rect x="9" y="9" width="1" height="1" fill="#ff9824"/><rect x="1" y="10" width="1" height="1" fill="#ff451e"/><rect x="2" y="10" width="1" height="1" fill="#ff9824"/><rect x="3" y="10" width="1" height="1" fill="#ffe568"/><rect x="4" y="10" width="1" height="1" fill="#ffe568"/><rect x="5" y="10" width="1" height="1" fill="#ffe568"/><rect x="6" y="10" width="1" height="1" fill="#ffe568"/><rect x="7" y="10" width="1" height="1" fill="#ffe568"/><rect x="8" y="10" width="1" height="1" fill="#ffe568"/><rect x="9" y="10" width="1" height="1" fill="#ff9824"/><rect x="2" y="11" width="1" height="1" fill="#ff9824"/><rect x="3" y="11" width="1" height="1" fill="#ffe568"/><rect x="4" y="11" width="1" height="1" fill="#ffe568"/><rect x="5" y="11" width="1" height="1" fill="#ffe568"/><rect x="6" y="11" width="1" height="1" fill="#ffe568"/><rect x="7" y="11" width="1" height="1" fill="#ffe568"/><rect x="8" y="11" width="1" height="1" fill="#ffe568"/><rect x="9" y="11" width="1" height="1" fill="#ff9824"/><rect x="2" y="12" width="1" height="1" fill="#ff9824"/><rect x="3" y="12" width="1" height="1" fill="#ffe568"/><rect x="4" y="12" width="1" height="1" fill="#ffe568"/><rect x="5" y="12" width="1" height="1" fill="#ffe568"/><rect x="6" y="12" width="1" height="1" fill="#ffe568"/><rect x="7" y="12" width="1" height="1" fill="#ffe568"/><rect x="8" y="12" width="1" height="1" fill="#ffe568"/><rect x="3" y="13" width="1" height="1" fill="#ffe568"/><rect x="4" y="13" width="1" height="1" fill="#ffe568"/><rect x="5" y="13" width="1" height="1" fill="#ffe568"/><rect x="6" y="13" width="1" height="1" fill="#ffe568"/><rect x="7" y="13" width="1" height="1" fill="#ffe568"/></g></svg><i className="streak-ember streak-ember-one" /><i className="streak-ember streak-ember-two" /><i className="streak-ember streak-ember-three" /></span>
          <div className="streak-info">
            <span className="streak-kicker">🔥 ON FIRE · {streakLeader.mode === 'solo' ? '1 VS 1' : streakLeader.mode === 'pairs' ? 'PAREJA 2 VS 2' : 'JUGADOR 2 VS 2'}</span>
            <strong className="streak-name">{streakLeader.row.label}</strong>
            <span className="streak-detail">Lleva {streakLeader.row.undefeatedRun} partidos sin perder. ¿Quién lo baja?</span>
          </div>
          <div className="streak-number" aria-hidden="true">{streakLeader.row.undefeatedRun}<small>SIN PERDER</small></div>
        </div>
      )}
      <div className="section-header">
        <h2 className="section-title">Líder actual</h2>
        <button type="button" className="section-link" onClick={onSeeRanking}>
          VER RANKING <ChevronRight size={14} />
        </button>
      </div>
      <LeaderboardHero row={leader} />

      <div className="section-header" style={{ marginTop: 28 }}>
        <h2 className="section-title">Últimos partidos</h2>
        <button type="button" className="section-link" onClick={onSeeMatches}>
          TODOS <ChevronRight size={14} />
        </button>
      </div>
      {recent.length === 0 ? (
        <div className="empty">
          <h3>Sin partidos registrados</h3>
        </div>
      ) : (
        <div className="matches">
          {recent.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              index={match.sortOrder}
              nameOf={nameOf}
              fresh={freshIds.includes(match.id)}
              onFreshDone={onFreshDone}
            />
          ))}
        </div>
      )}
    </>
  );
}
