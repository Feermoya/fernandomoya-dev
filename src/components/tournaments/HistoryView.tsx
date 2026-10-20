import { Calendar, Trophy } from 'lucide-react';
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
          <div className="eyebrow">Estadísticas y recuerdos</div>
          <h1 className="page-title">Las noches quedan</h1>
          <p className="page-desc">Resultados, campeones y premios de cada fecha.</p>
        </div>
      </div>
      <div className="inner-hero">
        <div>
          <span className="small-lime">Historial del grupo</span>
          <h2>
            Cada fecha
            <br />
            deja marca.
          </h2>
          <p>Las noches pasan. Los resultados quedan.</p>
        </div>
        <Trophy size={48} color="#ffcc75" />
      </div>
      {matchdays.length === 0 ? (
        <div className="empty">
          <h3>Recién empieza</h3>
          <p>Cuando termines una fecha, vas a tener el primer registro acá.</p>
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
                <h3>{closed ? 'Noche cerrada' : 'La noche sigue'}</h3>
                <div className="detail">
                  {count} partidos · {closed ? 'Fecha cerrada' : 'En vivo'}
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
