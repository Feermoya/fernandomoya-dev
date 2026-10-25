import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';
import type { StandingRow } from '@/lib/tournaments/types';

export default function LeaderboardHero({ row }: { row: StandingRow | null }) {
  const reduced = useReducedMotion() ?? false;
  if (!row) {
    return (
      <div className="empty">
        <Trophy size={36} />
        <h3>Sin líder</h3>
        <p>Todavía no hay resultados.</p>
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={row.key}
            className="leader-names"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: lfDuration.row, ease: lfEaseOut }}
          >
            {parts.map((part, i) => (
              <span key={`${row.key}-${part}`}>
                {i > 0 ? <em> + </em> : null}
                {part}
              </span>
            ))}
          </motion.div>
        </AnimatePresence>
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
