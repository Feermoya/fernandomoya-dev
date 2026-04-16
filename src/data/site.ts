/** Metadatos globales del sitio (SEO, footer, contacto). */

/** PLACEHOLDER_EMAIL — reemplazar por tu correo real antes de publicar. */
const PLACEHOLDER_EMAIL = 'contacto@tudominio.com';

/** PLACEHOLDER_LINKEDIN — reemplazar por tu perfil real. */
const PLACEHOLDER_LINKEDIN = 'https://www.linkedin.com/in/PENDIENTE';

export const site = {
  name: 'Fernando Moya',
  title: 'Fernando Moya — Desarrollo frontend y sitios web',
  description:
    'Desarrollador frontend en Mendoza, Argentina. Sitios rápidos, bien armados y pensados para usuarios reales.',
  url: 'https://example.com',
  locale: 'es-AR',
  author: 'Fernando Moya',
  email: PLACEHOLDER_EMAIL,
  location: 'Mendoza, Argentina',
  social: {
    linkedin: PLACEHOLDER_LINKEDIN,
  },
  /** Frase corta: footer, hero secundario. */
  tagline: 'Desarrollo frontend, sitios claros y entregas serias.',
} as const;

export type SiteConfig = typeof site;
