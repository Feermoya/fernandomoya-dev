import type { ReactNode } from 'react';
import { motion, useAnimation } from 'motion/react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';

type Props = {
  label: string;
  onPress: () => boolean;
  children: ReactNode;
};

export default function ScoreActionButton({ label, onPress, children }: Props) {
  const controls = useAnimation();

  return (
    <motion.button
      type="button"
      aria-label={label}
      animate={controls}
      onClick={() => {
        const changed = onPress();
        if (!changed) return;
        void controls.start({
          scale: 0.9,
          transition: { duration: lfDuration.press * 0.45, ease: lfEaseOut },
        }).then(() =>
          controls.start({
            scale: 1,
            transition: { duration: lfDuration.press * 0.55, ease: lfEaseOut },
          }),
        );
      }}
    >
      {children}
    </motion.button>
  );
}
