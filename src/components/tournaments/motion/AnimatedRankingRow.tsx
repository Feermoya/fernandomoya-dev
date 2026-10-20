import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut, lfSpring } from '@/components/tournaments/motion/motionConfig';

export function useLeaderFlash(leaderKey: string | null) {
  const prev = useRef<string | null | undefined>(undefined);
  const [flashKey, setFlashKey] = useState<string | null>(null);

  useEffect(() => {
    if (prev.current === undefined) {
      prev.current = leaderKey;
      return;
    }
    if (leaderKey && leaderKey !== prev.current) setFlashKey(leaderKey);
    else setFlashKey(null);
    prev.current = leaderKey;
  }, [leaderKey]);

  return flashKey;
}

type Props = {
  className: string;
  leadFlash?: boolean;
  children: ReactNode;
};

export default function AnimatedRankingRow({ className, leadFlash = false, children }: Props) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      layout={reduced ? false : 'position'}
      transition={lfSpring.layout}
      className={className}
      initial={false}
    >
      {leadFlash && !reduced && (
        <motion.span
          className="rank-lead-line"
          aria-hidden
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: lfDuration.rank, ease: lfEaseOut }}
        />
      )}
      {children}
    </motion.div>
  );
}
