/** Metadatos globales del sitio (SEO, footer, contacto). */

const LINKEDIN = 'https://www.linkedin.com/in/fernando-moya-1997-/';

export const site = {
  name: 'Fernando Moya',
  title: 'Fernando Moya — Sitios web claros, rápidos y fáciles de usar',
  description:
    'Sitios para marcas y proyectos que necesitan una web que funcione bien, se entienda y dure. Mendoza, Argentina. También remoto.',
  url: 'https://example.com',
  locale: 'es-AR',
  author: 'Fernando Moya',
  email: 'fmoya97.fm@gmail.com',
  location: 'Mendoza, Argentina',
  social: {
    linkedin: LINKEDIN,
    /** Enlace wa.me sin + en la ruta. */
    whatsapp: 'https://wa.me/5492615760276',
  },
  /** Frase corta: footer, hero secundario. */
  tagline: 'Sitios claros, en producción y pensados para la gente que los usa.',
  /**
   * Métricas para count-up en “Sobre mí” (editá valores reales antes de publicar).
   */
  metrics: [
    { value: 5, suffix: '+', label: 'Años haciendo sitios' },
    { value: 12, suffix: '+', label: 'Sitios publicados' },
  ],
} as const;

export type SiteConfig = typeof site;
