import { motion, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';

type Props = {
  active: boolean;
  onDone: () => void;
};

export default function GoalBurst({ active, onDone }: Props) {
  const reduced = useReducedMotion() ?? false;
  if (!active || reduced) return null;

  return (
    <div className="goal-burst" aria-hidden>
      <motion.span
        className="goal-sweep"
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: lfDuration.goal, ease: lfEaseOut }}
      />
      <motion.svg className="goal-ring" viewBox="0 0 80 80">
        <motion.circle
          cx="40"
          cy="40"
          r="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          initial={{ r: 10, opacity: 0.9 }}
          animate={{ r: 34, opacity: 0 }}
          transition={{ duration: lfDuration.goal, ease: lfEaseOut }}
        />
      </motion.svg>
      <motion.span
        className="goal-word"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: [8, 0, 0, -4], opacity: [0, 1, 1, 0] }}
        transition={{ duration: lfDuration.goal, times: [0, 0.22, 0.68, 1], ease: lfEaseOut }}
        onAnimationComplete={onDone}
      >
        GOL
      </motion.span>
    </div>
  );
}
