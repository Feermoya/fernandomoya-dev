import { useEffect, useRef } from 'react';
import { motion, useAnimation, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';

type Props = {
  selected: boolean;
  onClick: () => void;
  color: string;
  mark: string;
  name: string;
};

export default function AnimatedPlayerChip({ selected, onClick, color, mark, name }: Props) {
  const reduced = useReducedMotion() ?? false;
  const face = useAnimation();
  const wasSelected = useRef(selected);

  useEffect(() => {
    if (selected && !wasSelected.current && !reduced) {
      void face.start({
        scale: [1, 1.12, 1],
        transition: { duration: lfDuration.chip, ease: lfEaseOut },
      });
    }
    wasSelected.current = selected;
  }, [selected, reduced, face]);

  return (
    <motion.button
      type="button"
      className={`choice ${selected ? 'selected' : ''}`}
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={{ duration: lfDuration.press, ease: lfEaseOut }}
    >
      <motion.span className="player-face" style={{ background: color }} animate={face}>
        {mark}
      </motion.span>
      {name}
    </motion.button>
  );
}
