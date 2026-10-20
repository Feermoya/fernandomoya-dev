import { Trophy } from 'lucide-react';
import type { StandingRow } from '@/lib/tournaments/types';

export default function LeaderboardHero({ row }: { row: StandingRow | null }) {
  if (!row) {
    return (
      <div className="empty">
        <Trophy size={36} />
        <h3>El trono está vacío</h3>
        <p>La primera pareja ganadora aparece cuando cargues un partido.</p>
      </div>
    );
  }
  const parts = row.label.split(' + ');
  return (
    <div className="leader-card">
      <div>
        <div className="leader-label">
          <Trophy size={14} /> Pareja líder
        </div>
        <div className="leader-names">
          {parts.map((part, i) => (
            <span key={part}>
              {i > 0 ? <em> + </em> : null}
              {part}
            </span>
          ))}
        </div>
        <div className="leader-desc">
          <b>{row.wins} victorias</b>
          {' · '}
          {row.losses === 0 ? 'Sin derrotas en estos partidos' : `${row.losses} derrotas`}
          {' · '}
          {row.points} puntos
        </div>
      </div>
      <div className="leader-medallion" aria-hidden>
        <Trophy size={36} />
      </div>
    </div>
  );
}
