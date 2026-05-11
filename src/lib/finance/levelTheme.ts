/** Tema visual por nivel — mini app tipo juego, sin acoplar a lógica de desbloqueo. */
export type LevelVisualTheme = {
  name: string;
  icon: string;
  from: string;
  to: string;
  glow: string;
  text: string;
  textMuted: string;
  border: string;
  ring: string;
};

export function getLevelTheme(level: number): LevelVisualTheme {
  if (level <= 0) {
    return {
      name: 'Neutro',
      icon: '💤',
      from: '#0f172a',
      to: '#1e3a5f',
      glow: 'rgba(148, 163, 184, 0.45)',
      text: '#f1f5f9',
      textMuted: 'rgba(226, 232, 240, 0.72)',
      border: 'rgba(148, 163, 184, 0.35)',
      ring: 'rgba(148, 163, 184, 0.5)',
    };
  }
  if (level === 1) {
    return {
      name: 'Semilla',
      icon: '🌱',
      from: '#064e3b',
      to: '#059669',
      glow: 'rgba(52, 211, 153, 0.55)',
      text: '#ecfdf5',
      textMuted: 'rgba(209, 250, 229, 0.85)',
      border: 'rgba(52, 211, 153, 0.45)',
      ring: 'rgba(16, 185, 129, 0.55)',
    };
  }
  if (level === 2) {
    return {
      name: 'Ritmo',
      icon: '⚡',
      from: '#1e3a8a',
      to: '#2563eb',
      glow: 'rgba(96, 165, 250, 0.55)',
      text: '#eff6ff',
      textMuted: 'rgba(191, 219, 254, 0.88)',
      border: 'rgba(96, 165, 250, 0.45)',
      ring: 'rgba(59, 130, 246, 0.55)',
    };
  }
  if (level === 3) {
    return {
      name: 'Disciplina',
      icon: '🔥',
      from: '#4c1d95',
      to: '#7c3aed',
      glow: 'rgba(167, 139, 250, 0.55)',
      text: '#faf5ff',
      textMuted: 'rgba(233, 213, 255, 0.88)',
      border: 'rgba(167, 139, 250, 0.45)',
      ring: 'rgba(139, 92, 246, 0.55)',
    };
  }
  if (level === 4) {
    return {
      name: 'Constructor',
      icon: '🏗️',
      from: '#7c2d12',
      to: '#ea580c',
      glow: 'rgba(251, 146, 60, 0.5)',
      text: '#fff7ed',
      textMuted: 'rgba(255, 237, 213, 0.88)',
      border: 'rgba(251, 146, 60, 0.45)',
      ring: 'rgba(249, 115, 22, 0.5)',
    };
  }
  if (level === 5) {
    return {
      name: 'Diversificación',
      icon: '👑',
      from: '#713f12',
      to: '#ca8a04',
      glow: 'rgba(250, 204, 21, 0.45)',
      text: '#fffbeb',
      textMuted: 'rgba(254, 243, 199, 0.9)',
      border: 'rgba(250, 204, 21, 0.4)',
      ring: 'rgba(234, 179, 8, 0.5)',
    };
  }
  return {
    name: 'Premium',
    icon: '🚀',
    from: '#0e7490',
    to: '#5b21b6',
    glow: 'rgba(34, 211, 238, 0.45)',
    text: '#ecfeff',
    textMuted: 'rgba(207, 250, 254, 0.88)',
    border: 'rgba(34, 211, 238, 0.4)',
    ring: 'rgba(6, 182, 212, 0.5)',
  };
}
