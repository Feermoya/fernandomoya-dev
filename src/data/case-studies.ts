/** IDs con caso de estudio público (ETAPA 4). */
export const CASE_STUDY_IDS = [
  'avellaneda-automotores',
  'mendoza-insights',
  'hema',
  'giacomelli-seguros',
  'poletino-servicios',
  'dra-giuliana-macchiavello',
] as const;

export type CaseStudyId = (typeof CASE_STUDY_IDS)[number];

export type CaseStudyTheme = 'avellaneda' | 'mendoza' | 'hema' | 'giacomelli' | 'poletino' | 'giuliana';

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
  'avellaneda-automotores': {
    number: '01',
    phrase: 'Un catálogo que acompaña el movimiento real de una agencia de autos.',
    theme: 'avellaneda',
    nextId: 'mendoza-insights',
    context: [
      'Avellaneda Automotores es una agencia de compra y venta de autos usados en Guaymallén, Mendoza. Su stock cambia todo el tiempo: ingresan vehículos, se actualizan precios, se modifican condiciones y se retiran unidades vendidas.',
      'Una agencia no alcanza con publicaciones dispersas en redes sociales para mostrar su stock. Necesitaba un catálogo propio, actualizado y listo para acompañar el movimiento real del negocio.',
      'No bastaba una web institucional. Hacía falta una herramienta comercial para publicar, administrar y vender vehículos sin rehacer el sitio cada vez que cambia el inventario.',
    ],
    objectives: [
      'Centralizar el stock en un catálogo web ordenado y actualizable.',
      'Convertir cada vehículo en una ficha individual, completa y fácil de compartir.',
      'Publicar, modificar datos, actualizar precios y retirar unidades vendidas desde el panel.',
      'Conectar cada publicación con una consulta comercial directa por WhatsApp.',
      'Preparar la estructura para búsquedas locales y SEO dinámico por vehículo.',
      'Ofrecer una experiencia clara y usable en celular.',
    ],
    direction: {
      estructura: [
        'La plataforma combina catálogo dinámico, fichas individuales, filtros, comparación y consultas por WhatsApp con contexto del vehículo. El recorrido típico es explorar el stock, abrir una ficha y escribir con la unidad ya identificada.',
        'Cada vehículo incluye galería, precio, marca, modelo, año, kilometraje, motor, combustible, transmisión y descripción. El estado disponible o vendido forma parte de la lógica de stock que acompaña la operación diaria.',
      ],
      identidad: [
        'La jerarquía prioriza el stock: listado claro, fichas completas y llamados a la acción hacia WhatsApp. Se buscó un tono comercial sobrio, con espacio para fotos reales y datos escaneables.',
        'El diseño refuerza que no es un brochure: es una herramienta de venta en uso diario, con presencia digital propia para la agencia y una presentación profesional del inventario.',
      ],
    },
    decisions: [
      {
        title: 'Catálogo administrable, no web estática',
        body: 'La agencia publica, actualiza y retira vehículos sin rehacer la web cada vez que cambia el stock.',
      },
      {
        title: 'Ficha individual por vehículo',
        body: 'Cada unidad tiene su propia página, completa y fácil de compartir con un cliente potencial.',
      },
      {
        title: 'Consulta con contexto',
        body: 'WhatsApp recibe el interés ligado al vehículo publicado, no un mensaje genérico sin referencia.',
      },
      {
        title: 'Filtros y comparación',
        body: 'El visitante busca por texto, tipo, transmisión, combustible o rango de años, y compara opciones antes de consultar.',
      },
      {
        title: 'SEO local y dinámico',
        body: 'Estructura preparada para búsquedas como autos usados Mendoza, Guaymallén, permuta y catálogo de usados, con páginas individuales listas para compartir.',
      },
      {
        title: 'Operación cotidiana',
        body: 'El sitio acompaña el movimiento real: altas, cambios de precio, imágenes nuevas y retiros de unidades vendidas.',
      },
    ],
    result: [
      'Hoy el cliente utiliza el sistema de forma habitual. El catálogo se mantiene actualizado con vehículos reales, las fichas se comparten individualmente y la web centraliza información que antes quedaba dispersa.',
      'El negocio tiene una presencia digital propia, con una presentación más profesional del stock y un proceso de consulta mejor organizado. El proyecto sigue activo.',
    ],
    gallery: [
      { id: 'full', caption: 'Catálogo de vehículos publicados', objectPosition: 'top center', aspectRatio: '16 / 10' },
      {
        id: 'listing',
        caption: 'Listado y datos comerciales',
        objectPosition: '40% 30%',
        aspectRatio: '16 / 9',
      },
      {
        id: 'detail',
        caption: 'Ficha individual de vehículo',
        objectPosition: '55% 45%',
        aspectRatio: '21 / 9',
      },
      {
        id: 'cta',
        caption: 'Consulta comercial por WhatsApp',
        objectPosition: 'bottom center',
        aspectRatio: '16 / 8',
      },
    ],
  },
  'mendoza-insights': {
    number: '02',
    phrase: 'Datos complejos, presentados con claridad.',
    theme: 'mendoza',
    nextId: 'hema',
    context: [
      'Mendoza Insights necesitaba presentar un producto poco habitual para el mercado local: información inmobiliaria ordenada, índices, precios de referencia y análisis para tomar mejores decisiones. No es una inmobiliaria ni un portal de propiedades: es un producto digital de inteligencia inmobiliaria.',
      'Había que presentar una propuesta compleja en una web clara, visual y fácil de recorrer. El sitio tenía que explicar datos sin hacerlo pesado, generar confianza y guiar hacia acciones concretas: comprar el índice, ver una muestra o consultar referencias del mercado.',
    ],
    objectives: [
      'Presentar el producto de análisis inmobiliario con claridad comercial.',
      'Mostrar indicadores de mercado sin abrumar al visitante.',
      'Separar intenciones de búsqueda en páginas específicas (precio por m², valuación, inversión, mercado e índice).',
      'Explicar la metodología de forma comprensible.',
      'Facilitar la compra del índice y el acceso a una muestra gratuita.',
      'Preparar la estructura para posicionamiento orgánico en búsquedas locales.',
    ],
    direction: {
      estructura: [
        'La estructura combina una home comercial con páginas específicas para distintas intenciones de búsqueda: precio por metro cuadrado, valor de una propiedad, inversión inmobiliaria, mercado inmobiliario e índice de valuaciones.',
        'También se trabajaron indicadores, paneles de datos, sparklines, metodología, CTAs, formularios y bloques de confianza para que el usuario entienda qué está viendo y cómo usar esos datos.',
      ],
      identidad: [
        'La home presenta el producto y las landings responden necesidades puntuales. La jerarquía visual prioriza el índice, los indicadores del mercado y los llamados a la acción.',
        'Se buscó un tono sobrio y de confianza: datos visibles, metodología accesible y lenguaje concreto. El foco estuvo en claridad, confianza y posicionamiento orgánico.',
      ],
    },
    decisions: [
      {
        title: 'Ordenar una propuesta compleja',
        body: 'El sitio separa el producto comercial de las páginas que responden búsquedas concretas, sin mezclar todo en la misma landing.',
      },
      {
        title: 'Explicar datos sin hacerlos pesados',
        body: 'Indicadores, sparklines y paneles de mercado presentan referencias claras sin saturar la lectura.',
      },
      {
        title: 'SEO por intención',
        body: 'Páginas específicas para precio por m², valuación, inversión y mercado inmobiliario en Mendoza.',
      },
      {
        title: 'CTAs concretos',
        body: 'Comprar el índice, ver una muestra gratis y consultar metodología como acciones visibles desde la home.',
      },
    ],
    result: [
      'El sitio quedó preparado para comunicar el valor del producto, presentar datos de forma ordenada y guiar al usuario hacia acciones concretas como comprar el índice, ver una muestra o consultar referencias del mercado.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general de la home', objectPosition: 'top center', aspectRatio: '16 / 10' },
      {
        id: 'market',
        caption: 'Panel de indicadores de mercado',
        objectPosition: '78% 45%',
        aspectRatio: '16 / 9',
      },
      {
        id: 'hero',
        caption: 'Propuesta y CTAs principales',
        objectPosition: '18% 40%',
        aspectRatio: '21 / 9',
      },
      {
        id: 'trust',
        caption: 'Bloques de confianza y datos',
        objectPosition: 'bottom left',
        aspectRatio: '16 / 8',
      },
    ],
  },
  hema: {
    number: '03',
    phrase: 'Complejidad médica, explicada con claridad.',
    theme: 'hema',
    nextId: 'giacomelli-seguros',
    context: [
      'HEMA es un laboratorio de diagnóstico genético y molecular: ofrece estudios complejos y necesita que pacientes, familias y derivadores entiendan qué hace el equipo y cómo avanzar sin sentirse abrumados. El sitio no es una tienda de productos: es un canal institucional donde la claridad y la seriedad son parte del mensaje.',
      'Quien entra suele buscar información sobre tipos de estudios, coberturas o una vía humana para consultar. La web tiene que ordenar temas sensibles en bloques legibles y ofrecer un camino claro hacia el contacto, incluyendo WhatsApp para consultas iniciales.',
      'Había que equilibrar rigor y legibilidad: que se entienda la complejidad del servicio, y que una persona sin formación técnica en genética también siga el contenido.',
    ],
    objectives: [
      'Presentar servicios y líneas de trabajo del laboratorio de forma estructurada.',
      'Facilitar que el visitante encuentre el área que le corresponde (por ejemplo, estudios prenatales, oncología hereditaria u otras líneas).',
      'Reflejar respaldo institucional y equipo sin saturar la página.',
      'Centralizar consultas y derivación con enlaces claros a WhatsApp y secciones de contacto.',
      'Ofrecer buena lectura y navegación en dispositivos móviles.',
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
        body: 'Bloques legibles, tipografía y espaciado adecuados. En mobile se evita la sensación de muro cortando en secciones y CTAs.',
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
      'La web cumple hoy un rol claro: presentar al laboratorio, explicar líneas de diagnóstico de forma ordenada y reducir fricción para consultar. Una persona se informa, se ubica en el tipo de estudio o área que le interesa y escribe por el canal que el laboratorio prioriza.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general', objectPosition: 'top center', aspectRatio: '16 / 10' },
      { id: 'services', caption: 'Áreas de servicio', objectPosition: '40% 18%', aspectRatio: '16 / 9' },
      { id: 'nav', caption: 'Navegación principal', objectPosition: 'top left', aspectRatio: '21 / 9' },
      { id: 'cta', caption: 'Consulta y contacto', objectPosition: '85% 50%', aspectRatio: '16 / 8' },
    ],
  },
  'giacomelli-seguros': {
    number: '04',
    phrase: 'Una empresa familiar, llevada al presente.',
    theme: 'giacomelli',
    nextId: 'poletino-servicios',
    context: [
      'Giacomelli Seguros es un productor de seguros con más de 48 años de trayectoria en Mendoza y Zona Cuyo. Atienden personas y empresas que necesitan orientación para elegir coberturas: auto, retiro, salud, comercio, caución y ART. También atienden a quienes ya tienen póliza y quieren revisar si sigue siendo conveniente.',
      'Muchas consultas llegan desde el celular y el visitante suele buscar confianza antes que promesas vacías: saber con quién habla, qué alternativas existen y cómo dar el primer paso. La web debía reflejar atención familiar y directa, sin parecer un comparador genérico ni un trámite frío.',
      'Había que ordenar un catálogo amplio de servicios sin abrumar, destacar el acompañamiento real y dejar visible el contacto cuando más importa, incluida la guía ante siniestros.',
    ],
    objectives: [
      'Presentar coberturas para personas y empresas con lenguaje claro y sin jerga innecesaria.',
      'Comunicar trayectoria, valores y la diferencia del asesoramiento humano frente a elegir cobertura por precio.',
      'Facilitar cotización y consultas por WhatsApp con mensajes contextualizados desde el sitio.',
      'Ofrecer una ruta útil para quien ya tiene seguro y quiere revisar su póliza actual.',
      'Orientar ante siniestros con información práctica de primeros pasos.',
      'Ofrecer buena lectura y navegación en celular.',
    ],
    direction: {
      estructura: [
        'Se estructuró el contenido en bloques que siguen el recorrido del visitante: propuesta de valor, servicios destacados, revisión de pólizas, soluciones para empresas, aseguradoras con las que trabajan y acompañamiento ante siniestros.',
        'Cada cobertura tiene su página con contexto, beneficios y llamados a la acción hacia WhatsApp. La home concentra lo esencial para quien llega sin saber por dónde empezar.',
      ],
      identidad: [
        'La jerarquía visual separa dos capas. De un lado, confianza: años de trayectoria y tono cercano. Del otro, utilidad: qué cubre cada seguro y cómo avanzar. Así no compiten entre sí.',
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
        body: 'El mensaje central es acompañamiento humano, no una cotización suelta. WhatsApp con texto prearmado según intención.',
      },
      {
        title: 'Mantener el contacto visible',
        body: 'CTAs hacia WhatsApp en mobile con barra de contacto visible y footer con matrícula SSN.',
      },
    ],
    result: [
      'La web funciona hoy como puerta de entrada al asesoramiento de Giacomelli: ordena coberturas, transmite trayectoria y deja claro cómo cotizar o pedir orientación. Quien entra entiende opciones, revisa su situación actual y escribe por WhatsApp con contexto, sin buscar el contacto escondido.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general', objectPosition: 'top center', aspectRatio: '16 / 10' },
      { id: 'services', caption: 'Coberturas', objectPosition: '45% 22%', aspectRatio: '16 / 9' },
      { id: 'trust', caption: 'Trayectoria y confianza', objectPosition: '30% 35%', aspectRatio: '21 / 9' },
      { id: 'cta', caption: 'Contacto y cotización', objectPosition: 'bottom center', aspectRatio: '16 / 8' },
    ],
  },
  'poletino-servicios': {
    number: '05',
    phrase: 'Maquinaria real. Comunicación directa.',
    theme: 'poletino',
    nextId: 'dra-giuliana-macchiavello',
    context: [
      'Poletino ofrece alquiler de hidrogrúas, transporte de cargas pesadas y maquinaria para obras en Mendoza y alrededores. La web tenía que hablarle a un comprador B2B: alguien que busca resolver un problema operativo y necesita saber si la empresa lo cubre, en qué zona y cómo contactar.',
      'En este tipo de rubro, la página falla si queda vaga: listados incompletos o un tono demasiado genérico generan desconfianza. El visitante suele comparar pocos proveedores y decide rápido si sigue leyendo o cierra.',
      'El sitio debía transmitir firmeza y practicidad: empresa que trabaja en obra, planta o ruta, no un brochure decorativo.',
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
        'Visualmente se buscó fuerza y claridad: contrastes firmes, tipografía legible y poco adorno en contextos de trabajo real.',
        'El tono es directo y profesional, alineado a un proveedor industrial. El foco está en que el visitante reconozca servicios concretos y entienda el siguiente paso, por encima del marketing creativo.',
      ],
    },
    decisions: [
      {
        title: 'Hablar directo al comprador B2B',
        body: 'Tono operativo para quien necesita resolver un problema en obra, planta o ruta, no un brochure decorativo.',
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
      'La web cumple un rol práctico para el negocio: resume qué ofrece Poletino, da confianza de operación real y deja el canal de consulta a mano. Quien entra desde otro taller o empresa se ubica en minutos y pide cotización sin recorridos confusos.',
    ],
    gallery: [
      { id: 'full', caption: 'Vista general', objectPosition: 'top center', aspectRatio: '16 / 10' },
      { id: 'services', caption: 'Servicios y maquinaria', objectPosition: '50% 28%', aspectRatio: '16 / 9' },
      { id: 'equipment', caption: 'Equipamiento', objectPosition: '60% 40%', aspectRatio: '21 / 9' },
      { id: 'cta', caption: 'Presupuesto y contacto', objectPosition: 'bottom center', aspectRatio: '16 / 8' },
    ],
  },
  'dra-giuliana-macchiavello': {
    number: '06',
    phrase: 'Tratamientos estéticos convertidos en decisiones claras e informadas.',
    theme: 'giuliana',
    nextId: 'avellaneda-automotores',
    context: [
      'La Dra. Giuliana Macchiavello trabaja en armonización orofacial y odontología en Mendoza. Su público llega principalmente desde Instagram buscando información sobre tratamientos, resultados y formas de contacto.',
      'Mostrar procedimientos no alcanzaba. Antes de consultar aparecen dudas sobre la naturalidad del resultado, la seguridad, los tiempos y cuál es el tratamiento adecuado para cada rostro.',
      'La web debía ordenar esa información y poner el criterio profesional de Giuliana en el centro de la marca.',
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
        'La información se organizó alrededor de las necesidades de las pacientes y no como un listado técnico de procedimientos. Cada tratamiento explica qué aspecto ayuda a trabajar, cómo se evalúa y por qué la indicación depende de cada caso.',
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
        body: 'La persona empieza por lo que quiere mejorar, aunque todavía no conozca el nombre del procedimiento.',
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
      'La web funciona como una extensión más clara y completa de su comunicación en redes. Una persona conoce a la doctora, entiende qué tipo de resultados prioriza, explora los tratamientos y resuelve sus principales dudas antes de escribirle.',
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
