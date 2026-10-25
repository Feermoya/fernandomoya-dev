import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Trophy, Users, X } from 'lucide-react';
import AwardsSheet from '@/components/tournaments/AwardsSheet';
import ChampionReveal from '@/components/tournaments/motion/ChampionReveal';
import { faceColor, initials } from '@/components/tournaments/face';
import HistoryView from '@/components/tournaments/HistoryView';
import GroupSettings from '@/components/tournaments/GroupSettings';
import LiveHome from '@/components/tournaments/LiveHome';
import MatchComposer from '@/components/tournaments/MatchComposer';
import MatchRow from '@/components/tournaments/MatchRow';
import { FullBoard, StandingList } from '@/components/tournaments/Standings';
import TournamentShell, { type FechaPage } from '@/components/tournaments/TournamentShell';
import { groupApi, type TournamentClientApi } from '@/lib/tournaments/clientApi';
import { canvasToPngBlob, renderNightCard, shareOrDownloadPng } from '@/lib/tournaments/export/cards';
import type {
  GroupState,
  MatchMode,
  MatchParticipant,
  SimplifiedOutcome,
  StandingRow,
  TournamentPlayer,
} from '@/lib/tournaments/types';

type Props = {
  publicId: string;
  onLeave: () => void;
  onRecover: () => void;
  onRevoke: () => void;
  onClaim: (secret: string) => void;
  onRenamed: (name: string) => void;
  onDeleted: () => void;
  api?: TournamentClientApi;
  adminBusy?: boolean;
  adminError?: string | null;
};

