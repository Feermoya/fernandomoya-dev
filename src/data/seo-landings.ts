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
  /** Dolor o situación que reconoce el visitante (sección “El problema”). */
  problem?: string;
  /** Resultado concreto que busca el visitante (sección “Qué logramos”). */
  outcome?: string;
  bullets?: string[];
  faqs?: FaqItem[];
  /** Guías relacionadas en el footer de la landing. */
  relatedPaths?: readonly `/${string}`[];
};

export const seoProcessSteps = [
  {
    title: 'Escuchamos tu negocio',
    text: 'Qué vendés, a quién le hablás y qué tiene que quedar claro en los primeros segundos.',
  },
  {
    title: 'Armamos mensaje y secciones',
    text: 'Estructura, textos y recorrido visual para que lo importante quede a la vista.',
  },
  {
    title: 'Desarrollamos y publicamos',
    text: 'Sitio rápido en celular, contacto a mano y base lista para sumar contenido más adelante.',
  },
] as const;

export function getRelatedLandings(currentPath: string, limit = 3): SeoLanding[] {
  const current = seoLandings.find((l) => l.path === currentPath);
  if (current?.relatedPaths?.length) {
    return current.relatedPaths
      .map((p) => seoLandings.find((l) => l.path === p))
      .filter((l): l is SeoLanding => Boolean(l))
      .slice(0, limit);
  }
  return seoLandings.filter((l) => l.path !== currentPath).slice(0, limit);
}

