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
      'Diseño web claro para negocios, marcas y profesionales: estructura, jerarquía y recorridos simples para explicar qué ofrecés y acercar el contacto. Sitios nuevos, desarrollados desde cero.',
    h1: 'Diseño web para presentar tu negocio con claridad',
    intro:
      'Desarrollo sitios web para negocios que necesitan mostrarse mejor, ordenar su mensaje y que el visitante entienda en pocos segundos qué hacés y cómo avanzar. Trabajo el diseño como un sistema: textos y secciones con intención, jerarquía visual y un recorrido que lleva hacia el contacto. El foco no es el adorno, sino una presentación profesional, coherente y fácil de leer en celular, con base lista para el desarrollo sin sorpresas.',
    bullets: [
      'Estructura de secciones alineada a lo que el visitante necesita saber',
      'Diseño responsive (mobile first, legible y estable)',
      'Sistema de estilos coherente (tipografías, colores, espaciado)',
      'Preparación para SEO técnico (títulos, encabezados, enlazado interno)',
    ],
    faqs: [
      {
        q: '¿El diseño incluye ayuda con los textos?',
        a: 'Sí: ordenamos mensajes por secciones y ajustamos redacción para que sea clara. Si necesitás textos más extensos, lo vemos dentro del alcance del proyecto.',
      },
      {
        q: '¿Trabajás sitios nuevos desde cero?',
        a: 'Sí, es lo habitual. Arrancamos por entender tu negocio y definimos un sitio nuevo con diseño y contenidos ordenados desde el inicio.',
      },
      {
        q: '¿Cuánto tarda una propuesta de diseño?',
        a: 'Depende del alcance. En proyectos acotados se puede avanzar rápido con una primera versión y ajustes cortos.',
      },
    ],
  },
  {
    path: '/desarrollo-web',
    keyword: 'desarrollo web',
    title: 'Desarrollo web rápido, claro y optimizado | FermoyaDev',
    description:
      'Desarrollo sitios web nuevos que cargan bien, son fáciles de mantener y están preparados para crecer: buen rendimiento, HTML semántico y buenas prácticas.',
    h1: 'Desarrollo web pensado para rendimiento y claridad',
    intro:
      'Un sitio nuevo tiene que cargar rápido, verse bien en móvil y ser sencillo de mantener. En el desarrollo priorizo performance, accesibilidad y código ordenado desde el primer día: menos fricción para quien entra y una base clara para sumar páginas o secciones después. El resultado es un sitio estable, profesional y pensado para acompañar tu negocio a largo plazo.',
    bullets: [
      'Buen tiempo de carga (imágenes, fuentes, JS acotado)',
      'HTML semántico y buenas prácticas de accesibilidad',
      'Base mantenible para sumar contenidos o landings cuando haga falta',
      'Formularios y enlaces a WhatsApp cuando corresponda',
    ],
    faqs: [
      {
        q: '¿Solo hacés sitios nuevos?',
        a: 'Es el foco principal: desarrollo sitios desde cero con arquitectura y código pensados para durar. Así evitamos parches que compiten con decisiones viejas.',
      },
      {
        q: '¿Mi web va a verse bien en celular?',
        a: 'Sí: el desarrollo está pensado para pantallas chicas y grandes, con navegación simple y lectura cómoda.',
      },
    ],
  },
  {
    path: '/pagina-web-profesional',
    keyword: 'página web profesional',
    title: 'Página web profesional para negocios y servicios | FermoyaDev',
    description:
      'Página web profesional para negocios y profesionales: estructura clara, secciones útiles, contacto visible y base técnica preparada para SEO.',
    h1: 'Una página web profesional que genera confianza',
    intro:
      'Diseño webs profesionales para mostrar servicios, generar confianza y que una persona entienda rápido cómo consultar. Una página seria no es solo estética: ordena la información, responde preguntas habituales y deja el contacto a mano. La construyo con foco en claridad, velocidad y coherencia visual, para que el sitio sea una herramienta útil para presentar tu negocio.',
    bullets: [
      'Secciones clave: qué hacés, para quién, cómo trabajás, referencias si aplica, contacto',
      'Llamados a la acción visibles (WhatsApp, formulario, mail) sin saturar',
      'Contenido alineado a títulos y descripciones para indexar con sentido',
    ],
  },
  {
    path: '/landing-page',
    keyword: 'landing page',
    title: 'Landing page para campañas y anuncios | FermoyaDev',
    description:
      'Landing pages para presentar una oferta concreta: mensaje directo, secciones cortas y contacto claro. Ideal para campañas y anuncios.',
    h1: 'Landing page enfocada en una sola acción',
    intro:
      'Landing pages pensadas para presentar una oferta concreta, ordenar la información y llevar al visitante hacia una consulta o pedido de contacto. Si vas a invertir en anuncios o necesitás una página específica para un servicio, una landing concentra el mensaje en un solo recorrido: beneficios concretos, prueba social si aplica y un llamado a la acción visible. El objetivo es claridad y poca fricción, sin inflar el sitio completo.',
    bullets: [
      'Mensaje principal y beneficios en lenguaje simple',
      'Secciones cortas (pasos, dudas frecuentes, testimonios si aplica)',
      'Contacto repetido con intención, sin ruido',
    ],
  },
  {
    path: '/redisenio-web',
    keyword: 'rediseño web',
    title: 'Sitio web nuevo para tu negocio | FermoyaDev',
    description:
      'Cuando tu sitio actual ya no te representa, desarrollo un sitio web nuevo desde cero: mensaje ordenado, diseño profesional y contacto claro. Mendoza.',
    h1: 'Un sitio web nuevo, pensado para tu negocio',
    intro:
      'Muchas búsquedas empiezan porque el sitio viejo ya no explica bien lo que ofrecés hoy. En ese caso trabajamos un sitio nuevo, desarrollado desde cero: estructura de contenidos, diseño y desarrollo alineados a tu negocio actual. La idea es ordenar el mensaje, generar confianza y que el contacto sea obvio, con buena experiencia en mobile y carga ágil. No se trata de parches sueltos: es un sitio armado de nuevo para que te represente bien desde el primer clic.',
    bullets: [
      'Definición del mensaje y de las secciones según lo que vendés ahora',
      'Diseño coherente con tu rubro y fácil de recorrer',
      'Desarrollo limpio y rápido, pensado para celular',
      'Contacto visible en el recorrido natural del visitante',
    ],
  },
  {
    path: '/seo-tecnico',
    keyword: 'seo técnico',
    title: 'SEO técnico para que Google entienda tu web | FermoyaDev',
    description:
      'SEO técnico base en sitios nuevos: títulos, metadatos, estructura, sitemap y buenas prácticas de rendimiento para una indexación ordenada.',
    h1: 'SEO técnico base (sin humo)',
    intro:
      'El SEO empieza por lo técnico: títulos y descripciones coherentes, estructura de encabezados, URLs y sitemap claros, y un sitio que cargue bien. En cada proyecto nuevo dejo la base lista para que los buscadores entiendan tus páginas y puedas sumar contenidos útiles después (servicios, landings, textos de ayuda) sin duplicar ni ensuciar la estructura.',
    faqs: [
      {
        q: '¿SEO técnico alcanza para posicionar?',
        a: 'Es la base obligatoria. Después suma contenido útil y páginas alineadas a lo que la gente busca.',
      },
      {
        q: '¿Incluye preparación para Search Console?',
        a: 'Se puede dejar listo el conjunto: sitemap, robots, buenas URLs y un checklist para publicar e indexar.',
      },
    ],
  },
];
