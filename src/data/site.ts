/** Metadatos globales del sitio (SEO, footer, contacto). */

export const site = {
  name: 'Fernando Moya',
  title: 'Fernando Moya — Diseño y desarrollo web para negocios',
  description:
    'Diseño y desarrollo sitios web claros, rápidos y profesionales para negocios, marcas y profesionales. Mendoza, Argentina.',
  url: 'https://www.fermoyadev.com.ar',
  locale: 'es-AR',
  author: 'Fernando Moya',
  email: 'fmoya97.fm@gmail.com',
  location: 'Mendoza, Argentina',
  social: {
    /** Enlace wa.me sin + en la ruta. */
    whatsapp: 'https://wa.me/5492615760276',
    /** Mismo número, solo dígitos (recordatorios Foco / CallMeBot). */
    whatsappPhoneDigits: '5492615760276',
  },
  /** Frase corta: footer, hero secundario. */
  tagline: 'Sitios claros, pensados para presentar tu negocio y facilitar el contacto.',
  /**
   * Métricas para count-up en “Sobre mí” (editá valores reales antes de publicar).
   */
  metrics: [
    { value: 7, suffix: '+', label: 'Sitios\npublicados' },
    { value: 5, suffix: '+', label: 'Años\nhaciendo webs' },
    { value: 2, suffix: ' sem', label: 'Para una\nprimera versión' },
  ],
} as const;

export type SiteConfig = typeof site;
