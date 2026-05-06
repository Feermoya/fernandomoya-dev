import { useEffect, useRef } from 'react';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    let w = 0, h = 0;
    const start = performance.now();

    type Dot = { x: number; y: number; r: number; a: number; tw: number };
    let dots: Dot[] = [];

    const buildDots = () => {
      dots = Array.from({ length: 280 }, () => ({
        x: Math.random(), y: Math.random(),
        r: 0.3 + Math.random() * 0.7,
        a: 0.06 + Math.random() * 0.28,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDots();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function drawBand(
      c: CanvasRenderingContext2D,
      topFn: (nx: number) => number,
      botFn: (nx: number) => number,
      fillA: string, fillB: string,
      strokeColor: string,
      strokeBlur: number,
      alpha: number,
    ) {
      const S = 100;
      // Fill
      c.save();
      c.globalAlpha = alpha;
      c.beginPath();
      c.moveTo(0, topFn(0) * h);
      for (let i = 1; i <= S; i++) {
        const nx = i / S;
        c.lineTo(nx * w, topFn(nx) * h);
      }
      for (let i = S; i >= 0; i--) {
        const nx = i / S;
        c.lineTo(nx * w, botFn(nx) * h);
      }
      c.closePath();
      const g = c.createLinearGradient(w * 0.1, 0, w, h * 0.5);
      g.addColorStop(0, fillA);
      g.addColorStop(1, fillB);
      c.fillStyle = g;
      c.fill();
      c.restore();
      // Stroke top edge
      c.save();
      c.globalAlpha = Math.min(alpha * 1.4, 1);
      c.beginPath();
      c.moveTo(0, topFn(0) * h);
      for (let i = 1; i <= S; i++) {
        const nx = i / S;
        c.lineTo(nx * w, topFn(nx) * h);
      }
      c.strokeStyle = strokeColor;
      c.lineWidth = 1.2;
      c.shadowColor = strokeColor;
      c.shadowBlur = strokeBlur;
      c.stroke();
      c.restore();
    }

    const draw = (now: number) => {
      const reduce = prefersReducedMotion();
      const t = ((now - start) / 1000) * (Math.PI * 2) / 14;
      const isMobile = w < 768;

      // Fondo base
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#050818';
      ctx.fillRect(0, 0, w, h);

      // Glow azul eléctrico — zona centro-derecha
      const gx = w * (isMobile ? 0.88 : 0.78);
      const gy = h * (isMobile ? 0.60 : 0.58);
      const gr = w * (isMobile ? 0.55 : 0.42);
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      glow.addColorStop(0,    'rgba(80,  100, 255, 0.28)');
      glow.addColorStop(0.35, 'rgba(110,  60, 230, 0.18)');
      glow.addColorStop(0.70, 'rgba(60,   40, 180, 0.08)');
      glow.addColorStop(1,    'rgba(5,     8,  24, 0.0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Glow violeta esquina derecha
      const g2 = ctx.createRadialGradient(w, h * 0.7, 0, w, h * 0.7, w * 0.35);
      g2.addColorStop(0,   'rgba(147, 51, 234, 0.32)');
      g2.addColorStop(0.5, 'rgba(109, 40, 217, 0.12)');
      g2.addColorStop(1,   'rgba(5,    8,  24, 0.0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // Partículas — densas en la derecha, tipo nube de puntos
      dots.forEach(p => {
        const a = p.a * (0.6 + 0.4 * Math.sin(t * 0.4 + p.tw));
        const fa = p.x < 0.22
          ? a * 0.12
          : p.x > 0.50
            ? a * (1.5 + p.x * 0.8)
            : a * 0.6;
        ctx.save();
        ctx.globalAlpha = Math.min(fa, 0.7);
        // azul en zona izq, violeta en zona der
        ctx.fillStyle = p.x > 0.6 ? '#b197fc' : '#7eb8ff';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Onda de fondo — oscura, da profundidad
      const b0t = (nx: number) => {
        const ramp = 0.15 + nx * 0.85;
        return 0.66 + ramp * (
          0.10 * Math.sin(nx * Math.PI * 1.6 + t * 0.8)
        + 0.03 * Math.sin(nx * Math.PI * 3.0 + t * 1.2)
        );
      };
      const b0b = (nx: number) => b0t(nx) + 0.13 + (nx * 0.04);
      drawBand(ctx, b0t, b0b,
        'rgba(20, 18, 60, 0.55)',
        'rgba(10,  8, 40, 0.30)',
        '#1e1b5e', 0, 0.55
      );

      // Onda principal — azul eléctrico
      const b1t = (nx: number) => {
        const ramp = 0.12 + nx * 0.88;
        return 0.58 + ramp * (
          0.13 * Math.sin(nx * Math.PI * 1.9 + t)
        + 0.04 * Math.sin(nx * Math.PI * 3.4 + t * 1.4)
        );
      };
      const b1b = (nx: number) => b1t(nx) + 0.10 + (nx * 0.05);
      drawBand(ctx, b1t, b1b,
        'rgba(50,  80, 240, 0.30)',
        'rgba(90,  50, 220, 0.18)',
        '#5b7fff', 18, 0.80
      );

      // Onda media — azul más claro
      const b2t = (nx: number) => {
        const ramp = 0.10 + nx * 0.90;
        return 0.53 + ramp * (
          0.12 * Math.sin(nx * Math.PI * 2.1 + t * 1.05 + 0.6)
        + 0.04 * Math.sin(nx * Math.PI * 3.8 + t * 1.5)
        );
      };
      const b2b = (nx: number) => b2t(nx) + 0.08 + (nx * 0.04);
      drawBand(ctx, b2t, b2b,
        'rgba(70,  110, 255, 0.22)',
        'rgba(130,  70, 240, 0.14)',
        '#7eb8ff', 22, 0.70
      );

      // Onda superior — violeta brillante, la más fina
      const b3t = (nx: number) => {
        const ramp = 0.08 + nx * 0.92;
        return 0.49 + ramp * (
          0.11 * Math.sin(nx * Math.PI * 2.3 + t * 1.1 + 1.0)
        + 0.035 * Math.sin(nx * Math.PI * 4.2 + t * 1.7)
        );
      };
      const b3b = (nx: number) => b3t(nx) + 0.055 + (nx * 0.03);
      drawBand(ctx, b3t, b3b,
        'rgba(100, 80, 255, 0.18)',
        'rgba(160, 80, 250, 0.12)',
        '#a78bfa', 26, 0.65
      );

      // Máscara izquierda — mantiene el texto legible
      const lm = ctx.createLinearGradient(0, 0, w * 0.42, 0);
      lm.addColorStop(0,    'rgba(5, 8, 24, 0.88)');
      lm.addColorStop(0.30, 'rgba(5, 8, 24, 0.55)');
      lm.addColorStop(0.60, 'rgba(5, 8, 24, 0.18)');
      lm.addColorStop(1,    'rgba(5, 8, 24, 0.0)');
      ctx.fillStyle = lm;
      ctx.fillRect(0, 0, w, h);

      if (!reduce) rafRef.current = requestAnimationFrame(draw);
    };

    ctx.fillStyle = '#050818';
    ctx.fillRect(0, 0, w, h);
    rafRef.current = requestAnimationFrame(draw);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMC = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    mq.addEventListener?.('change', onMC);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      mq.removeEventListener?.('change', onMC);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />;
}