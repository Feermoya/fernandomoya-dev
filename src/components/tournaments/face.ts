const FACE = ['#455d93', '#916a52', '#775a9c', '#4c846d', '#84624f', '#756b4e'];

export function faceColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 3)) % FACE.length;
  return FACE[hash] ?? FACE[0]!;
}

export function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}
