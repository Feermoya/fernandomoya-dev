import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';

type Props = {
  matchdayName: string;
  winner: string;
  wins: number;
  points: number;
  onExport: () => void;
  onClose: () => void;
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: lfEaseOut } },
};

export default function ChampionReveal({
  matchdayName,
  winner,
  wins,
  points,
  onExport,
  onClose,
}: Props) {
  const reduced = useReducedMotion() ?? false;
  const [skipped, setSkipped] = useState(reduced);
  const instant = skipped || reduced;

  return (
    <div className="overlay champion-overlay" role="dialog" aria-modal="true" aria-label="Campeones de la fecha">
      <motion.div
        className="champion-card"
        initial={instant ? 'show' : 'hidden'}
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: instant ? 0 : 0.1, delayChildren: instant ? 0 : 0.08 },
          },
        }}
      >
        <motion.svg className="champion-lines" viewBox="0 0 320 150" aria-hidden variants={item}>
          <rect x="16" y="12" width="288" height="126" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
          <motion.line
            x1="16"
            y1="75"
            x2="304"
            y2="75"
            stroke="#C5F64C"
            strokeWidth="1.4"
            initial={instant ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: instant ? 0 : lfDuration.champion, ease: lfEaseOut }}
          />
          <circle cx="160" cy="75" r="26" fill="none" stroke="currentColor" strokeWidth="1" />
        </motion.svg>
        <motion.svg className="champion-cup" viewBox="0 0 80 100" aria-hidden variants={item}>
          <circle cx="40" cy="36" r="30" fill="none" stroke="#C5F64C" strokeWidth="1" opacity="0.7" />
          <path d="M24 16h32l-3 30c-1.6 10-7 16-13 16s-11.4-6-13-16L24 16z" fill="none" stroke="#F6F8EE" strokeWidth="1.6" />
          <path d="M24 22h-9c1 12 7 18 13 18" fill="none" stroke="#C5F64C" strokeWidth="1.4" />
          <path d="M56 22h9c-1 12-7 18-13 18" fill="none" stroke="#C5F64C" strokeWidth="1.4" />
          <path d="M40 62v14" stroke="#F6F8EE" strokeWidth="1.6" />
          <path d="M27 80h26" stroke="#C5F64C" strokeWidth="2" />
          <path d="M31 86h18" stroke="#F6F8EE" strokeWidth="1.4" />
        </motion.svg>
        <motion.p className="champion-date" variants={item}>
          {matchdayName}
        </motion.p>
        <motion.h2 variants={item}>CAMPEONES</motion.h2>
        <motion.p className="champion-names" variants={item}>
          {winner}
        </motion.p>
        <motion.p className="champion-stats" variants={item}>
          {wins} victorias · {points} puntos
        </motion.p>
        <motion.div className="champion-actions" variants={item}>
          <button type="button" className="primary-btn" onClick={onExport}>
            GUARDAR TARJETA
          </button>
          <button type="button" className="outline-mini" onClick={onClose}>
            SEGUIR
          </button>
          {!instant && (
            <button type="button" className="section-link" onClick={() => setSkipped(true)}>
              SALTAR
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
