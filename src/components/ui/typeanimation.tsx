import React, { useEffect, useRef, useState } from "react";

interface TypeanimationProps {
  words: string[];
  typingSpeed?: "slow" | "normal" | "fast" | number;
  deletingSpeed?: "slow" | "normal" | "fast" | number;
  pauseDuration?: number;
  gradientFrom?: string;
  gradientTo?: string;
  className?: string;
}

const speedMap = {
  slow: 90,
  normal: 55,
  fast: 30,
};

function getSpeed(val: string | number | undefined, fallback: number) {
  if (typeof val === "number") return val;
  if (val && speedMap[val]) return speedMap[val];
  return fallback;
}

export default function Typeanimation({
  words,
  typingSpeed = "slow",
  deletingSpeed = "slow",
  pauseDuration = 1800,
  gradientFrom = "#60a5fa", // blue-400
  gradientTo = "#67e8f9",   // cyan-300
  className = "",
}: TypeanimationProps) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pause, setPause] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    const word = words[index];
    if (!deleting && displayed.length < word.length) {
      timeout = setTimeout(
        () => setDisplayed(word.slice(0, displayed.length + 1)),
        getSpeed(typingSpeed, 90)
      );
    } else if (!deleting && displayed.length === word.length) {
      timeout = setTimeout(() => setDeleting(true), pauseDuration);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(
        () => setDisplayed(word.slice(0, displayed.length - 1)),
        getSpeed(deletingSpeed, 90)
      );
    } else if (deleting && displayed.length === 0) {
      timeout = setTimeout(() => {
        setDeleting(false);
        setIndex((prev) => (prev + 1) % words.length);
      }, 350); // pequeña pausa entre palabras
    }
    return () => timeout && clearTimeout(timeout);
  }, [displayed, deleting, index, words, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
        minWidth: "7.5ch",
        transition: "min-width 0.2s",
      }}
      aria-live="polite"
    >
      {displayed}
      <span className="type-cursor" style={{ color: gradientTo }}>|</span>
    </span>
  );
}
