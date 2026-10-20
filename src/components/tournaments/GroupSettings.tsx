import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { groupApi, type TournamentClientApi } from '@/lib/tournaments/clientApi';
import type { TournamentMatch, TournamentPlayer } from '@/lib/tournaments/types';
import { normalizeGroupName, normalizePlayerName, TOURNAMENT_LIMITS } from '@/lib/tournaments/validate';

type DraftPlayer = {
  key: string;
  id?: string;
  displayName: string;
  active: boolean;
  played: boolean;
};

type Props = {
  publicId: string;
  api?: TournamentClientApi;
  groupName: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  onClose: () => void;
  onSaved: (name: string) => void;
  onDeleted: () => void;
};

export default function GroupSettings({
  publicId,
  api: apiOverride,
  groupName,
  players,
  matches,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const api = useMemo(() => apiOverride ?? groupApi(publicId), [apiOverride, publicId]);
  const [name, setName] = useState(groupName);
  const [rows, setRows] = useState<DraftPlayer[]>(() => {
    const played = new Set<string>();
    for (const match of matches) {
      for (const participant of match.participants) played.add(participant.playerId);
    }
    return players.map((player) => ({
      key: player.id,
      id: player.id,
      displayName: player.displayName,
      active: player.active,
      played: played.has(player.id),
    }));
  });
  const [addition, setAddition] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [danger, setDanger] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addPlayer() {
    const displayName = normalizePlayerName(addition);
    if (!displayName) return;
    const key = displayName.toLocaleLowerCase('es');
    if (rows.some((row) => row.displayName.toLocaleLowerCase('es') === key)) {
      setError(`Ya está ${displayName}.`);
      return;
    }
    if (rows.filter((row) => row.active).length >= TOURNAMENT_LIMITS.maxPlayers) {
      setError(`Máximo ${TOURNAMENT_LIMITS.maxPlayers} jugadores.`);
      return;
    }
    setRows((current) => [
      ...current,
      { key: `new-${key}-${current.length}`, displayName, active: true, played: false },
    ]);
    setAddition('');
    setError(null);
  }

  function draftRows() {
    const pending = normalizePlayerName(addition);
    if (!pending) return rows;
    const key = pending.toLocaleLowerCase('es');
    if (rows.some((row) => normalizePlayerName(row.displayName).toLocaleLowerCase('es') === key)) {
      return rows;
    }
    return [
      ...rows,
      { key: `pending-${key}`, displayName: pending, active: true, played: false },
    ];
  }

  async function save() {
    const nextName = normalizeGroupName(name);
    const nextRows = draftRows();
    if (nextName.length < TOURNAMENT_LIMITS.groupNameMin) {
      setError('El nombre del grupo es demasiado corto.');
      return;
    }
    if (nextRows.some((row) => !normalizePlayerName(row.displayName))) {
      setError('El nombre del jugador no puede quedar vacío.');
      return;
    }
    const active = nextRows.filter((row) => row.active);
    if (active.length < TOURNAMENT_LIMITS.minPlayers) {
      setError('Dejá al menos dos jugadores en el plantel, o eliminá el grupo.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (nextName !== groupName) await api.renameGroup(nextName);
      const kept = new Set(nextRows.flatMap((row) => (row.id ? [row.id] : [])));
      await api.updatePlayers({
        updates: nextRows.flatMap((row) =>
          row.id
            ? [{ id: row.id, displayName: normalizePlayerName(row.displayName), active: row.active }]
            : [],
        ),
        additions: nextRows.flatMap((row) => (row.id ? [] : [normalizePlayerName(row.displayName)])),
        removals: players.flatMap((player) => (kept.has(player.id) ? [] : [player.id])),
      });
      onSaved(nextName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  async function removeGroup() {
    if (normalizeGroupName(confirmName) !== normalizeGroupName(groupName)) {
      setError('Escribí el nombre del grupo para confirmar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.deleteGroup(confirmName);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Editar grupo"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-top">
          <div>
            <div className="dialog-kicker">Organizador</div>
            <h2>Editar grupo</h2>
          </div>
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          {error && <p className="error">{error}</p>}
          <div className="form-group">
            <label htmlFor="group-name">Nombre</label>
            <input
              id="group-name"
              value={name}
              maxLength={TOURNAMENT_LIMITS.groupNameMax}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <p className="step-label">Plantel</p>
          <div className="roster-edit">
            {rows.map((row) => (
              <div className="roster-row" key={row.key}>
                <input
                  aria-label={`Nombre de ${row.displayName || 'jugador'}`}
                  value={row.displayName}
                  maxLength={TOURNAMENT_LIMITS.playerNameMax}
                  onChange={(event) =>
                    setRows((current) =>
                      current.map((item) =>
                        item.key === row.key ? { ...item, displayName: event.target.value } : item,
                      ),
                    )
                  }
                />
                {row.played ? (
                  <button
                    type="button"
                    className="outline-mini"
                    onClick={() =>
                      setRows((current) =>
                        current.map((item) =>
                          item.key === row.key ? { ...item, active: !item.active } : item,
                        ),
                      )
                    }
                  >
                    {row.active ? 'FUERA' : 'SUMAR'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="outline-mini"
                    onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  >
                    QUITAR
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="hint">Si ya jugó, queda en el historial. Solo lo podés sacar del plantel.</p>
          <div className="roster-row" style={{ marginTop: 14 }}>
            <input
              aria-label="Nuevo jugador"
              placeholder="Sumar jugador"
              value={addition}
              maxLength={TOURNAMENT_LIMITS.playerNameMax}
              onChange={(event) => setAddition(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addPlayer();
                }
              }}
            />
            <button type="button" className="outline-mini" onClick={addPlayer}>
              SUMAR
            </button>
          </div>
          <button
            type="button"
            className="primary-btn form-submit"
            disabled={busy}
            onClick={() => void save()}
          >
            GUARDAR CAMBIOS
          </button>

          <div className="danger-zone">
            {!danger ? (
              <button type="button" className="danger-btn" onClick={() => setDanger(true)}>
                ELIMINAR GRUPO
              </button>
            ) : (
              <>
                <p className="hint">
                  Se borra el enlace, las fechas y los partidos. Escribí <strong>{groupName}</strong> para
                  confirmar.
                </p>
                <div className="form-group">
                  <label htmlFor="confirm-delete">Nombre del grupo</label>
                  <input
                    id="confirm-delete"
                    value={confirmName}
                    onChange={(event) => setConfirmName(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  className="danger-btn"
                  disabled={busy || normalizeGroupName(confirmName) !== normalizeGroupName(groupName)}
                  onClick={() => void removeGroup()}
                >
                  ELIMINAR PARA SIEMPRE
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
