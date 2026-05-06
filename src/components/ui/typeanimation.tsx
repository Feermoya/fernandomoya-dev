import React, { useEffect, useMemo, useState } from "react";

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

/** Espacios normales → NBSP: una frase de varias palabras no se parte en el salto de línea */
function gluePhraseSpaces(phrase: string) {
  return phrase.replace(/ /g, "\u00A0");
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
  const gluedWords = useMemo(
    () => words.map((w) => gluePhraseSpaces(w)),
    [words],
  );

  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState(
    () => gluedWords[0]?.slice(0, 1) ?? "",
  );
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    const word = gluedWords[index];
    if (!word) return;
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
        setIndex((prev) => (prev + 1) % gluedWords.length);
      }, 350); // pequeña pausa entre palabras
    }
    return () => timeout && clearTimeout(timeout);
  }, [displayed, deleting, index, gluedWords, typingSpeed, deletingSpeed, pauseDuration]);

  return (
    <span
      className={className}
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        display: "inline-block",
      }}
      aria-live="polite"
    >
      {displayed}
      <span className="type-cursor" style={{ color: gradientTo }}>|</span>
    </span>
  );
}
