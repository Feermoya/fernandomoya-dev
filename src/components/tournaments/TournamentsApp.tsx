import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Copy, Share2, ShieldCheck, Trophy } from 'lucide-react';
import {
  extractPublicIdFromInput,
  parsePlayerNamesInput,
  TOURNAMENT_LIMITS,
} from '@/lib/tournaments/validate';
import {
  forgetRecentGroup,
  groupPath,
  readRecentGroups,
  rememberRecentGroup,
  type RecentTournamentGroup,
} from '@/lib/tournaments/recentGroups';
import type { TournamentGroup } from '@/lib/tournaments/types';
import GroupApp from '@/components/tournaments/GroupApp';
import '@/styles/tournaments.css';

type Screen =
  | { id: 'welcome' }
  | { id: 'create-name' }
  | { id: 'create-players'; name: string }
  | {
      id: 'credentials';
      group: TournamentGroup;
      adminSecret: string;
      recoveryKey: string;
      viewUrl: string;
    }
  | { id: 'enter' }
  | { id: 'recover'; publicId: string; groupName: string }
  | { id: 'group'; group: TournamentGroup; isAdmin: boolean };

type Props = {
  initialPublicId?: string | null;
  initialGroup?: TournamentGroup | null;
  initialIsAdmin?: boolean;
  configured?: boolean;
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || (body && 'ok' in body && body.ok === false)) {
    throw new Error(
      (body && 'error' in body && body.error) || 'Algo salió mal. Probá de nuevo.',
    );
  }
  return body;
}

