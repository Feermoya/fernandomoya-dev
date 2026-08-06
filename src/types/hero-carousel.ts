export type HeroCarouselProject = {
  id: string;
  name: string;
  domain: string;
  href: string;
  external: boolean;
  imageSrc: string;
  imageSrcSet?: string;
  imageWidth: number;
  imageHeight: number;
  alt: string;
  fit?: 'cover' | 'contain';
  position?: string;
};
