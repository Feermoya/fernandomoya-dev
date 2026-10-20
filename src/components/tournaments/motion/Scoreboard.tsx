import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import AnimatedScore from '@/components/tournaments/motion/AnimatedScore';
import GoalBurst from '@/components/tournaments/motion/GoalBurst';
import ScoreActionButton from '@/components/tournaments/motion/ScoreActionButton';
import {
  leadOf,
  leadPulse,
  stepScore,
  type ScoreDirection,
  type ScoreLead,
} from '@/components/tournaments/motion/motionConfig';

export function useScoreboard() {
  const reduced = useReducedMotion() ?? false;
  const homeRef = useRef(0);
  const awayRef = useRef(0);
  const burstLock = useRef(false);
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [homeDir, setHomeDir] = useState<ScoreDirection>(0);
  const [awayDir, setAwayDir] = useState<ScoreDirection>(0);
  const [burst, setBurst] = useState<'home' | 'away' | null>(null);
  const [pulse, setPulse] = useState<ScoreLead | null>(null);

  const bump = useCallback(
    (side: 'home' | 'away', delta: 1 | -1) => {
      const mine = side === 'home' ? homeRef : awayRef;
      const other = side === 'home' ? awayRef : homeRef;
      const step = stepScore(mine.current, delta);
      if (!step.changed) return false;

      const before = leadOf(
        side === 'home' ? mine.current : other.current,
        side === 'home' ? other.current : mine.current,
      );
      mine.current = step.value;
      const after = leadOf(
        side === 'home' ? mine.current : other.current,
        side === 'home' ? other.current : mine.current,
      );

      if (side === 'home') {
        setHome(step.value);
        setHomeDir(step.direction);
      } else {
        setAway(step.value);
        setAwayDir(step.direction);
      }

      if (delta > 0 && !reduced) {
        const shift = leadPulse(before, after);
        if (shift) setPulse(shift);
        if (!burstLock.current) {
          burstLock.current = true;
          setBurst(side);
        }
      }
      return true;
    },
    [reduced],
  );

  const clearBurst = useCallback(() => {
    burstLock.current = false;
    setBurst(null);
  }, []);

  const clearPulse = useCallback(() => setPulse(null), []);

  return { home, away, homeDir, awayDir, burst, pulse, bump, clearBurst, clearPulse };
}

type Board = ReturnType<typeof useScoreboard>;

export default function Scoreboard({
  home,
  away,
  homeDir,
  awayDir,
  burst,
  pulse,
  bump,
  clearBurst,
  clearPulse,
}: Board) {
  const reduced = useReducedMotion() ?? false;

  useEffect(() => () => clearBurst(), [clearBurst]);
  useEffect(() => {
    if (reduced && burst) clearBurst();
  }, [reduced, burst, clearBurst]);

  return (
    <div
      className={`score-edit${pulse === 'level' ? ' level-pulse' : ''}`}
      onAnimationEnd={(event) => {
        if (event.animationName === 'lf-lead' || event.animationName === 'lf-level') clearPulse();
      }}
    >
      <div className={`score-control${pulse === 'home' ? ' lead-pulse' : ''}`}>
        <GoalBurst active={burst === 'home'} onDone={clearBurst} />
        <ScoreActionButton label="Restar local" onPress={() => bump('home', -1)}>
          −
        </ScoreActionButton>
        <AnimatedScore value={home} direction={homeDir} />
        <ScoreActionButton label="Sumar local" onPress={() => bump('home', 1)}>
          +
        </ScoreActionButton>
      </div>
      <div className="score-divider">:</div>
      <div className={`score-control${pulse === 'away' ? ' lead-pulse' : ''}`}>
        <GoalBurst active={burst === 'away'} onDone={clearBurst} />
        <ScoreActionButton label="Restar visitante" onPress={() => bump('away', -1)}>
          −
        </ScoreActionButton>
        <AnimatedScore value={away} direction={awayDir} />
        <ScoreActionButton label="Sumar visitante" onPress={() => bump('away', 1)}>
          +
        </ScoreActionButton>
      </div>
    </div>
  );
}
