export const seoPerformanceSummary = {
  clicks: 178,
  impressions: 2120,
  ctr: 8.4,
  averagePosition: 7.4,
  period: 'Últimos 90 días',
} as const;

export const seoPerformanceCase = {
  identification: 'Caso real · sector automotor',
  note: 'Resultados reales del período. El gráfico diario es ilustrativo.',
} as const;

export type SeoPerformancePoint = {
  date: string;
  clicks: number;
  impressions: number;
};

// Serie representativa hardcodeada basada en resultados reales
// agregados del período. No corresponde a una exportación diaria exacta.
export const seoPerformanceSeries: SeoPerformancePoint[] = [
  { date: '2026-04-26', clicks: 0, impressions: 6 },
  { date: '2026-04-27', clicks: 1, impressions: 8 },
  { date: '2026-04-28', clicks: 0, impressions: 7 },
  { date: '2026-04-29', clicks: 1, impressions: 9 },
  { date: '2026-04-30', clicks: 0, impressions: 8 },
  { date: '2026-05-01', clicks: 1, impressions: 11 },
  { date: '2026-05-02', clicks: 1, impressions: 10 },
  { date: '2026-05-03', clicks: 0, impressions: 9 },
  { date: '2026-05-04', clicks: 1, impressions: 12 },
  { date: '2026-05-05', clicks: 2, impressions: 14 },
  { date: '2026-05-06', clicks: 1, impressions: 13 },
  { date: '2026-05-07', clicks: 1, impressions: 15 },
  { date: '2026-05-08', clicks: 2, impressions: 16 },
  { date: '2026-05-09', clicks: 1, impressions: 14 },
  { date: '2026-05-10', clicks: 2, impressions: 18 },
  { date: '2026-05-11', clicks: 1, impressions: 17 },
  { date: '2026-05-12', clicks: 2, impressions: 20 },
  { date: '2026-05-13', clicks: 3, impressions: 23 },
  { date: '2026-05-14', clicks: 2, impressions: 21 },
  { date: '2026-05-15', clicks: 2, impressions: 25 },
  { date: '2026-05-16', clicks: 3, impressions: 27 },
  { date: '2026-05-17', clicks: 2, impressions: 24 },
  { date: '2026-05-18', clicks: 3, impressions: 29 },
  { date: '2026-05-19', clicks: 4, impressions: 32 },
  { date: '2026-05-20', clicks: 2, impressions: 26 },
  { date: '2026-05-21', clicks: 3, impressions: 34 },
  { date: '2026-05-22', clicks: 3, impressions: 36 },
  { date: '2026-05-23', clicks: 4, impressions: 31 },
  { date: '2026-05-24', clicks: 3, impressions: 37 },
  { date: '2026-05-25', clicks: 4, impressions: 40 },
  { date: '2026-05-26', clicks: 5, impressions: 36 },
  { date: '2026-05-27', clicks: 3, impressions: 43 },
  { date: '2026-05-28', clicks: 4, impressions: 45 },
  { date: '2026-05-29', clicks: 5, impressions: 41 },
  { date: '2026-05-30', clicks: 4, impressions: 48 },
  { date: '2026-05-31', clicks: 6, impressions: 51 },
  { date: '2026-06-01', clicks: 4, impressions: 46 },
  { date: '2026-06-02', clicks: 5, impressions: 54 },
  { date: '2026-06-03', clicks: 6, impressions: 57 },
  { date: '2026-06-04', clicks: 4, impressions: 49 },
  { date: '2026-06-05', clicks: 4, impressions: 59 },
  { date: '2026-06-06', clicks: 5, impressions: 62 },
  { date: '2026-06-07', clicks: 4, impressions: 57 },
  { date: '2026-06-08', clicks: 6, impressions: 67 },
  { date: '2026-06-09', clicks: 3, impressions: 53 },
  { date: '2026-06-10', clicks: 5, impressions: 71 },
  { date: '2026-06-11', clicks: 4, impressions: 64 },
  { date: '2026-06-12', clicks: 7, impressions: 75 },
  { date: '2026-06-13', clicks: 5, impressions: 69 },
  { date: '2026-06-14', clicks: 4, impressions: 61 },
  { date: '2026-06-15', clicks: 6, impressions: 77 },
  { date: '2026-06-16', clicks: 2, impressions: 55 },
  { date: '2026-06-17', clicks: 5, impressions: 73 },
  { date: '2026-06-18', clicks: 6, impressions: 79 },
  { date: '2026-06-19', clicks: 5, impressions: 65 },
  { date: '2026-06-20', clicks: 6, impressions: 71 },
];
