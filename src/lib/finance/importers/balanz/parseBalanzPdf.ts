import { parseBalanzOperations } from './parseBalanzOperations';
export const MAX_BALANZ_BYTES = 12 * 1024 * 1024;
export function validateBalanzFile(file: Pick<File, 'name' | 'size' | 'type'>): void {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('Seleccioná un archivo PDF.');
  if (!file.size || file.size > MAX_BALANZ_BYTES) throw new Error('El PDF debe pesar entre 1 byte y 12 MB.');
}
export type PdfTextItem = { str: string; transform: number[] };
export function pdfItemsToLines(items: PdfTextItem[]): string {
  const lines: { y: number; items: PdfTextItem[] }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5];
    let line = lines.find(l => Math.abs(l.y - y) < 2);
    if (!line) { line = { y, items: [] }; lines.push(line); }
    line.items.push(item);
  }
  return lines.sort((a,b) => b.y-a.y).map(l => l.items.sort((a,b) => a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')).join('\n');
}
export async function parseBalanzPdf(file: File) {
  validateBalanzFile(file);
  const data = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(data.slice(0, 5)) !== '%PDF-') throw new Error('El archivo no es un PDF válido.');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data, useSystemFonts: true });
  try {
    const doc = await task.promise;
    if (doc.numPages > 100) throw new Error('El PDF supera las 100 páginas permitidas.');
    const lines: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      lines.push(pdfItemsToLines(content.items.filter((x): x is typeof x & PdfTextItem => 'str' in x)));
      page.cleanup();
    }
    return parseBalanzOperations(lines.join('\n'));
  } finally { await task.destroy(); }
}
