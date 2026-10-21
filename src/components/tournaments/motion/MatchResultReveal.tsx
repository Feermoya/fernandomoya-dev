import { useEffect, useRef } from 'react';
import type { SimplifiedOutcome } from '@/lib/tournaments/types';

type Props = {
  home: string[];
  away: string[];
  scoreHome: number | null;
  scoreAway: number | null;
  outcome: SimplifiedOutcome | null;
  onContinue: () => void;
};

function verdict(
  scoreHome: number | null,
  scoreAway: number | null,
  outcome: SimplifiedOutcome | null,
): { label: string; winners: string | null } {
  if (scoreHome != null && scoreAway != null) {
    if (scoreHome === scoreAway) return { label: 'EMPATE', winners: null };
    return { label: 'VICTORIA', winners: scoreHome > scoreAway ? 'home' : 'away' };
  }
  if (outcome === 'draw') return { label: 'EMPATE', winners: null };
  if (outcome === 'home' || outcome === 'away') return { label: 'VICTORIA', winners: outcome };
  return { label: 'RESULTADO', winners: null };
}

const itemWait = 1400;

export default function MatchResultReveal({
  home,
  away,
  scoreHome,
  scoreAway,
  outcome,
  onContinue,
}: Props) {
  const done = useRef(false);
  const result = verdict(scoreHome, scoreAway, outcome);
  const scored = scoreHome != null && scoreAway != null;
  const homeName = home.join(' + ');
  const awayName = away.join(' + ');
  const winnerNames =
    result.winners === 'home' ? homeName : result.winners === 'away' ? awayName : null;

  function finish() {
    if (done.current) return;
    done.current = true;
    onContinue();
  }

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const timer = window.setTimeout(() => finishRef.current(), itemWait);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="result-reveal is-on" aria-live="polite">
      <svg className="result-line" viewBox="0 0 320 8" aria-hidden>
        <line x1="0" y1="4" x2="320" y2="4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="result-teams">
        <span className={result.winners === 'home' ? 'is-winner' : ''}>{homeName}</span>
        <span className={result.winners === 'away' ? 'is-winner' : ''}>{awayName}</span>
      </div>
      <div className="result-score">
        {scored ? (
          <>
            <b>{scoreHome}</b>
            <i>:</i>
            <b>{scoreAway}</b>
          </>
        ) : (
          <b className="result-plain">{result.label === 'EMPATE' ? 'E' : 'V'}</b>
        )}
      </div>
      <p className="result-kicker">{result.label}</p>
      <p className="result-winners">
        {winnerNames ? `GANADORES · ${winnerNames}` : 'Los dos se llevaron un punto.'}
      </p>
      <button type="button" className="primary-btn form-submit" onClick={finish}>
        CONTINUAR
      </button>
    </div>
  );
}
