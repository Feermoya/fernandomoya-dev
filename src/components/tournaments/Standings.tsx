import { Trophy } from 'lucide-react';
import type { StandingRow } from '@/lib/tournaments/types';

export function StandingList({
  rows,
  limit,
  onSeeAll,
}: {
  rows: StandingRow[];
  limit?: number;
  onSeeAll?: () => void;
}) {
  const visible = typeof limit === 'number' ? rows.slice(0, limit) : rows;
  return (
    <div className="aside-card">
      <div className="heading">
        <div>
          <span className="over">Tabla en vivo</span>
          <h3>El podio</h3>
        </div>
        <span className="icon-round">
          <Trophy size={16} />
        </span>
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: 20, color: '#8ea29a', fontSize: 12 }}>Todavía no hay partidos.</div>
      ) : (
        visible.map((row, i) => (
          <div key={row.key} className={`standing ${i === 0 ? 'first' : ''}`}>
            <div className="pos">{String(i + 1).padStart(2, '0')}</div>
            <div>
              <span className="who">{row.label}</span>
              <span className="record">
                {row.wins}V · {row.draws}E · {row.losses}D
              </span>
            </div>
            <div className="pts">
              {row.points}
              <small>PTS</small>
            </div>
          </div>
        ))
      )}
      {onSeeAll && (
        <button type="button" className="aside-footer" onClick={onSeeAll}>
          VER TABLA COMPLETA →
        </button>
      )}
    </div>
  );
}

export function FullBoard({
  rows,
  kind,
}: {
  rows: StandingRow[];
  kind: 'pairs' | 'pairsPlayer' | 'solo';
}) {
  if (!rows.length) {
    return (
      <div className="empty">
        <h3>La tabla espera</h3>
        <p>Jugá un partido de esta modalidad para estrenar el ranking.</p>
      </div>
    );
  }
  return (
    <div className="board">
      <div className="board-cols">
        <span>#</span>
        <span>{kind === 'pairs' ? 'Pareja' : 'Jugador'}</span>
        <span style={{ textAlign: 'center' }}>PJ</span>
        <span style={{ textAlign: 'center' }}>V</span>
        <span style={{ textAlign: 'center' }}>PTS</span>
      </div>
      {rows.map((row, i) => (
        <div key={row.key} className={`board-row ${i === 0 ? 'first' : ''}`}>
          <span className="position">{String(i + 1).padStart(2, '0')}</span>
          <span className="names">
            {row.label}
            <small>
              {row.draws} empates · {row.losses} derrotas
              {row.scoredMatches > 0
                ? ` · DG ${row.goalDiff > 0 ? '+' : ''}${row.goalDiff}`
                : ''}
            </small>
          </span>
          <span className="number">{row.played}</span>
          <span className="number">{row.wins}</span>
          <span className="points">{row.points}</span>
        </div>
      ))}
    </div>
  );
}
