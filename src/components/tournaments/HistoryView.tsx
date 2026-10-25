import { Calendar } from 'lucide-react';
import type { TournamentMatch, TournamentMatchday } from '@/lib/tournaments/types';

export default function HistoryView({
  matchdays,
  matches,
  onOpen,
}: {
  matchdays: TournamentMatchday[];
  matches: TournamentMatch[];
  onOpen?: (id: string) => void;
}) {
  return (
    <>
      <div className="page-intro">
        <div>

          <h1 className="page-title">Historial</h1>

        </div>
      </div>
      <div className="inner-hero">
        <div>

          <h2>Fechas registradas: {matchdays.length}</h2>

        </div>

      </div>
      {matchdays.length === 0 ? (
        <div className="empty">
          <h3>Sin fechas registradas</h3>
          
        </div>
      ) : (
        matchdays.map((day) => {
          const count = matches.filter((m) => m.matchdayId === day.id).length;
          const closed = day.status === 'finished';
          return (
            <button
              key={day.id}
              type="button"
              className="past-night"
              onClick={() => onOpen?.(day.id)}
            >
              <div>
                <div className="date">
                  {day.name} · {closed ? 'FINALIZADA' : 'EN JUEGO'}
                </div>
                <h3>{count} partidos</h3>
                <div className="detail">
                  {closed ? 'Finalizada' : 'En juego'}
                </div>
              </div>
              <Calendar size={28} color="#c5f64c" />
            </button>
          );
        })
      )}
    </>
  );
}
