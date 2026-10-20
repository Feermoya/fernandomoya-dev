export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('No se pudo generar la imagen'));
      else resolve(blob);
    }, 'image/png');
  });
}

export async function shareOrDownloadPng(
  blob: Blob,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title, text: title });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}

/** Tarjeta social 1080×1350, independiente de la UI de la app. */
export function renderNightCard(input: {
  groupName: string;
  matchdayName: string;
  winner: string;
  wins: number;
  points: number;
  matchesPlayed: number;
  players: number;
}): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#10221b');
  bg.addColorStop(0.55, '#152c25');
  bg.addColorStop(1, '#0a1211');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.strokeStyle = '#bddf7b28';
  ctx.lineWidth = 4;
  ctx.strokeRect(65, 65, 950, 1220);
  ctx.beginPath();
  ctx.arc(850, 450, 250, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(850, 450, 170, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#c5f64c';
  ctx.fillRect(84, 90, 64, 9);
  ctx.font = '800 42px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText('LA FECHA', 84, 160);
  ctx.fillStyle = '#b3c9b9';
  ctx.font = '700 25px "DM Sans", Arial, sans-serif';
  ctx.fillText(`${input.groupName.toUpperCase()}  /  ${input.matchdayName.toUpperCase()}`, 84, 212);

  ctx.fillStyle = '#c5f64c';
  ctx.font = '800 48px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText('LOS DUEÑOS DE', 84, 435);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 130px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText('LA NOCHE.', 76, 550);

  ctx.fillStyle = '#c5f64c';
  ctx.font = '800 32px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText('PAREJA LÍDER', 84, 692);

  const winner = (input.winner || 'SIN GANADOR').toUpperCase();
  ctx.fillStyle = '#f8ffea';
  let size = 90;
  ctx.font = `900 ${size}px "Barlow Condensed", Impact, sans-serif`;
  while (ctx.measureText(winner).width > 920 && size > 36) {
    size -= 3;
    ctx.font = `900 ${size}px "Barlow Condensed", Impact, sans-serif`;
  }
  ctx.fillText(winner, 84, 802);

  ctx.fillStyle = '#b8cabb';
  ctx.font = '700 31px "DM Sans", Arial, sans-serif';
  ctx.fillText(`${input.wins} VICTORIAS   ·   ${input.points} PUNTOS`, 84, 886);

  ctx.strokeStyle = '#6c8c67';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(84, 962);
  ctx.lineTo(990, 962);
  ctx.stroke();

  ctx.fillStyle = '#d5f4bd';
  ctx.font = '800 34px "Barlow Condensed", Impact, sans-serif';
  ctx.fillText('LA CANCHA NO MIENTE.', 84, 1060);
  ctx.fillStyle = '#91aa9c';
  ctx.font = '700 22px "DM Sans", Arial, sans-serif';
  ctx.fillText(`${input.matchesPlayed} PARTIDOS  /  ${input.players} JUGADORES`, 84, 1120);

  return canvas;
}
