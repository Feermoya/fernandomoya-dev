/** IDs con caso de estudio público (ETAPA 4). */
export const CASE_STUDY_IDS = [
  'hema',
  'giacomelli-seguros',
  'poletino-servicios',
  'dra-giuliana-macchiavello',
] as const;

export type CaseStudyId = (typeof CASE_STUDY_IDS)[number];

export type CaseStudyTheme = 'hema' | 'giacomelli' | 'poletino' | 'giuliana';

export type CaseStudyDecision = {
  title: string;
  body: string;
};

export type CaseStudyGalleryFrame = {
  id: string;
  caption: string;
  objectPosition: string;
  /** Recorte visual vía aspect-ratio del viewport */
  aspectRatio: string;
};

export type CaseStudyEditorial = {
  number: string;
  phrase: string;
  theme: CaseStudyTheme;
  nextId: CaseStudyId;
  context: string[];
  objectives: string[];
  direction: {
    estructura: string[];
    identidad: string[];
  };
  decisions: CaseStudyDecision[];
  result: string[];
  gallery: CaseStudyGalleryFrame[];
};

/**
 * Contenido editorial fiel al Markdown de cada proyecto.
 * No duplica frontmatter (client, stack, links, description).
 */
export const CASE_STUDY_EDITORIAL: Record<CaseStudyId, CaseStudyEditorial> = {
  hema: {
    number: '01',
    phrase: 'Complejidad médica, explicada con claridad.',
    theme: 'hema',
    nextId: 'giacomelli-seguros',
    context: [
      'HEMA es un laboratorio de diagnóstico genético y molecular: ofrece estudios complejos y necesita que pacientes, familias y derivadores entiendan qué hace el equipo y cómo avanzar sin sentirse abrumados. El sitio no es una tienda de productos: es un canal institucional donde la claridad y la seriedad son parte del mensaje.',
      'Quien entra suele buscar información sobre tipos de estudios, coberturas o una vía humana para consultar. La web tiene que ordenar temas sensibles en bloques legibles y ofrecer un camino claro hacia el contacto, incluyendo WhatsApp para consultas iniciales.',
      'El desafío fue equilibrar rigor —que se entienda la complejidad del servicio— con legibilidad para personas sin formación técnica en genética.',
    ],
    objectives: [
      'Presentar servicios y líneas de trabajo del laboratorio de forma estructurada.',
      'Facilitar que el visitante encuentre el área que le corresponde (por ejemplo, estudios prenatales, oncología hereditaria u otras líneas).',
      'Reflejar respaldo institucional y equipo sin saturar la página.',
      'Centralizar consultas y derivación con enlaces claros a WhatsApp y secciones de contacto.',
      'Garantizar buena lectura y navegación en dispositivos móviles.',
    ],
    direction: {
      estructura: [
        'Se trabajó la estructura de contenidos para separar lo institucional (quiénes son, trayectoria, dirección científica) de lo operativo (servicios, cómo consultar, información útil antes de coordinar un estudio).',
        'El desarrollo frontend prioriza páginas livianas y recorridos cortos entre secciones relacionadas. La organización visual prioriza servicios por ejes temáticos para que el visitante se ubique antes de escribir.',
      ],
      identidad: [
        'La información se ordenó del mensaje general al detalle por áreas. Visualmente se buscó un tono sobrio y médico-científico, con aire adecuado en blanco para no competir con mensajes sensibles.',
        'Se priorizó la confianza: fotografía institucional, textos que explican procesos sin adornos innecesarios y recorridos que llevan al contacto cuando la persona ya tiene una idea de qué necesita.',
      ],
    },
    decisions: [
      {
        title: 'Ordenar servicios complejos',
        body: 'Servicios por ejes temáticos y pocas categorías claras para que el visitante se ubique antes de escribir.',
      },
      {
        title: 'Reducir muros de texto',
        body: 'Bloques legibles, tipografía y espaciado adecuados; en mobile se evita la sensación de muro cortando en secciones y CTAs.',
      },
      {
        title: 'Reforzar confianza institucional',
        body: 'Fotografía institucional, equipo visible y tono sobrio que acompaña el rubro de salud sin estética comercial.',
      },
      {
        title: 'Facilitar la consulta',
        body: 'WhatsApp y contacto centralizados con recorridos cortos desde cada área de servicio.',
      },
    ],
    result: [
      'La web cumple hoy un rol claro: presentar al laboratorio, explicar líneas de diagnóstico de forma ordenada y reducir fricción para consultar. Una persona puede informarse, ubicarse en el tipo de estudio o área que le interesa y escribir por el canal que el laboratorio prioriza.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general', objectPosition: 'top center', aspectRatio: '16 / 10' },
      { id: 'services', caption: 'Áreas de servicio', objectPosition: '40% 18%', aspectRatio: '16 / 9' },
      { id: 'nav', caption: 'Navegación principal', objectPosition: 'top left', aspectRatio: '21 / 9' },
      { id: 'cta', caption: 'Consulta y contacto', objectPosition: '85% 50%', aspectRatio: '16 / 8' },
    ],
  },
  'giacomelli-seguros': {
    number: '02',
    phrase: 'Una empresa familiar, llevada al presente.',
    theme: 'giacomelli',
    nextId: 'poletino-servicios',
    context: [
      'Giacomelli Seguros es un productor de seguros con más de 48 años de trayectoria en Mendoza y Zona Cuyo. Atienden personas y empresas que necesitan orientación para elegir coberturas —auto, retiro, salud, comercio, caución, ART— y también quienes ya tienen póliza y quieren revisar si sigue siendo conveniente.',
      'Muchas consultas llegan desde el celular y el visitante suele buscar confianza antes que promesas vacías: saber con quién habla, qué alternativas existen y cómo dar el primer paso. La web debía reflejar atención familiar y directa, sin parecer un comparador genérico ni un trámite frío.',
      'En conjunto, el desafío fue ordenar un catálogo amplio de servicios sin abrumar, destacar el acompañamiento real y dejar visible el contacto cuando más importa —incluida la guía ante siniestros.',
    ],
    objectives: [
      'Presentar coberturas para personas y empresas con lenguaje claro y sin jerga innecesaria.',
      'Comunicar trayectoria, valores y diferencia del asesoramiento humano frente a contratar solo por precio.',
      'Facilitar cotización y consultas por WhatsApp con mensajes contextualizados desde el sitio.',
      'Ofrecer una ruta útil para quien ya tiene seguro y quiere revisar su póliza actual.',
      'Orientar ante siniestros con información práctica de primeros pasos.',
      'Garantizar buena lectura y navegación en celular.',
    ],
    direction: {
      estructura: [
        'Se estructuró el contenido en bloques que siguen el recorrido del visitante: propuesta de valor, servicios destacados, revisión de pólizas, soluciones para empresas, aseguradoras con las que trabajan y acompañamiento ante siniestros.',
        'Cada cobertura tiene su página con contexto, beneficios y llamados a la acción hacia WhatsApp. La home concentra lo esencial para quien llega sin saber por dónde empezar.',
      ],
      identidad: [
        'La jerarquía visual separa confianza —años de trayectoria, tono cercano— de utilidad —qué cubre cada seguro y cómo avanzar— para que no compitan.',
        'Los colores y la tipografía acompañan un rubro que pide seriedad sin distancia. La navegación está pensada para pocas decisiones: explorar servicios, revisar si conviene cambiar, contactar o consultar ante un siniestro.',
      ],
    },
    decisions: [
      {
        title: 'Ordenar muchas coberturas',
        body: 'Servicios agrupados por recorrido del visitante, sin mezclar flujos generales con casos de empresas o minería.',
      },
      {
        title: 'Comunicar trayectoria familiar',
        body: 'Trayectoria, valores y tono cercano visibles antes que comparativas agresivas por precio.',
      },
      {
        title: 'Diferenciar asesoramiento de precio',
        body: 'El mensaje central es acompañamiento humano, no solo cotización. WhatsApp con texto prearmado según intención.',
      },
      {
        title: 'Mantener el contacto visible',
        body: 'CTAs hacia WhatsApp en mobile con barra de contacto visible y footer con matrícula SSN.',
      },
    ],
    result: [
      'La web funciona hoy como puerta de entrada al asesoramiento de Giacomelli: ordena coberturas, transmite trayectoria y deja claro cómo cotizar o pedir orientación. Quien entra puede entender opciones, revisar su situación actual y escribir por WhatsApp con contexto, sin buscar el contacto escondido.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general', objectPosition: 'top center', aspectRatio: '16 / 10' },
      { id: 'services', caption: 'Coberturas', objectPosition: '45% 22%', aspectRatio: '16 / 9' },
      { id: 'trust', caption: 'Trayectoria y confianza', objectPosition: '30% 35%', aspectRatio: '21 / 9' },
      { id: 'cta', caption: 'Contacto y cotización', objectPosition: 'bottom center', aspectRatio: '16 / 8' },
    ],
  },
  'poletino-servicios': {
    number: '03',
    phrase: 'Maquinaria real. Comunicación directa.',
    theme: 'poletino',
    nextId: 'dra-giuliana-macchiavello',
    context: [
      'Poletino ofrece alquiler de hidrogrúas, transporte de cargas pesadas y maquinaria para obras en Mendoza y alrededores, y la web tenía que hablarle a otro comprador B2B: alguien que busca resolver un problema operativo y necesita saber si pueden cubrirlo, en qué zona y cómo contactar.',
      'En este tipo de rubro, la página falla si queda vaga: listados incompletos o un tono demasiado genérico generan desconfianza. El visitante suele comparar pocos proveedores y decide rápido si sigue leyendo o cierra.',
      'El sitio debía transmitir solidez y practicidad: empresa que trabaja en obra, planta o ruta, no un brochure decorativo.',
    ],
    objectives: [
      'Presentar servicios y líneas de negocio de forma explícita y escaneable.',
      'Reflejar imagen seria y operativa acorde a clientes industriales.',
      'Facilitar consultas y pedidos de presupuesto con contacto visible.',
      'Que la información cargue rápido y se lea bien en obra o desde el celular.',
      'Mantener una jerarquía simple: qué hacen, para quién y cómo seguir.',
    ],
    direction: {
      estructura: [
        'Se organizó el contenido por tipo de servicio y necesidad, evitando párrafos largos donde bastan listas claras y titulares directos. El sitio es estático y liviano, pensado para cargar rápido incluso desde obra.',
        'El diseño responsive asegura que fotos de equipamiento, tablas resumidas o bloques de texto se apilen en un orden lógico en pantallas chicas. Donde aplica, se enfatizó la cobertura geográfica o modalidad de trabajo.',
      ],
      identidad: [
        'Visualmente se buscó fuerza y claridad: contrastes firmes, poco ruido decorativo y tipografía legible en contextos de trabajo real.',
        'El tono es directo y profesional, alineado a un proveedor industrial. No se priorizó marketing creativo sino que el visitante reconozca servicios concretos y entienda el siguiente paso.',
      ],
    },
    decisions: [
      {
        title: 'Hablar directo al comprador B2B',
        body: 'Tono operativo para quien necesita resolver un problema en obra, planta o ruta — no un brochure decorativo.',
      },
      {
        title: 'Mostrar servicios concretos',
        body: 'Listas claras y titulares directos: maquinaria, transporte y asistencia visibles sin párrafos innecesarios.',
      },
      {
        title: 'Evitar mensajes industriales vagos',
        body: 'Cobertura geográfica y modalidad de trabajo explícitas para que una empresa sepa si conviene seguir.',
      },
      {
        title: 'Llevar rápido al presupuesto',
        body: 'Contacto visible al final de bloques clave: WhatsApp, teléfono o formulario según prioridad del negocio.',
      },
    ],
    result: [
      'La web cumple un rol práctico para el negocio: resume qué ofrece Poletino, da confianza de operación real y deja el canal de consulta a mano. Quien entra desde otro taller o empresa puede ubicarse en minutos y pedir cotización sin recorridos confusos.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general', objectPosition: 'top center', aspectRatio: '16 / 10' },
      { id: 'services', caption: 'Servicios y maquinaria', objectPosition: '50% 28%', aspectRatio: '16 / 9' },
      { id: 'equipment', caption: 'Equipamiento', objectPosition: '60% 40%', aspectRatio: '21 / 9' },
      { id: 'cta', caption: 'Presupuesto y contacto', objectPosition: 'bottom center', aspectRatio: '16 / 8' },
    ],
  },
  'dra-giuliana-macchiavello': {
    number: '04',
    phrase: 'Convertir tratamientos estéticos en decisiones más claras e informadas.',
    theme: 'giuliana',
    nextId: 'giacomelli-seguros',
    context: [
      'La Dra. Giuliana Macchiavello trabaja en armonización orofacial y odontología en Mendoza. Su público llega principalmente desde Instagram buscando información sobre tratamientos, resultados y formas de contacto.',
      'El desafío no era solamente mostrar procedimientos. En este tipo de servicio, antes de consultar aparecen dudas sobre la naturalidad del resultado, la seguridad, los tiempos y cuál es el tratamiento adecuado para cada rostro.',
      'La web debía ordenar esa información y convertir el criterio profesional de Giuliana en el centro de la marca.',
    ],
    objectives: [
      'Presentar a la doctora y su forma de trabajar.',
      'Organizar los tratamientos de manera clara.',
      'Explicar beneficios sin realizar promesas médicas.',
      'Reducir dudas antes de la primera consulta.',
      'Reforzar la idea de resultados naturales y personalizados.',
      'Facilitar el contacto mediante WhatsApp.',
      'Construir una base preparada para posicionamiento local en Mendoza.',
    ],
    direction: {
      estructura: [
        'La información se organizó alrededor de las necesidades de las pacientes y no como un listado técnico de procedimientos. Cada tratamiento explica qué aspecto permite trabajar, cómo se evalúa y por qué la indicación depende de cada caso.',
        'Se diseñaron secciones para presentar a la doctora, explicar su criterio profesional, recorrer los tratamientos, responder preguntas frecuentes y consultar directamente por WhatsApp. El sitio prioriza velocidad de carga, adaptación a celulares, navegación clara y una estructura semántica preparada para SEO.',
      ],
      identidad: [
        'La dirección visual combina fondos crema, blanco cálido, rosa empolvado y tonos neutros. El rosa se utiliza como acento para conservar una estética femenina sin convertir la web en algo infantil o excesivamente romántico.',
        'La composición utiliza espacios amplios, tipografía editorial y fotografías de evaluación profesional. La jerarquía presenta primero el enfoque de la doctora, después las necesidades de la paciente y finalmente los tratamientos disponibles.',
      ],
    },
    decisions: [
      {
        title: 'El criterio antes que el procedimiento',
        body: 'La evaluación profesional ocupa el centro de la comunicación.',
      },
      {
        title: 'Tratamientos ordenados por necesidad',
        body: 'La persona puede comenzar por lo que quiere mejorar, aunque todavía no conozca el nombre del procedimiento.',
      },
      {
        title: 'Una estética femenina y profesional',
        body: 'La identidad es cálida y delicada, sin perder claridad ni credibilidad médica.',
      },
      {
        title: 'WhatsApp como cierre del recorrido',
        body: 'El contacto permanece visible y aparece cuando la persona ya cuenta con información suficiente para consultar.',
      },
    ],
    result: [
      'La web funciona como una extensión más clara y completa de su comunicación en redes. Una persona puede conocer a la doctora, entender qué tipo de resultados prioriza, explorar los tratamientos y resolver sus principales dudas antes de escribirle.',
      'El recorrido termina con una acción concreta: solicitar una evaluación o consultar disponibilidad por WhatsApp.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general de la página', objectPosition: 'top center', aspectRatio: '16 / 10' },
      {
        id: 'treatments',
        caption: 'Tratamientos organizados por objetivo',
        objectPosition: '45% 28%',
        aspectRatio: '16 / 9',
      },
      {
        id: 'doctor',
        caption: 'Presentación y criterio de la doctora',
        objectPosition: '55% 45%',
        aspectRatio: '21 / 9',
      },
      {
        id: 'faq',
        caption: 'Preguntas frecuentes y contacto',
        objectPosition: 'bottom center',
        aspectRatio: '16 / 8',
      },
    ],
  },
};

export function isCaseStudyId(id: string): id is CaseStudyId {
  return (CASE_STUDY_IDS as readonly string[]).includes(id);
}

export function domainFromLive(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}
