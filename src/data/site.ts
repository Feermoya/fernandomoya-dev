/** Metadatos globales del sitio (SEO, footer, contacto). */

const LINKEDIN = 'https://www.linkedin.com/in/fernando-moya-1997-/';

export const site = {
  name: 'Fernando Moya',
  title: 'Fernando Moya — Si tu web no está funcionando, se puede arreglar',
  description:
    'Webs para marcas y negocios: claras, que carguen bien y no generen problemas. Mendoza, Argentina.',
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
  tagline: 'Sitios claros, pensados para que la gente los entienda y los use.',
  /**
   * Métricas para count-up en “Sobre mí” (editá valores reales antes de publicar).
   */
  metrics: [
    { value: 7, suffix: '+', label: 'Negocios\ncon más consultas' },
    { value: 2, suffix: ' sem', label: 'De brief\na sitio publicado' },
    { value: 5, suffix: '+', label: 'Años\nhaciendo esto' },
    { value: 100, suffix: '%', label: 'Proyectos\nentregados en fecha' },
  ],
} as const;

export type SiteConfig = typeof site;