export const seoLandings: SeoLanding[] = [
  {
    path: '/diseno-web-mendoza',
    keyword: 'diseño web Mendoza',
    title: 'Diseño web en Mendoza para negocios | FermoyaDev',
    description:
      'Diseño y desarrollo web en Mendoza para negocios, profesionales y marcas. Sitios claros, rápidos y pensados para generar consultas por WhatsApp.',
    h1: 'Diseño web en Mendoza para negocios que buscan verse profesionales',
    intro:
      'Trabajo con negocios, profesionales y marcas que necesitan una web clara, rápida y fácil de entender. El foco va en ordenar el mensaje: qué ofrecés, para quién es, por qué confiar y cómo contactarte. Estoy en Mendoza y tomo proyectos de otras provincias o del exterior en español.',
    problem:
      'Muchos negocios en Mendoza tienen buen servicio, pero en la web no se entiende rápido qué hacen, para quién es ni cómo contactarlos. Eso genera desconfianza y consultas que nunca llegan.',
    outcome:
      'Un sitio que se ve profesional, explica tu propuesta en segundos y deja el contacto (WhatsApp, mail o formulario) donde el visitante lo espera.',
    relatedPaths: ['/paginas-web-para-negocios', '/landing-page-para-negocios', '/desarrollo-web-en-espanol'],
    bullets: [
      'Diseño y desarrollo web para negocios locales',
      'Landing pages, sitios institucionales y catálogos online',
      'Textos y estructura pensados para que el visitante entienda rápido',
      'Contacto visible por WhatsApp, formulario o mail',
      'Base técnica preparada para SEO, velocidad y buena lectura en celular',
    ],
    faqs: [
      {
        q: '¿Atendés negocios fuera de Mendoza?',
        a: 'Sí. Estoy en Mendoza y tomo proyectos de otras provincias o del exterior si la comunicación es en español. Coordinamos por WhatsApp, mail o videollamada.',
      },
      {
        q: '¿La web incluye ayuda con los textos?',
        a: 'Sí. Trabajo la estructura y los textos principales para que el sitio explique bien qué ofrecés y cómo contactarte.',
      },
      {
        q: '¿También hacés diseño para imprimir?',
        a: 'En algunos proyectos sumo piezas simples (tarjetas, calcos, etiquetas) si encaja con el trabajo de la web.',
      },
    ],
  },
  {
    path: '/desarrollo-web-mendoza',
    keyword: 'desarrollo web Mendoza',
    title: 'Desarrollo web en Mendoza | FermoyaDev',
    description:
      'Desarrollo sitios web en Mendoza: código ordenado, buena carga en celular y base lista para crecer. Para negocios que necesitan un sitio nuevo y estable.',
    h1: 'Desarrollo web en Mendoza para sitios que tienen que funcionar bien',
    intro:
      'Un sitio no alcanza con verse bien: tiene que cargar rápido, abrir bien en el teléfono y ser fácil de mantener. Desde Mendoza desarrollo sitios nuevos con esa base desde el arranque, sin parches encima de algo viejo que ya no sirve.',
    bullets: [
      'Sitios nuevos desarrollados desde cero',
      'Buen rendimiento en celular y escritorio',
      'Código ordenado para sumar páginas después',
      'Enlaces a WhatsApp, formularios o mail cuando haga falta',
    ],
    faqs: [
      {
        q: '¿Hacés el desarrollo y también el diseño?',
        a: 'Lo habitual es diseño y desarrollo juntos. Así el sitio queda coherente de punta a punta.',
      },
      {
        q: '¿Cuánto tarda un sitio nuevo?',
        a: 'Depende del alcance. En proyectos acotados tenés una primera versión en pocas semanas.',
      },
    ],
  },
  {
    path: '/paginas-web-para-negocios',
    keyword: 'páginas web para negocios',
    title: 'Páginas web para negocios | FermoyaDev',
    description:
      'Páginas web para negocios que necesitan explicar qué venden, generar confianza y dejar claro cómo consultar. Estructura simple y contacto visible.',
    h1: 'Páginas web para negocios que necesitan ordenar su mensaje',
    intro:
      'Muchos negocios llegan con el mismo problema: tienen buen producto o servicio, pero en internet no se entiende rápido qué hacen ni cómo contactarlos. Armo páginas con secciones concretas (qué ofrecés, para quién, cómo trabajás, contacto), sin llenar todo de texto que nadie lee.',
    problem:
      'Si alguien entra a tu web y tiene que adivinar qué vendés o buscar el botón de contacto, lo más común es que se vaya antes de escribirte.',
    outcome:
      'Una página que responde lo esencial en orden: qué ofrecés, para quién, por qué confiar y cómo avanzar, con lectura cómoda desde el celular.',
    relatedPaths: ['/diseno-web-mendoza', '/landing-page-para-negocios', '/diseno-web-para-negocios'],
    bullets: [
      'Estructura pensada para quien entra sin conocerte',
      'Servicios y propuesta explicados con claridad',
      'Contacto visible sin esconder el botón',
      'Lectura cómoda en celular',
    ],
    faqs: [
      {
        q: '¿Sirve para un comercio chico?',
        a: 'Sí. Muchos proyectos son para negocios locales que necesitan una página seria sin complicarse.',
      },
      {
        q: '¿Sumo más secciones después?',
        a: 'Sí. La base queda preparada para agregar servicios, fotos o landings cuando lo necesites.',
      },
    ],
  },
  {
    path: '/diseno-web-para-negocios',
    keyword: 'diseño web para negocios',
    title: 'Diseño web para negocios | FermoyaDev',
    description:
      'Diseño web para negocios: jerarquía clara, buena lectura y un aspecto profesional sin recargar la página. Pensado para convertir visitas en consultas.',
    h1: 'Diseño web para negocios que quieren verse en serio',
    intro:
      'El diseño no es decoración: ordena la información para que alguien entienda tu negocio en segundos. Trabajo tipografía, espaciado y recorrido visual para que lo importante (qué hacés y cómo escribirte) quede a la vista, sin gritar.',
    bullets: [
      'Jerarquía visual clara en cada sección',
      'Estilo acorde a tu rubro, sin plantillas genéricas',
      'Diseño responsive desde el inicio',
      'Preparación para el desarrollo sin sorpresas',
    ],
    faqs: [
      {
        q: '¿Necesito tener todo el contenido listo?',
        a: 'No hace falta tener todo cerrado. Armamos la estructura y ajustamos textos en el proceso.',
      },
      {
        q: '¿Incluye logo o identidad completa?',
        a: 'El foco es el sitio. Si necesitás piezas simples de apoyo, lo vemos según el proyecto.',
      },
    ],
  },
  {
    path: '/landing-page-para-negocios',
    keyword: 'landing page para negocios',
    title: 'Landing page para negocios | FermoyaDev',
    description:
      'Landing pages para negocios: una oferta, un mensaje directo y un contacto claro. Útil para campañas, servicios puntuales o anuncios.',
    h1: 'Landing page para negocios con un objetivo claro',
    intro:
      'Cuando necesitás presentar una oferta concreta (un servicio, una promo, una campaña), una landing concentra todo en una página. Menos distracciones, mensaje directo y un botón de contacto que se ve.',
    problem:
      'Mandar tráfico de anuncios o redes a una web genérica diluye el mensaje: el visitante no sabe qué hacer y la campaña pierde fuerza.',
    outcome:
      'Una página con oferta clara, beneficios concretos y contacto repetido donde tiene sentido. Pensada para convertir visitas en consultas.',
    relatedPaths: ['/paginas-web-para-negocios', '/diseno-web-mendoza', '/seo-tecnico'],
    bullets: [
      'Mensaje principal arriba, directo',
      'Beneficios en pocas líneas',
      'Contacto repetido donde tiene sentido',
      'Carga rápida para no perder visitas de anuncios',
    ],
    faqs: [
      {
        q: '¿Es distinto de un sitio completo?',
        a: 'Sí. Una landing apunta a un objetivo claro. Un sitio completo tiene más secciones y recorridos.',
      },
      {
        q: '¿Sirve para Google Ads o Meta?',
        a: 'Sí. Está pensada para recibir tráfico de campañas y que el visitante entienda rápido qué hacer.',
      },
    ],
  },
  {
    path: '/desarrollo-web-en-espanol',
    keyword: 'desarrollo web en español',
    title: 'Desarrollo web en español | FermoyaDev',
    description:
      'Desarrollo web en español para negocios que necesitan coordinar a distancia. Comunicación clara, entregas ordenadas y sitios pensados para su mercado.',
    h1: 'Desarrollo web en español, con comunicación directa',
    intro:
      'Trabajo con negocios que están en distintas ciudades o países y necesitan un sitio en español, bien explicado y fácil de coordinar. La comunicación es por WhatsApp, mail o videollamada, con lenguaje claro.',
    problem:
      'Coordinar un sitio a distancia confunde si nadie te explica en claro qué se hace en cada etapa o si la comunicación se complica con tecnicismos.',
    outcome:
      'Un proyecto en español, con entregas por etapas, feedback en cada paso y un sitio pensado para tu mercado, sin depender de estar en la misma ciudad.',
    relatedPaths: ['/diseno-web-mendoza', '/desarrollo-web-mendoza', '/paginas-web-para-negocios'],
    bullets: [
      'Proyectos coordinados a distancia sin fricción',
      'Sitios en español, con textos claros para tu público',
      'Entregas por etapas con feedback en cada paso',
      'Horarios de Argentina, con flexibilidad según el proyecto',
    ],
    faqs: [
      {
        q: '¿Trabajás con clientes fuera de Argentina?',
        a: 'Sí, siempre que el proyecto sea en español y coordinemos por los canales habituales.',
      },
      {
        q: '¿Cómo se manejan los pagos?',
        a: 'Lo definimos al inicio según el alcance. Transferencia o el método que acordemos.',
      },
    ],
  },
  {
    path: '/diseno-web',
    keyword: 'diseño web',
    title: 'Diseño web profesional para negocios | FermoyaDev',
    description:
      'Diseño web claro para negocios, marcas y profesionales: estructura, jerarquía y recorridos simples para explicar qué ofrecés y acercar el contacto. Sitios nuevos, desarrollados desde cero.',
    h1: 'Diseño web para presentar tu negocio con claridad',
    intro:
      'Desarrollo sitios web para negocios que necesitan mostrarse mejor, ordenar su mensaje y que el visitante entienda en pocos segundos qué hacés y cómo avanzar. Trabajo el diseño como un sistema: textos y secciones con intención, jerarquía visual y un recorrido que lleva hacia el contacto. El foco va en una presentación profesional, coherente y fácil de leer en celular, con base lista para el desarrollo sin sorpresas.',
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
        a: 'Depende del alcance. En proyectos acotados avanzamos rápido con una primera versión y ajustes cortos.',
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
        q: '¿Tu foco son sitios nuevos?',
        a: 'Sí, ese es el foco principal: desarrollo sitios desde cero con arquitectura y código pensados para durar. Así evitamos parches que compiten con decisiones viejas.',
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
      'Diseño webs profesionales para mostrar servicios, generar confianza y que una persona entienda rápido cómo consultar. Una página seria ordena la información, responde preguntas habituales y deja el contacto a mano. La construyo con foco en claridad, velocidad y coherencia visual, para que el sitio sea una herramienta útil para presentar tu negocio.',
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
    h1: 'Landing page enfocada en una acción concreta',
    intro:
      'Landing pages pensadas para presentar una oferta concreta, ordenar la información y llevar al visitante hacia una consulta o pedido de contacto. Si vas a invertir en anuncios o necesitás una página específica para un servicio, una landing concentra el mensaje en un recorrido claro: beneficios concretos, referencias de clientes si aplica y un llamado a la acción visible. El objetivo es claridad y poca fricción, sin inflar el sitio completo.',
    bullets: [
      'Mensaje principal y beneficios en lenguaje simple',
      'Secciones cortas (pasos, dudas frecuentes, referencias de clientes si aplica)',
      'Contacto repetido con intención, en los puntos clave',
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
      'El SEO empieza por lo técnico: títulos y descripciones coherentes, estructura de encabezados, URLs y sitemap claros, y un sitio que cargue bien. En cada proyecto nuevo dejo la base lista para que los buscadores entiendan tus páginas y sumes contenidos útiles después (servicios, landings, textos de ayuda) sin duplicar ni ensuciar la estructura.',
    faqs: [
      {
        q: '¿SEO técnico alcanza para posicionar?',
        a: 'Es la base obligatoria. Después suma contenido útil y páginas alineadas a lo que la gente busca.',
      },
      {
        q: '¿Incluye preparación para Search Console?',
        a: 'Dejamos listo el conjunto: sitemap, robots, buenas URLs y un checklist para publicar e indexar.',
      },
    ],
  },
];
