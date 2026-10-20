import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';
import type { TournamentMatch } from '@/lib/tournaments/types';

export function matchSides(match: TournamentMatch, nameOf: (id: string) => string) {
  const side = (which: 'home' | 'away') =>
    match.participants
      .filter((p) => p.side === which)
      .sort((a, b) => a.slot - b.slot)
      .map((p) => nameOf(p.playerId));
  return { home: side('home'), away: side('away') };
}

export function matchScoreView(match: TournamentMatch) {
  if (match.scoreHome != null && match.scoreAway != null) {
    return {
      a: String(match.scoreHome),
      b: String(match.scoreAway),
      aWin: match.scoreHome > match.scoreAway,
      bWin: match.scoreAway > match.scoreHome,
      context:
        match.scoreHome === match.scoreAway
          ? 'EMPATE'
          : match.scoreHome > match.scoreAway
            ? 'GANÓ LOCAL'
            : 'GANÓ VISITA',
    };
  }
  const o = match.simplifiedOutcome;
  return {
    a: o === 'home' ? 'V' : o === 'away' ? 'D' : 'E',
    b: o === 'away' ? 'V' : o === 'home' ? 'D' : 'E',
    aWin: o === 'home',
    bWin: o === 'away',
    context: o === 'draw' ? 'EMPATE' : o === 'home' ? 'GANÓ LOCAL' : 'GANÓ VISITA',
  };
}

export default function MatchRow({
  match,
  index,
  nameOf,
  actions,
  fresh = false,
  onFreshDone,
}: {
  match: TournamentMatch;
  index: number;
  nameOf: (id: string) => string;
  actions?: ReactNode;
  fresh?: boolean;
  onFreshDone?: (id: string) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const enter = fresh && !reduced;
  const { home, away } = matchSides(match, nameOf);
  const score = matchScoreView(match);
  return (
    <motion.div
      className="match-slot"
      initial={enter ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: lfDuration.row, ease: lfEaseOut }}
      onAnimationComplete={() => {
        if (fresh) onFreshDone?.(match.id);
      }}
    >
      <article className="match">
        {enter && (
          <motion.span
            className="match-fresh-line"
            aria-hidden
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1, opacity: [1, 1, 0] }}
            transition={{ duration: lfDuration.row, ease: lfEaseOut, times: [0, 0.45, 1] }}
          />
        )}
        <div className="match-index">#{String(index).padStart(2, '0')}</div>
        <div className="match-team">
          {home.join(' + ')}
          <span className="team-mini">{match.mode === 'solo' ? '1 VS 1' : '2 VS 2'}</span>
        </div>
        <div className="score-block">
          <span className={score.aWin ? 'winner' : ''}>{score.a}</span>
          <i>:</i>
          <span className={score.bWin ? 'winner' : ''}>{score.b}</span>
        </div>
        <div className="match-team right">
          {away.join(' + ')}
          <span className="team-mini">{score.context}</span>
        </div>
      </article>
      {actions ? <div className="row-actions">{actions}</div> : null}
    </motion.div>
  );
}
