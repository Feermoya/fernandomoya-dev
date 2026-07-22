/** Nombre visible: rubro + cliente (no solo el nombre propio). */
export function projectListLabel(data: {
  listLabel?: string;
  title: string;
  client?: string;
}): string {
  if (data.listLabel?.trim()) return data.listLabel.trim();
  if (data.client?.trim()) return `Web · ${data.client.trim()}`;
  return data.title;
}
