import { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';
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

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: lfEaseOut } },
};

export default function MatchResultReveal({
  home,
  away,
  scoreHome,
  scoreAway,
  outcome,
  onContinue,
}: Props) {
  const reduced = useReducedMotion() ?? false;
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

  return (
    <motion.div
      className="result-reveal"
      initial={reduced ? 'show' : 'hidden'}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.04 } },
      }}
      aria-live="polite"
    >
      <motion.svg className="result-line" viewBox="0 0 320 8" aria-hidden variants={item}>
        <motion.line
          x1="0"
          y1="4"
          x2="320"
          y2="4"
          stroke="currentColor"
          strokeWidth="1.5"
          initial={reduced ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reduced ? 0 : lfDuration.reveal, ease: lfEaseOut }}
        />
      </motion.svg>
      <motion.div className="result-teams" variants={item}>
        <span className={result.winners === 'home' ? 'is-winner' : ''}>{homeName}</span>
        <span className={result.winners === 'away' ? 'is-winner' : ''}>{awayName}</span>
      </motion.div>
      <motion.div className="result-score" variants={item}>
        {scored ? (
          <>
            <b>{scoreHome}</b>
            <i>:</i>
            <b>{scoreAway}</b>
          </>
        ) : (
          <b className="result-plain">{result.label === 'EMPATE' ? 'E' : 'V'}</b>
        )}
      </motion.div>
      <motion.p className="result-kicker" variants={item}>
        {result.label}
      </motion.p>
      {winnerNames ? (
        <motion.p className="result-winners" variants={item} onAnimationComplete={reduced ? undefined : finish}>
          GANADORES · {winnerNames}
        </motion.p>
      ) : (
        <motion.p className="result-winners" variants={item} onAnimationComplete={reduced ? undefined : finish}>
          Los dos se llevaron un punto.
        </motion.p>
      )}
      <button type="button" className="primary-btn form-submit" onClick={finish}>
        CONTINUAR
      </button>
    </motion.div>
  );
}
