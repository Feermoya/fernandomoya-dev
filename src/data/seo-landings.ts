export type FaqItem = { q: string; a: string };

export type SeoLanding = {
  /** Path absoluto tipo /diseno-web */
  path: `/${string}`;
  /** Keyword principal (para reporting) */
  keyword: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  bullets?: string[];
  faqs?: FaqItem[];
};

export const seoLandings: SeoLanding[] = [
  {
    path: '/diseno-web',
    keyword: 'diseño web',
    title: 'Diseño web profesional para negocios | FermoyaDev',
    description:
      'Diseño web claro y moderno para negocios: estructura, copy, UI y performance para que tu sitio se entienda, cargue bien y convierta consultas.',
    h1: 'Diseño web profesional para tu negocio',
    intro:
      'Si necesitás un sitio que se vea bien pero, sobre todo, que se entienda y funcione, el diseño es el punto de partida. Trabajo el diseño web como un sistema: jerarquía visual, textos claros, secciones que responden dudas reales y un recorrido que guía a la persona hacia la consulta. La idea no es “decorar”, es lograr que tu propuesta se perciba profesional, que tu servicio se explique rápido y que el sitio cargue bien en celular. El resultado es un diseño sobrio, consistente y listo para desarrollarse sin sorpresas.',
    bullets: [
      'Estructura de secciones pensada para consultas (no para “rellenar”)',
      'Diseño responsive real (mobile first, sin saltos ni bloques raros)',
      'Sistema de estilos coherente (tipografías, colores, espaciado)',
      'Preparación para SEO técnico (títulos, H1/H2, enlazado interno)',
    ],
    faqs: [
      { q: '¿Diseño web incluye redacción?', a: 'Incluye guía y ajustes de estructura/copy por secciones. Si necesitás textos completos, lo trabajamos como parte del proyecto.' },
      { q: '¿Se puede rediseñar un sitio existente?', a: 'Sí. Se revisa qué funciona, qué no, y se rediseña sin perder lo que ya te sirve.' },
      { q: '¿Cuánto tarda un diseño?', a: 'Depende del alcance. En proyectos chicos se puede avanzar rápido con una primera propuesta y iteraciones cortas.' },
    ],
  },
  {
    path: '/desarrollo-web',
    keyword: 'desarrollo web',
    title: 'Desarrollo web rápido, claro y optimizado | FermoyaDev',
    description:
      'Desarrollo sitios web que cargan bien, son fáciles de mantener y están listos para posicionar: performance, accesibilidad y buenas prácticas.',
    h1: 'Desarrollo web pensado para rendimiento',
    intro:
      'Un sitio puede verse bien y aun así fallar en lo más importante: cargar lento, romperse en móvil o ser difícil de actualizar. En el desarrollo priorizo performance, accesibilidad y una base limpia para que el sitio se mantenga estable. Eso se traduce en mejor experiencia, menos problemas y una web lista para crecer: nuevas secciones, mejoras de SEO y contenidos sin rehacer todo.',
    bullets: [
      'Optimización de carga (imágenes, fuentes, JS mínimo)',
      'Accesibilidad y estructura HTML semántica',
      'Base mantenible para sumar páginas SEO cuando haga falta',
      'Integración con formularios y WhatsApp',
    ],
    faqs: [
      { q: '¿Se puede mejorar un sitio lento sin rehacerlo?', a: 'Muchas veces sí: se audita performance y se atacan los cuellos de botella con cambios puntuales.' },
      { q: '¿Mi web va a verse bien en todos los celulares?', a: 'Sí, el objetivo es que sea estable y legible en pantallas chicas y grandes.' },
    ],
  },
  {
    path: '/pagina-web-profesional',
    keyword: 'página web profesional',
    title: 'Página web profesional para conseguir consultas | FermoyaDev',
    description:
      'Página web profesional para negocios y servicios: estructura clara, secciones útiles, CTA visibles y base técnica lista para SEO.',
    h1: 'Una página web profesional que explique y convierta',
    intro:
      'Cuando alguien entra a tu web, decide en segundos si entiende lo que hacés y si confía. Una página profesional no es solo estética: tiene una estructura que responde preguntas, muestra trabajos o resultados, y deja claro cómo contactarte. La construyo con foco en claridad, velocidad y coherencia visual, para que la web sea una herramienta real de ventas y consultas.',
    bullets: [
      'Secciones clave: qué hacés, para quién, cómo trabajás, trabajos, contacto',
      'CTA visibles (WhatsApp, formulario, agenda) sin molestar',
      'Contenido listo para indexar (title/description/H1 consistentes)',
    ],
  },
  {
    path: '/landing-page',
    keyword: 'landing page',
    title: 'Landing page para campañas y anuncios | FermoyaDev',
    description:
      'Landing page enfocada en una sola acción: consultas, turnos o presupuesto. Diseño claro, velocidad y mensajes directos para convertir.',
    h1: 'Landing page enfocada en conversiones',
    intro:
      'Si vas a invertir en anuncios o querés una página específica para un servicio, una landing page evita distracciones y concentra todo en una acción. Armamos un mensaje simple, secciones cortas, prueba social si aplica y un CTA claro. El objetivo es reducir fricción y aumentar consultas sin inflar el sitio entero.',
    bullets: [
      'Mensaje principal + beneficios concretos',
      'Secciones cortas (FAQ, casos, pasos, garantía si aplica)',
      'CTA repetido con intención (sin spam)',
    ],
  },
  {
    path: '/redisenio-web',
    keyword: 'rediseño web',
    title: 'Rediseño web sin perder lo que ya funciona | FermoyaDev',
    description:
      'Rediseño web para mejorar claridad, estética y rendimiento. Mantener lo útil, corregir lo que frena consultas y ordenar el contenido.',
    h1: 'Rediseño web: ordenar, simplificar y mejorar',
    intro:
      'Un rediseño bien hecho no es cambiar colores: es revisar estructura, mensajes, performance y experiencia móvil. Se identifica qué está frenando (textos confusos, secciones largas, navegación, carga lenta) y se rediseña para que tu web explique mejor y genere más consultas.',
  },
  {
    path: '/seo-tecnico',
    keyword: 'seo técnico',
    title: 'SEO técnico para que Google entienda tu web | FermoyaDev',
    description:
      'SEO técnico base: titles, descriptions, canonicals, sitemap, performance y estructura. Preparar tu web para indexación y crecimiento.',
    h1: 'SEO técnico base (sin humo)',
    intro:
      'El SEO empieza por lo técnico: títulos correctos, estructura de encabezados, canónicas, sitemap, velocidad y páginas útiles. Si Google no entiende tus páginas, no las muestra. Acá la idea es dejar la base lista para indexar bien y luego escalar con páginas específicas (servicios, guías, etc.) sin duplicar contenido.',
    faqs: [
      { q: '¿SEO técnico alcanza para posicionar?', a: 'Es la base. Después se compite con contenido útil y páginas específicas según intención de búsqueda.' },
      { q: '¿Incluye Search Console?', a: 'Se puede dejar todo listo: sitemap, robots, canónicas y checklist para indexar.' },
    ],
  },
];

