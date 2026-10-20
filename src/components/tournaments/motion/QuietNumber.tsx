import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { lfDuration, lfEaseOut } from '@/components/tournaments/motion/motionConfig';

type Props = {
  value: number;
  pad?: number;
};

export default function QuietNumber({ value, pad }: Props) {
  const reduced = useReducedMotion() ?? false;
  const ready = useRef(false);
  const prev = useRef(value);
  const [dir, setDir] = useState<1 | -1 | 0>(0);
  const text = pad ? String(value).padStart(pad, '0') : String(value);

  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      prev.current = value;
      return;
    }
    if (value === prev.current) return;
    setDir(value > prev.current ? 1 : -1);
    prev.current = value;
  }, [value]);

  if (reduced) return <>{text}</>;

  return (
    <span className="quiet-num">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={dir === 0 ? false : { y: dir > 0 ? 8 : -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: lfDuration.score, ease: lfEaseOut }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
