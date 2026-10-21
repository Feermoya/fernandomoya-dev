import { useCallback, useRef, useState } from 'react';
import AnimatedScore from '@/components/tournaments/motion/AnimatedScore';
import ScoreActionButton from '@/components/tournaments/motion/ScoreActionButton';
import { playGoalSound } from '@/lib/tournaments/goalSound';
import {
  leadOf,
  leadPulse,
  stepScore,
  type ScoreDirection,
  type ScoreLead,
} from '@/components/tournaments/motion/motionConfig';

export function useScoreboard() {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [homeDir, setHomeDir] = useState<ScoreDirection>(0);
  const [awayDir, setAwayDir] = useState<ScoreDirection>(0);
  const [pulse, setPulse] = useState<ScoreLead | null>(null);
  const [goal, setGoal] = useState(0);
  const homeRef = useRef(0);
  const awayRef = useRef(0);

  const bump = useCallback((side: 'home' | 'away', delta: 1 | -1) => {
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

    if (delta > 0) {
      const shift = leadPulse(before, after);
      if (shift) setPulse(shift);
      setGoal((value) => value + 1);
      playGoalSound();
    }
    return true;
  }, []);

  const clearPulse = useCallback(() => setPulse(null), []);

  return { home, away, homeDir, awayDir, pulse, goal, bump, clearPulse };
}

type Board = ReturnType<typeof useScoreboard>;

export default function Scoreboard({
  home,
  away,
  homeDir,
  awayDir,
  pulse,
  goal,
  bump,
  clearPulse,
}: Board) {
  return (
    <div
      className={`score-edit${pulse === 'level' ? ' level-pulse' : ''}`}
      onAnimationEnd={(event) => {
        if (event.animationName === 'lf-lead' || event.animationName === 'lf-level') clearPulse();
      }}
    >
      {goal > 0 && (
        <p key={goal} className="goal-call" aria-hidden>
          GOOOL
        </p>
      )}
      <div className={`score-control${pulse === 'home' ? ' lead-pulse' : ''}`}>
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
