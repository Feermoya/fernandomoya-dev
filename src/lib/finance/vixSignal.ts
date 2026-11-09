import { getVixMarketInsight } from './vix';

export type VixActionTone = 'opportunity' | 'caution' | 'neutral';
export type VixActionSignal = {
  tone: VixActionTone;
  badge: string;
  message: string;
  title: string;
};

/**
 * VIX is a volatility indicator, never proof that an asset is cheap/expensive.
 * This UI interpretation is deliberately conditional and cannot emit a buy order.
 */
export function getVixActionSignal(value: number, percentileYear: number): VixActionSignal {
  const title = getVixMarketInsight(value, percentileYear).title;
  const rank = Number.isFinite(percentileYear) ? Math.max(0, Math.min(100, percentileYear)) : 50;

  if (value >= 25 || (value >= 22 && rank >= 85)) {
    return {
      tone: 'opportunity',
      badge: value >= 40 ? 'Revisar oportunidades' : 'Posible oportunidad de compra',
      title,
      message: value >= 40
        ? 'El miedo es extremo. Algunas caídas pueden ofrecer mejores entradas, pero el riesgo de nuevas bajas es alto.'
        : 'Hay miedo en el mercado. Algunas acciones podrían haber corregido y ofrecer buenos precios para evaluar compras.',
    };
  }

  if (value < 18 && rank <= 65) {
    return {
      tone: 'caution',
      badge: 'No te apures a comprar',
      title,
      message: 'El mercado está tranquilo. Hay menos señales de ventas por miedo. Revisá precios y valuaciones antes de entrar.',
    };
  }

  return {
    tone: 'neutral',
    badge: 'Elegí con criterio',
    title,
    message: 'La incertidumbre es moderada. Conviene seguir tu plan y buscar precios atractivos en cada activo.',
  };
}

/** Dial spans VIX 10 to 50+, with the needle clamped at each end. */
export function vixDialRatio(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, (value - 10) / 40)) : 0;
}

/**
 * Returns the needle's exact endpoint for an SVG line anchored at one center.
 * Computing the coordinates rather than rotating nested SVG groups prevents
 * CSS transform-box differences between Safari, Chrome and installed PWAs.
 */
export const VIX_DIAL_CENTER = { x: 160, y: 168 } as const;
export const VIX_NEEDLE_LENGTH = 88;

export function getVixNeedleTip(value: number, pressureDegrees = 0): { x: number; y: number } {
  const angle = (180 + vixDialRatio(value) * 180 + pressureDegrees) * Math.PI / 180;
  return {
    x: VIX_DIAL_CENTER.x + Math.cos(angle) * VIX_NEEDLE_LENGTH,
    y: VIX_DIAL_CENTER.y + Math.sin(angle) * VIX_NEEDLE_LENGTH,
  };
}