export default function GroupApp({
  publicId,
  onLeave,
  onRecover,
  onRevoke,
  onClaim,
  onRenamed,
  onDeleted,
  api: apiOverride,
  adminBusy = false,
  adminError = null,
}: Props) {
  const api = useMemo(() => apiOverride ?? groupApi(publicId), [apiOverride, publicId]);
  const [state, setState] = useState<GroupState | null>(null);
  const [page, setPage] = useState<FechaPage>('inicio');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [rematch, setRematch] = useState<{ mode: MatchMode; participants: MatchParticipant[] } | null>(
    null,
  );
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pairs' | 'solo'>('all');
  const [scope, setScope] = useState<'matchday' | 'allTime'>('matchday');
  const [secret, setSecret] = useState('');
  const [closing, setClosing] = useState(false);
  const [bestGoalId, setBestGoalId] = useState('');
  const [bestGoalNote, setBestGoalNote] = useState('');
  const seenMatchIds = useRef<Set<string> | null>(null);
  const [freshMatchIds, setFreshMatchIds] = useState<string[]>([]);
  const [ceremony, setCeremony] = useState<{
    matchdayName: string;
    winner: string;
    wins: number;
    points: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    const data = await api.state();
    setState(data.state);
    return data.state;
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.state();
        if (!cancelled) setState(data.state);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo cargar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!state) return;
    const ids = state.matches.map((match) => match.id);
    if (seenMatchIds.current === null) {
      seenMatchIds.current = new Set(ids);
      return;
    }
    const fresh = ids.filter((id) => !seenMatchIds.current!.has(id));
    for (const id of ids) seenMatchIds.current!.add(id);
    if (fresh.length) {
      setFreshMatchIds((current) => [...new Set([...current, ...fresh])]);
    }
  }, [state]);

  useEffect(() => {
    if (!state?.activeMatchday) return;
    const awards = state.awards.filter((a) => a.matchdayId === state.activeMatchday!.id);
    setBestGoalId(awards.find((a) => a.awardType === 'best_goal')?.playerId ?? '');
    setBestGoalNote(awards.find((a) => a.awardType === 'best_goal')?.note ?? '');
  }, [state?.activeMatchday?.id, state?.awards]);

  const nameOf = useMemo(() => {
    const map = new Map((state?.group.players ?? []).map((p) => [p.id, p.displayName]));
    return (id: string) => map.get(id) ?? id;
  }, [state?.group.players]);

  const activeMatches = useMemo(() => {
    if (!state?.activeMatchday) return [];
    return state.matches.filter((m) => m.matchdayId === state.activeMatchday!.id);
  }, [state]);

  function ping(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function startMatchday() {
    try {
      await api.createMatchday();
      await refresh();
      ping('Fecha iniciada');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar');
    }
  }

  async function saveMatch(payload: {
    mode: MatchMode;
    participants: MatchParticipant[];
    scoreHome?: number | null;
    scoreAway?: number | null;
    simplifiedOutcome?: SimplifiedOutcome | null;
  }) {
    if (!state?.activeMatchday) throw new Error('No hay fecha activa');
    await api.createMatch({ matchdayId: state.activeMatchday.id, ...payload });
    await refresh();
  }

  function finishSave() {
    setComposer(false);
    setRematch(null);
    setPage('inicio');
    ping('Resultado guardado. Ranking actualizado.');
  }

  function ackFresh(id: string) {
    setFreshMatchIds((prev) => prev.filter((item) => item !== id));
  }

  async function undo() {
    if (!state?.activeMatchday) return;
    try {
      await api.undoMatch(state.activeMatchday.id);
      await refresh();
      ping('Último partido deshecho');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo deshacer');
    }
  }

  async function persistAwards(
    payload: { bestGoalId: string; bestGoalNote: string },
    finish: boolean,
  ) {
    if (!state?.activeMatchday) return;
    setClosing(true);
    try {
      const awards = [];
      if (payload.bestGoalId) {
        awards.push({
          awardType: 'best_goal',
          playerId: payload.bestGoalId,
          note: payload.bestGoalNote || null,
        });
      }
      await api.saveAwards(state.activeMatchday.id, awards);
      if (finish) await api.patchMatchday(state.activeMatchday.id, 'finished');
      const next = await refresh();
      setAwardsOpen(false);
      setPage('inicio');
      if (finish) {
        const night = next.rankings.matchday;
        const winner = night.pairs[0] ?? night.solo[0] ?? null;
        setCeremony({
          matchdayName: next.activeMatchday?.name ?? 'Fecha',
          winner: [night.solo[0] ? `Individual: ${night.solo[0].label}` : null, night.pairs[0] ? `Pareja: ${night.pairs[0].label}` : null].filter(Boolean).join(' · ') || 'Sin ganador',
          wins: winner?.wins ?? 0,
          points: winner?.points ?? 0,
        });
      } else {
        ping('Premios guardados');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar los premios');
    } finally {
      setClosing(false);
    }
  }

  async function reopen() {
    if (!state?.activeMatchday) return;
    try {
      await api.patchMatchday(state.activeMatchday.id, 'live');
      await refresh();
      ping('Fecha reabierta');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reabrir');
    }
  }

  async function shareCard() {
    if (!state) return;
    const leader =
      state.rankings.matchday.pairs[0] ??
      state.rankings.matchday.pairsPlayer[0] ??
      state.rankings.matchday.solo[0];
    const canvas = renderNightCard({
      groupName: state.group.name,
      matchdayName: state.activeMatchday?.name ?? 'Fecha',
      winner: leader?.label ?? 'Sin ganador',
      wins: leader?.wins ?? 0,
      points: leader?.points ?? 0,
      matchesPlayed: activeMatches.length,
      players: state.group.players.filter((p) => p.active).length,
    });
    const blob = await canvasToPngBlob(canvas);
    await shareOrDownloadPng(blob, 'la-fecha-campeones.png', 'LA FECHA');
    ping('Tarjeta lista');
  }

  if (loading && !state) {
    return (
      <div className="lf" style={{ padding: 32 }}>
        <p className="hint">Cargando la fecha…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="lf" style={{ padding: 32 }}>
        <p className="error">{error ?? 'No se pudo cargar el grupo.'}</p>
        <button type="button" className="outline-mini" onClick={onLeave}>
          Volver
        </button>
      </div>
    );
  }

  const finished = state.activeMatchday?.status === 'finished';
  const canEdit = Boolean(state.isAdmin && state.activeMatchday && !finished);
  const rankings = state.rankings[scope];
  const leader = rankings.pairs[0] ?? rankings.solo[0] ?? null;
  const mvp = state.awards.find(
    (a) => a.matchdayId === state.activeMatchday?.id && a.awardType === 'mvp',
  );
  const live = !state.activeMatchday
    ? 'SIN FECHA'
    : finished
      ? 'FINALIZADA'
      : 'EN VIVO';

  const filtered = activeMatches
    .filter((m) => (filter === 'all' ? true : m.mode === filter))
    .slice()
    .sort((a, b) => b.sortOrder - a.sortOrder);

  const aside = (
    <>
      <StandingList
        rows={state.rankings.matchday.pairs}
        limit={4}
        onSeeAll={() => setPage('ranking')}
      />
      {page === 'inicio' && (
        <HomeExtras
          players={state.group.players}
          isAdmin={state.isAdmin}
          hasMatchday={Boolean(state.activeMatchday)}
          onAwards={() => setAwardsOpen(true)}
        />
      )}
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
    <div>
      <TournamentShell
        groupName={state.group.name}
        live={live}
        page={page}
        players={state.group.players}
        onPage={(next) => {
          setPage(next);
          window.scrollTo({ top: 0 });
        }}
        onShare={() => void shareCard()}
        onMenu={() => setMenuOpen(true)}
        aside={aside}
        main={
          <>
            {(error || adminError) && <p className="error">{error || adminError}</p>}
            {page === 'inicio' && (
              <>
                <LiveHome
                  matchday={state.activeMatchday}
                  finished={Boolean(finished)}
                  matches={activeMatches}
                  players={state.group.players}
                  leader={leader}
                  leaderWins={leader?.wins ?? 0}
                  isAdmin={state.isAdmin}
                  mvpName={mvp?.playerId ? nameOf(mvp.playerId) : undefined}
                  nameOf={nameOf}
                  onLoadMatch={() => {
                    setRematch(null);
                    setComposer(true);
                  }}
                  onStart={() => void startMatchday()}
                  onSeeRanking={() => setPage('ranking')}
                  onSeeMatches={() => setPage('partidos')}
                  onExport={() => void shareCard()}
                  onReopen={state.isAdmin && finished ? () => void reopen() : undefined}
                  onAwards={state.isAdmin ? () => setAwardsOpen(true) : undefined}
                  freshIds={freshMatchIds}
                  onFreshDone={ackFresh}
                />
                <div className="mobile-aside">
                  <HomeExtras
                    players={state.group.players}
                    isAdmin={state.isAdmin}
                    hasMatchday={Boolean(state.activeMatchday)}
                    onAwards={() => setAwardsOpen(true)}
                  />
                </div>
              </>
            )}
            {page === 'partidos' && (
              <MatchesPage
                matches={filtered}
                total={activeMatches.length}
                filter={filter}
                setFilter={setFilter}
                nameOf={nameOf}
                canEdit={canEdit}
                onNew={() => {
                  setRematch(null);
                  setComposer(true);
                }}
                onUndo={() => void undo()}
                freshIds={freshMatchIds}
                onFreshDone={ackFresh}
                onRematch={(mode, participants) => {
                  setRematch({ mode, participants });
                  setComposer(true);
                }}
              />
            )}
            {page === 'ranking' && (
              <RankingPage
                scope={scope}
                setScope={setScope}
                rankings={rankings}
              />
            )}
            {page === 'historial' && (
              <HistoryView matchdays={state.matchdays} matches={state.matches} />
            )}
          </>
        }
      />

      {ceremony && (
        <ChampionReveal
          matchdayName={ceremony.matchdayName}
          winner={ceremony.winner}
          wins={ceremony.wins}
          points={ceremony.points}
          onExport={() => void shareCard()}
          onClose={() => setCeremony(null)}
        />
      )}

      {composer && canEdit && (
        <MatchComposer
          players={state.group.players}
          publicId={publicId}
          matchdayId={state.activeMatchday?.id ?? ''}
          playedMatches={activeMatches}
          rematch={rematch}
          onClose={() => setComposer(false)}
          onSave={saveMatch}
          onSaved={finishSave}
        />
      )}

      {awardsOpen && state.isAdmin && state.activeMatchday && (
        <AwardsSheet
          players={state.group.players}
          bestGoalId={bestGoalId}
          bestGoalNote={bestGoalNote}
          busy={closing}
          onClose={() => setAwardsOpen(false)}
          onSave={(payload) => persistAwards(payload, false)}
          onFinish={(payload) => persistAwards(payload, true)}
        />
      )}

      {menuOpen && (
        <AdminMenu
          isAdmin={state.isAdmin}
          busy={adminBusy}
          secret={secret}
          setSecret={setSecret}
          onClose={() => setMenuOpen(false)}
          onLeave={onLeave}
          onRecover={onRecover}
          onRevoke={onRevoke}
          onClaim={onClaim}
          onEdit={
            state.isAdmin
              ? () => {
                  setMenuOpen(false);
                  setSettingsOpen(true);
                }
              : undefined
          }
          onStart={state.isAdmin && finished ? () => void startMatchday() : undefined}
        />
      )}

      {settingsOpen && state.isAdmin && (
        <GroupSettings
          publicId={publicId}
          api={api}
          groupName={state.group.name}
          players={state.group.players}
          matches={state.matches}
          onClose={() => setSettingsOpen(false)}
          onSaved={(name) => {
            setSettingsOpen(false);
            void refresh().then(() => {
              onRenamed(name);
              ping('Grupo actualizado');
            });
          }}
          onDeleted={onDeleted}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
    </MotionConfig>
  );
}

function HomeExtras({
  players,
  isAdmin,
  hasMatchday,
  onAwards,
}: {
  players: TournamentPlayer[];
  isAdmin: boolean;
  hasMatchday: boolean;
  onAwards: () => void;
}) {
  const active = players.filter((p) => p.active);
  return (
    <>
      {isAdmin && hasMatchday && (
        <div className="awards-banner">
          <span className="award-hd">
            <Trophy size={18} />
            <span className="small-lime" style={{ color: 'var(--gold)' }}>
              El tercer tiempo
            </span>
          </span>
          <h3>Que hablen los premios</h3>
          <p>El sistema calcula los campeones. Vos elegís el mejor gol.</p>
          <button type="button" className="linkish" onClick={onAwards}>
            CERRAR FECHA Y ELEGIR GOL →
          </button>
        </div>
      )}
      <div className="group-panel">
        <h3>La banda</h3>
        <p>
          {active.length} jugadores en el plantel.
        </p>
        <div className="roster">
          {players.map((p) => (
            <span key={p.id} className="player-tag" style={{ opacity: p.active ? 1 : 0.45 }}>
              <span className="player-face" style={{ background: faceColor(p.displayName) }}>
                {initials(p.displayName)}
              </span>
              {p.displayName}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function MatchesPage({
  matches,
  total,
  filter,
  setFilter,
  nameOf,
  canEdit,
  onNew,
  onUndo,
  onRematch,
  freshIds,
  onFreshDone,
}: {
  matches: GroupState['matches'];
  total: number;
  filter: 'all' | 'pairs' | 'solo';
  setFilter: (v: 'all' | 'pairs' | 'solo') => void;
  nameOf: (id: string) => string;
  canEdit: boolean;
  onNew: () => void;
  onUndo: () => void;
  onRematch: (mode: MatchMode, participants: MatchParticipant[]) => void;
  freshIds: string[];
  onFreshDone: (id: string) => void;
}) {
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">El marcador</div>
          <h1 className="page-title">Partidos</h1>
          <p className="page-desc">Cada resultado cambia la historia de la noche.</p>
        </div>
      </div>
      <div className="inner-hero">
        <div>
          <span className="small-lime">El marcador</span>
          <h2>Cada partido cuenta.</h2>
          <p>Cargá quién jugó y cómo terminó. La tabla se actualiza sola.</p>
        </div>
        {canEdit && (
          <button type="button" className="primary-btn" onClick={onNew}>
            CARGAR RESULTADO
          </button>
        )}
      </div>
      <div className="section-header">
        <h2 className="section-title">Partidos jugados ({total})</h2>
        {canEdit && (
          <button type="button" className="section-link" onClick={onUndo} disabled={!matches.length}>
            DESHACER ÚLTIMO
          </button>
        )}
      </div>
      <div className="tab-row">
        {(
          [
            ['all', 'Todos'],
            ['pairs', '2 vs 2'],
            ['solo', '1 vs 1'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`tab ${filter === id ? 'active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {matches.length === 0 ? (
        <div className="empty">
          <h3>Sin partidos</h3>
          <p>Todavía no hay encuentros registrados en esta modalidad.</p>
        </div>
      ) : (
        <div className="matches">
          {matches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              index={match.sortOrder}
              nameOf={nameOf}
              fresh={freshIds.includes(match.id)}
              onFreshDone={onFreshDone}
              actions={
                canEdit ? (
                  <button
                    type="button"
                    className="section-link"
                    onClick={() => onRematch(match.mode, match.participants)}
                  >
                    REVANCHA
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function RankingPage({
  scope,
  setScope,
  rankings,
}: {
  scope: 'matchday' | 'allTime';
  setScope: (v: 'matchday' | 'allTime') => void;
  rankings: GroupState['rankings']['matchday'];
}) {
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow">La competencia</div>
          <h1 className="page-title">Ranking</h1>
          <p className="page-desc">Los que mandan en la cancha.</p>
        </div>
      </div>
      <div className="tab-row" role="group" aria-label="Período del ranking">
        <button type="button" className={`tab ${scope === 'matchday' ? 'active' : ''}`} aria-pressed={scope === 'matchday'} onClick={() => setScope('matchday')}>Esta fecha</button>
        <button type="button" className={`tab ${scope === 'allTime' ? 'active' : ''}`} aria-pressed={scope === 'allTime'} onClick={() => setScope('allTime')}>Histórico</button>
      </div>
      <section aria-label="Ranking individual">
        <div className="section-header"><h2 className="section-title">Mejor jugador · 1 vs 1</h2></div>
        <FullBoard rows={rankings.solo} kind="solo" />
      </section>
      <section aria-label="Ranking de parejas" style={{ marginTop: 30 }}>
        <div className="section-header"><h2 className="section-title">Mejor pareja · 2 vs 2</h2></div>
        <FullBoard rows={rankings.pairs} kind="pairs" />
      </section>
      <p className="hint">Cada modalidad tiene su propia clasificación. El histórico incluye todas las fechas; la clasificación anual se incorporará por temporada.</p>
    </>
  );
}

function AdminMenu({
  isAdmin,
  busy,
  secret,
  setSecret,
  onClose,
  onLeave,
  onRecover,
  onRevoke,
  onClaim,
  onEdit,
  onStart,
}: {
  isAdmin: boolean;
  busy: boolean;
  secret: string;
  setSecret: (v: string) => void;
  onClose: () => void;
  onLeave: () => void;
  onRecover: () => void;
  onRevoke: () => void;
  onClaim: (secret: string) => void;
  onEdit?: () => void;
  onStart?: () => void;
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Acceso del organizador"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-top">
          <div>
            <div className="dialog-kicker">Acceso</div>
            <h2>{isAdmin ? 'Organizador' : 'Solo lectura'}</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          {isAdmin ? (
            <>
              <p className="hint" style={{ marginTop: 0 }}>
                Quien mira el enlace ve la tabla. Solo vos editás el grupo y cargás resultados.
              </p>
              {onEdit && (
                <button type="button" className="primary-btn form-submit" onClick={onEdit}>
                  EDITAR GRUPO
                </button>
              )}
              {onStart && (
                <button type="button" className="primary-btn form-submit" onClick={onStart}>
                  INICIAR NUEVA FECHA
                </button>
              )}
              <button
                type="button"
                className="outline-mini"
                style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
                disabled={busy}
                onClick={onRevoke}
              >
                REVOCAR ACCESO
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="admin-secret">Secreto de organizador</label>
                <input
                  id="admin-secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                className="primary-btn form-submit"
                disabled={busy || !secret.trim()}
                onClick={() => onClaim(secret.trim())}
              >
                ACTIVAR MODO ORGANIZADOR
              </button>
              <button
                type="button"
                className="outline-mini"
                style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
                onClick={onRecover}
              >
                RECUPERAR ACCESO
              </button>
            </>
          )}
          <button type="button" className="section-link" onClick={onLeave}>
            <Users size={14} /> SALIR DEL GRUPO
          </button>
        </div>
      </div>
    </div>
  );
}
