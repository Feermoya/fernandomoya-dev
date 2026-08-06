export type FeaturedProjectData = {
  id: string;
  number: string;
  client: string;
  listLabel: string;
  category: string;
  headline: string;
  summary: string;
  domain: string;
  live: string;
  caseUrl: string;
  coverSrc: string;
  coverSrcSet?: string;
  coverWidth: number;
  coverHeight: number;
  alt: string;
  theme: 'avellaneda' | 'mendoza' | 'giacomelli' | 'hema';
  mediaPosition: 'left' | 'right';
};

export type ArchiveProjectData = {
  id: string;
  number: string;
  label: string;
  live: string;
  caseUrl?: string;
};