export default function TournamentsApp({
  initialPublicId = null,
  initialGroup = null,
  initialIsAdmin = false,
  configured = true,
}: Props) {
  const [screen, setScreen] = useState<Screen>(() => {
    if (initialGroup) {
      return { id: 'group', group: initialGroup, isAdmin: initialIsAdmin };
    }
    return { id: 'welcome' };
  });
  const [recent, setRecent] = useState<RecentTournamentGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [groupName, setGroupName] = useState('');
  const [playersDraft, setPlayersDraft] = useState('');
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [enterValue, setEnterValue] = useState(initialPublicId ?? '');
  const [adminSecretInput, setAdminSecretInput] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');

  useEffect(() => {
    setRecent(readRecentGroups());
  }, []);

  useEffect(() => {
    if (initialGroup) {
      rememberRecentGroup({ publicId: initialGroup.publicId, name: initialGroup.name });
      setRecent(readRecentGroups());
    }
  }, [initialGroup]);

  const parsedPaste = useMemo(() => parsePlayerNamesInput(playersDraft), [playersDraft]);

  function goWelcome() {
    setError(null);
    setScreen({ id: 'welcome' });
  }

  async function openGroup(publicId: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await apiJson<{
        ok: true;
        group: TournamentGroup;
        isAdmin: boolean;
      }>(`/torneos/api/groups/${encodeURIComponent(publicId)}`);
      rememberRecentGroup({ publicId: data.group.publicId, name: data.group.name });
      setRecent(readRecentGroups());
      setScreen({ id: 'group', group: data.group, isAdmin: data.isAdmin });
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/torneos/g/')) {
        window.history.pushState({}, '', groupPath(data.group.publicId));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el grupo.');
    } finally {
      setBusy(false);
    }
  }

  async function createGroup() {
    setBusy(true);
    setError(null);
    try {
      const data = await apiJson<{
        ok: true;
        group: TournamentGroup;
        adminSecret: string;
        recoveryKey: string;
        viewUrl: string;
      }>('/torneos/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName, players: playerList }),
      });

      // Claim admin cookie immediately
      await apiJson(`/torneos/api/groups/${encodeURIComponent(data.group.publicId)}/claim-admin`, {
        method: 'POST',
        body: JSON.stringify({ adminSecret: data.adminSecret }),
      });

      rememberRecentGroup({ publicId: data.group.publicId, name: data.group.name });
      setRecent(readRecentGroups());
      setScreen({
        id: 'credentials',
        group: data.group,
        adminSecret: data.adminSecret,
        recoveryKey: data.recoveryKey,
        viewUrl: data.viewUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el grupo.');
    } finally {
      setBusy(false);
    }
  }

  async function claimAdmin(publicId: string, secret: string) {
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/torneos/api/groups/${encodeURIComponent(publicId)}/claim-admin`, {
        method: 'POST',
        body: JSON.stringify({ adminSecret: secret }),
      });
      await openGroup(publicId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Secreto inválido.');
      setBusy(false);
    }
  }

  async function recoverAdmin(publicId: string, recoveryKey: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await apiJson<{
        ok: true;
        adminSecret: string;
        recoveryKey?: string;
      }>(`/torneos/api/groups/${encodeURIComponent(publicId)}/recover-admin`, {
        method: 'POST',
        body: JSON.stringify({ recoveryKey }),
      });
      setScreen({
        id: 'credentials',
        group:
          screen.id === 'recover'
            ? {
                id: '',
                publicId,
                name: screen.groupName,
                createdAt: '',
                players: [],
              }
            : screen.id === 'group'
              ? screen.group
              : {
                  id: '',
                  publicId,
                  name: 'Grupo',
                  createdAt: '',
                  players: [],
                },
        adminSecret: data.adminSecret,
        recoveryKey: data.recoveryKey ?? recoveryKey,
        viewUrl:
          typeof window !== 'undefined'
            ? `${window.location.origin}${groupPath(publicId)}`
            : groupPath(publicId),
      });
      // Refresh full group after recover
      const full = await apiJson<{ ok: true; group: TournamentGroup; isAdmin: boolean }>(
        `/torneos/api/groups/${encodeURIComponent(publicId)}`,
      );
      setScreen({
        id: 'credentials',
        group: full.group,
        adminSecret: data.adminSecret,
        recoveryKey: data.recoveryKey ?? recoveryKey,
        viewUrl:
          typeof window !== 'undefined'
            ? `${window.location.origin}${groupPath(publicId)}`
            : groupPath(publicId),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo recuperar el acceso.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeAdmin(publicId: string) {
    if (!window.confirm('¿Revocar el acceso de organizador y generar uno nuevo?')) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiJson<{
        ok: true;
        adminSecret: string;
      }>(`/torneos/api/groups/${encodeURIComponent(publicId)}/revoke-admin`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const full = await apiJson<{ ok: true; group: TournamentGroup; isAdmin: boolean }>(
        `/torneos/api/groups/${encodeURIComponent(publicId)}`,
      );
      setScreen({
        id: 'credentials',
        group: full.group,
        adminSecret: data.adminSecret,
        recoveryKey: '',
        viewUrl:
          typeof window !== 'undefined'
            ? `${window.location.origin}${groupPath(publicId)}`
            : groupPath(publicId),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo revocar.');
    } finally {
      setBusy(false);
    }
  }

  function addPlayersFromDraft() {
    const next = [...playerList];
    const seen = new Set(next.map((n) => n.toLocaleLowerCase('es')));
    for (const name of parsedPaste) {
      const key = name.toLocaleLowerCase('es');
      if (seen.has(key)) continue;
      if (next.length >= TOURNAMENT_LIMITS.maxPlayers) break;
      seen.add(key);
      next.push(name);
    }
    setPlayerList(next);
    setPlayersDraft('');
  }

  function removePlayer(name: string) {
    setPlayerList((prev) => prev.filter((p) => p !== name));
  }

  return (
    <div className="tournaments-app-shell lf">
      {screen.id === 'group' ? (
        <GroupApp
          publicId={screen.group.publicId}
          onLeave={goWelcome}
          onRecover={() => {
            setRecoveryInput('');
            setError(null);
            setScreen({
              id: 'recover',
              publicId: screen.group.publicId,
              groupName: screen.group.name,
            });
          }}
          onRevoke={() => void revokeAdmin(screen.group.publicId)}
          onClaim={(secret) => void claimAdmin(screen.group.publicId, secret)}
          onRenamed={(name) => {
            rememberRecentGroup({ publicId: screen.group.publicId, name });
            setRecent(readRecentGroups());
            setScreen((current) =>
              current.id === 'group' ? { ...current, group: { ...current.group, name } } : current,
            );
          }}
          onDeleted={() => {
            forgetRecentGroup(screen.group.publicId);
            window.location.assign('/torneos');
          }}
          adminBusy={busy}
          adminError={error}
        />
      ) : (
      <div className="tg-frame">
        {screen.id === 'welcome' && (
          <WelcomeView
            configured={configured}
            recent={recent}
            busy={busy}
            error={error}
            onCreate={() => {
              setError(null);
              setGroupName('');
              setPlayerList([]);
              setPlayersDraft('');
              setScreen({ id: 'create-name' });
            }}
            onEnter={() => {
              setError(null);
              setEnterValue('');
              setScreen({ id: 'enter' });
            }}
            onContinue={(id) => void openGroup(id)}
          />
        )}

        {screen.id === 'create-name' && (
          <section className="mx-auto flex max-w-lg flex-col gap-6 py-4">
            <BackButton onClick={goWelcome} />
            <header className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-[var(--tg-accent)]">Paso 1 de 2</p>
              <h1 className="tg-brand">Nombre del grupo</h1>
              <p className="tg-lead">Ejemplo: Los Pibes del FIFA.</p>
            </header>
            <label className="tg-field">
              <span className="tg-label">Nombre</span>
              <input
                className="tg-input"
                value={groupName}
                maxLength={TOURNAMENT_LIMITS.groupNameMax}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Los Pibes del FIFA"
                autoFocus
              />
            </label>
            {error && <p className="tg-error">{error}</p>}
            <button
              type="button"
              className="tg-btn tg-btn-primary"
              disabled={groupName.trim().length < TOURNAMENT_LIMITS.groupNameMin || busy}
              onClick={() => {
                setError(null);
                setScreen({ id: 'create-players', name: groupName.trim() });
              }}
            >
              Continuar
            </button>
          </section>
        )}

        {screen.id === 'create-players' && (
          <section className="mx-auto flex max-w-lg flex-col gap-6 py-4">
            <BackButton onClick={() => setScreen({ id: 'create-name' })} />
            <header className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-[var(--tg-accent)]">Paso 2 de 2</p>
              <h1 className="tg-brand">Jugadores</h1>
              <p className="tg-lead">
                Agregá nombres uno a uno o pegá una lista separada por comas o saltos de línea.
              </p>
            </header>

            <label className="tg-field">
              <span className="tg-label">Pegar lista</span>
              <textarea
                className="tg-textarea"
                value={playersDraft}
                onChange={(e) => setPlayersDraft(e.target.value)}
                placeholder={'Messi\nNico\nJuan\nFede'}
              />
            </label>
            <button
              type="button"
              className="tg-btn tg-btn-secondary"
              disabled={!parsedPaste.length}
              onClick={addPlayersFromDraft}
            >
              Agregar {parsedPaste.length || ''} nombres
            </button>

            {playerList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {playerList.map((name) => (
                  <span key={name} className="tg-chip">
                    {name}
                    <button type="button" aria-label={`Quitar ${name}`} onClick={() => removePlayer(name)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p className="tg-nav-hint">
              {playerList.length} / {TOURNAMENT_LIMITS.maxPlayers} jugadores · mínimo{' '}
              {TOURNAMENT_LIMITS.minPlayers}
            </p>

            {error && <p className="tg-error">{error}</p>}

            <button
              type="button"
              className="tg-btn tg-btn-primary"
              disabled={playerList.length < TOURNAMENT_LIMITS.minPlayers || busy || !configured}
              onClick={() => void createGroup()}
            >
              {busy ? 'Creando…' : 'Crear grupo'}
            </button>
          </section>
        )}

        {screen.id === 'credentials' && (
          <CredentialsView
            group={screen.group}
            adminSecret={screen.adminSecret}
            recoveryKey={screen.recoveryKey}
            viewUrl={screen.viewUrl}
            onContinue={() =>
              setScreen({ id: 'group', group: screen.group, isAdmin: true })
            }
          />
        )}

        {screen.id === 'enter' && (
          <section className="mx-auto flex max-w-lg flex-col gap-6 py-4">
            <BackButton onClick={goWelcome} />
            <header className="flex flex-col gap-2">
              <h1 className="tg-brand">Entrar a mi grupo</h1>
              <p className="tg-lead">Pegá el enlace o el código del grupo.</p>
            </header>
            <label className="tg-field">
              <span className="tg-label">Enlace o código</span>
              <input
                className="tg-input"
                value={enterValue}
                onChange={(e) => setEnterValue(e.target.value)}
                placeholder="https://…/torneos/g/…"
                autoFocus
              />
            </label>
            <label className="tg-field">
              <span className="tg-label">Código de organizador (opcional)</span>
              <input
                className="tg-input"
                value={adminSecretInput}
                onChange={(e) => setAdminSecretInput(e.target.value)}
                placeholder="6 dígitos para administrar (o tu código anterior)"
                autoComplete="off"
              />
            </label>
            {error && <p className="tg-error">{error}</p>}
            <button
              type="button"
              className="tg-btn tg-btn-primary"
              disabled={busy}
              onClick={() => {
                const id = extractPublicIdFromInput(enterValue);
                if (!id) {
                  setError('No reconocí el enlace o código.');
                  return;
                }
                if (adminSecretInput.trim()) {
                  void claimAdmin(id, adminSecretInput.trim());
                } else {
                  void openGroup(id);
                }
              }}
            >
              {busy ? 'Abriendo…' : 'Entrar'}
            </button>
          </section>
        )}

        {screen.id === 'recover' && (
          <section className="mx-auto flex max-w-lg flex-col gap-6 py-4">
            <BackButton
              onClick={() =>
                void openGroup(screen.publicId).then(() => undefined)
              }
            />
            <header className="flex flex-col gap-2">
              <h1 className="tg-brand">Recuperar acceso</h1>
              <p className="tg-lead">
                Usá la clave de recuperación que guardaste al crear{' '}
                <strong>{screen.groupName}</strong>. Se generará un nuevo secreto de
                organizador.
              </p>
            </header>
            <label className="tg-field">
              <span className="tg-label">Clave de recuperación</span>
              <input
                className="tg-input"
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            {error && <p className="tg-error">{error}</p>}
            <button
              type="button"
              className="tg-btn tg-btn-primary"
              disabled={busy || !recoveryInput.trim()}
              onClick={() => void recoverAdmin(screen.publicId, recoveryInput.trim())}
            >
              {busy ? 'Recuperando…' : 'Generar nuevo acceso'}
            </button>
          </section>
        )}

      </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="tg-btn tg-btn-ghost w-auto self-start px-0" onClick={onClick}>
      <ChevronLeft size={18} aria-hidden />
      Volver
    </button>
  );
}

function WelcomeView({
  configured,
  recent,
  busy,
  error,
  onCreate,
  onEnter,
  onContinue,
}: {
  configured: boolean;
  recent: RecentTournamentGroup[];
  busy: boolean;
  error: string | null;
  onCreate: () => void;
  onEnter: () => void;
  onContinue: (publicId: string) => void;
}) {
  const latest = recent[0];

  return (
    <section className="mx-auto flex min-h-[85dvh] max-w-2xl flex-col justify-center gap-8 py-8">
      <div className="flex flex-col gap-4">
        <p className="tg-kicker">
          <Trophy size={14} aria-hidden />
          La Fecha
        </p>
        <h1 className="tg-brand">
          Hoy se <span>juega.</span>
        </h1>
        <p className="tg-lead">
          Armá el grupo, cargá partidos 1 vs. 1 y 2 vs. 2, y compartí rankings y premios. Sin
          cuentas ni emails.
        </p>
      </div>

      {!configured && (
        <div className="tg-panel">
          <p className="text-sm text-[var(--tg-muted)]">
            Backend aún no configurado. Necesitás{' '}
            <code className="text-[var(--tg-accent)]">SUPABASE_URL</code> y{' '}
            <code className="text-[var(--tg-accent)]">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
            (las del panel) y ejecutar la migración{' '}
            <code className="text-[var(--tg-accent)]">tournament_*</code>.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 tg-actions-row">
        <button
          type="button"
          className="tg-btn tg-btn-primary"
          onClick={onCreate}
          disabled={!configured || busy}
        >
          Crear torneo
        </button>
        <button type="button" className="tg-btn tg-btn-secondary" onClick={onEnter} disabled={busy}>
          Entrar a mi grupo
        </button>
        <a className="tg-btn tg-btn-secondary" href="/torneos/probar">
          Probar sin crear grupo
        </a>
      </div>

      {latest && (
        <button
          type="button"
          className="tg-btn tg-btn-secondary"
          disabled={busy}
          onClick={() => onContinue(latest.publicId)}
        >
          Continuar mi grupo · {latest.name}
        </button>
      )}

      {recent.length > 1 && (
        <div className="tg-panel flex flex-col gap-3">
          <p className="text-sm font-semibold text-[var(--tg-muted)]">Recientes en este dispositivo</p>
          <ul className="flex flex-col gap-2">
            {recent.slice(0, 5).map((g) => (
              <li key={g.publicId}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-[var(--tg-line)] bg-[var(--tg-surface)] px-4 py-3 text-left font-semibold hover:bg-[var(--tg-surface-2)]"
                  onClick={() => onContinue(g.publicId)}
                  disabled={busy}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="tg-error">{error}</p>}
    </section>
  );
}

function CredentialsView({
  group,
  adminSecret,
  recoveryKey,
  viewUrl,
  onContinue,
}: {
  group: TournamentGroup;
  adminSecret: string;
  recoveryKey: string;
  viewUrl: string;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState('');
  const [saved, setSaved] = useState(false);
  const privateInfo = `LA FECHA · ${group.name}\\nAcceso organizador: ${adminSecret}\\n${recoveryKey ? `Recuperación: ${recoveryKey}\\n` : 'Conservá tu clave de recuperación anterior.\\n'}Enlace: ${viewUrl}`;
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied('No se pudo copiar. Seleccioná el texto manualmente.');
    }
  }
  return (
    <section className="mx-auto flex max-w-lg flex-col gap-6 py-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-[var(--tg-accent)]">Grupo listo</p>
        <h1 className="tg-brand">{group.name}</h1>
        <p className="tg-lead">
          Compartí el enlace con tus amigos y guardá tus claves privadas antes de continuar.
        </p>
      </header>

      <div className="tg-panel flex flex-col gap-3">
        <p className="tg-label">1. Compartí con tus amigos</p>
        <p className="tg-nav-hint">Con este enlace pueden entrar y ver los resultados. No necesitan contraseña.</p>
        <p className="tg-secret-box" style={{ overflowWrap: 'anywhere' }}>{viewUrl}</p>
        <button type="button" className="tg-btn tg-btn-secondary" onClick={() => void copy(viewUrl, 'Enlace copiado')}><Copy size={16} /> Copiar enlace</button>
        <a className="tg-btn tg-btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(`Entrá a nuestro grupo de LA FECHA: ${viewUrl}`)}`} target="_blank" rel="noopener noreferrer"><Share2 size={16} /> Compartir por WhatsApp</a>
      </div>
      <div className="tg-panel flex flex-col gap-3">
        <p className="tg-label">2. Guardá tus claves privadas</p>
        <p className="tg-nav-hint">No compartas estos datos en el grupo. Solo los necesita quien organiza los partidos.</p>
        <div>
          <p className="tg-label">Código de organizador</p>
          <p className="tg-nav-hint">Permite cargar partidos, editar y cerrar fechas.</p>
          <p className="tg-secret-box">{adminSecret}</p>
        </div>
        {recoveryKey ? (
          <div>
            <p className="tg-label">Clave de recuperación</p>
            <p className="tg-nav-hint">Sirve para recuperar el control si perdés el código de organizador.</p>
            <p className="tg-secret-box" style={{ overflowWrap: 'anywhere' }}>{recoveryKey}</p>
          </div>
        ) : <p className="tg-nav-hint">Tu clave de recuperación anterior sigue vigente.</p>}
        <button type="button" className="tg-btn tg-btn-secondary" onClick={() => void copy(privateInfo, 'Datos privados copiados')}><Copy size={16} /> Copiar todos mis datos privados</button>
      </div>
      {copied && <p className="tg-nav-hint" role="status">{copied}</p>}
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        <span>Guardé mi código de organizador y mi clave de recuperación en un lugar privado.</span>
      </label>
      <button type="button" className="tg-btn tg-btn-primary" disabled={!saved} onClick={onContinue}>
        <ShieldCheck size={17} /> Ir al grupo
      </button>
    </section>
  );
}

