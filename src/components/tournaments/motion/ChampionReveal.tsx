type Props = {
  matchdayName: string;
  winner: string;
  wins: number;
  points: number;
  onExport: () => void;
  onClose: () => void;
};

export default function ChampionReveal({
  matchdayName,
  winner,
  wins,
  points,
  onExport,
  onClose,
}: Props) {
  return (
    <div className="overlay champion-overlay" role="dialog" aria-modal="true" aria-label="Campeones de la fecha">
      <div className="champion-card is-on">
        <svg className="champion-lines" viewBox="0 0 320 150" aria-hidden>
          <rect x="16" y="12" width="288" height="126" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
          <line className="champion-mid" x1="16" y1="75" x2="304" y2="75" stroke="#C5F64C" strokeWidth="1.4" />
          <circle cx="160" cy="75" r="26" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
        <svg className="champion-cup" viewBox="0 0 80 100" aria-hidden>
          <circle cx="40" cy="36" r="30" fill="none" stroke="#C5F64C" strokeWidth="1" opacity="0.7" />
          <path d="M24 16h32l-3 30c-1.6 10-7 16-13 16s-11.4-6-13-16L24 16z" fill="none" stroke="#F6F8EE" strokeWidth="1.6" />
          <path d="M24 22h-9c1 12 7 18 13 18" fill="none" stroke="#C5F64C" strokeWidth="1.4" />
          <path d="M56 22h9c-1 12-7 18-13 18" fill="none" stroke="#C5F64C" strokeWidth="1.4" />
          <path d="M40 62v14" stroke="#F6F8EE" strokeWidth="1.6" />
          <path d="M27 80h26" stroke="#C5F64C" strokeWidth="2" />
          <path d="M31 86h18" stroke="#F6F8EE" strokeWidth="1.4" />
        </svg>
        <p className="champion-date">{matchdayName}</p>
        <h2>CAMPEONES</h2>
        <p className="champion-names">{winner}</p>
        <p className="champion-stats">
          {wins} victorias · {points} puntos
        </p>
        <div className="champion-actions">
          <button type="button" className="primary-btn" onClick={onExport}>
            GUARDAR TARJETA
          </button>
          <button type="button" className="outline-mini" onClick={onClose}>
            SEGUIR
          </button>
        </div>
      </div>
    </div>
  );
}
