export type CareDifficulty = 'Fácil' | 'Media' | 'Avanzada';

export interface PlantCareProfile {
  nombre: string;
  nombreCientifico: string;
  humedadMinima: number;
  humedadMaxima: number;
  temperaturaIdeal: string;
  luzIdeal: string;
  frecuenciaRiego: string;
  sustratoRecomendado: string;
  nivelDificultad: CareDifficulty;
  consejoCuidado: string;
  senalesAlerta: string[];
  origen: 'gemini' | 'fallback';
  notaOrigen?: string;
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';

/** Caché en memoria para consultas de texto repetidas (respuesta instantánea). */
const textProfileCache = new Map<string, PlantCareProfile>();

interface FallbackRule {
  keywords: string[];
  profile: Omit<PlantCareProfile, 'nombre' | 'origen' | 'notaOrigen'>;
}

const FALLBACK_RULES: FallbackRule[] = [
  {
    keywords: ['nopal', 'opuntia', 'tuna'],
    profile: {
      nombreCientifico: 'Opuntia ficus-indica',
      humedadMinima: 12,
      humedadMaxima: 30,
      temperaturaIdeal: '18°C - 32°C',
      luzIdeal: 'Sol directo (6+ horas diarias)',
      frecuenciaRiego: 'Cada 10–14 días en calor; cada 3 semanas en frío',
      sustratoRecomendado: 'Mezcla para cactus: tierra mineral con arena gruesa, perlita o tezontle',
      nivelDificultad: 'Fácil',
      consejoCuidado:
        'El nopal almacena agua en sus pencas y sufre rápidamente si las raíces permanecen húmedas. Permite que el sustrato se seque por completo antes de volver a regar y asegúrate de que la maceta tenga drenaje excelente.',
      senalesAlerta: [
        'Pencas arrugadas o delgadas: necesita un riego profundo.',
        'Base blanda, oscura o amarillenta: exceso de agua o pudrición de raíz.',
        'Crecimiento muy alargado y delgado: falta de sol directo.',
      ],
    },
  },
  {
    keywords: ['rosa', 'rosal'],
    profile: {
      nombreCientifico: 'Rosa spp.',
      humedadMinima: 45,
      humedadMaxima: 68,
      temperaturaIdeal: '16°C - 26°C',
      luzIdeal: 'Sol directo (5–6 horas diarias, preferible de mañana)',
      frecuenciaRiego: 'Cada 2–3 días, directo a la base sin mojar hojas ni flores',
      sustratoRecomendado: 'Tierra fértil rica en humus de lombriz con perlita para buen drenaje',
      nivelDificultad: 'Media',
      consejoCuidado:
        'Los rosales necesitan sol abundante para florecer y riego regular en la base para prevenir hongos foliares como el oídio. Retira las flores marchitas y aplica abono rico en potasio durante la temporada de floración.',
      senalesAlerta: [
        'Polvo blanco en hojas o brotes: hongo oídio por humedad en el follaje.',
        'Botones caídos o hojas lacias: falta de agua o calor excesivo.',
        'Hojas amarillas con nervios verdes: falta de hierro o drenaje deficiente.',
      ],
    },
  },
  {
    keywords: ['suculenta', 'cactus', 'echeveria', 'aloe', 'sabila', 'crassula', 'jade', 'haworthia'],
    profile: {
      nombreCientifico: 'Crassulaceae / Cactaceae',
      humedadMinima: 15,
      humedadMaxima: 35,
      temperaturaIdeal: '18°C - 28°C',
      luzIdeal: 'Luz brillante intensa o sol directo suave (4–6 h)',
      frecuenciaRiego: 'Cada 7–14 días, solo cuando el sustrato esté 100% seco',
      sustratoRecomendado: '50% tierra negra + 50% perlita, piedra pómez o arena gruesa',
      nivelDificultad: 'Fácil',
      consejoCuidado:
        'Deja secar por completo el sustrato entre riegos y evita mojar el centro de la roseta. Un drenaje rápido es clave para prevenir pudrición de raíces.',
      senalesAlerta: [
        'Hojas blandas y traslúcidas: exceso de riego.',
        'Hojas inferiores arrugadas: señal de sed, toca regar.',
        'Tallo estirado con hojas separadas: necesita más luz.',
      ],
    },
  },
  {
    keywords: ['helecho', 'calathea', 'maranta', 'musgo'],
    profile: {
      nombreCientifico: 'Nephrolepis / Marantaceae',
      humedadMinima: 60,
      humedadMaxima: 80,
      temperaturaIdeal: '16°C - 24°C',
      luzIdeal: 'Luz indirecta suave o semisombra',
      frecuenciaRiego: 'Cada 2–3 días manteniendo humedad uniforme',
      sustratoRecomendado: 'Turba o fibra de coco con humus y un poco de perlita',
      nivelDificultad: 'Media',
      consejoCuidado:
        'Mantén el sustrato ligeramente húmedo sin encharcar y protege la planta del sol directo y corrientes de aire seco. Agradece humedad ambiental alta.',
      senalesAlerta: [
        'Puntas cafés y crujientes: aire demasiado seco o falta de agua.',
        'Hojas amarillas desde la base: sustrato encharcado sin oxígeno.',
        'Color pálido o quemaduras: exceso de sol directo.',
      ],
    },
  },
  {
    keywords: ['albahaca', 'menta', 'hierbabuena', 'cilantro', 'perejil', 'tomate', 'jitomate', 'chile'],
    profile: {
      nombreCientifico: 'Hortaliza / Aromática de riego regular',
      humedadMinima: 50,
      humedadMaxima: 72,
      temperaturaIdeal: '18°C - 27°C',
      luzIdeal: 'Sol directo o luz muy brillante (4–6 h diarias)',
      frecuenciaRiego: 'Cada 1–2 días en clima cálido, sin dejar secar por completo',
      sustratoRecomendado: 'Sustrato universal ligero enriquecido con compost o humus',
      nivelDificultad: 'Fácil',
      consejoCuidado:
        'Riega de forma constante en cuanto la capa superficial empiece a secarse y asegura buena ventilación. Podar las puntas o flores estimula hojas más frondosas y aromáticas.',
      senalesAlerta: [
        'Hojas caídas y blandas: falta inmediata de agua.',
        'Hojas amarillas inferiores: falta de nutrientes o exceso de agua.',
        'Tallos muy delgados: necesita más horas de sol.',
      ],
    },
  },
  {
    keywords: ['monstera', 'costilla de adan', 'potos', 'potus', 'filodendro', 'ficus'],
    profile: {
      nombreCientifico: 'Monstera deliciosa / Araceae',
      humedadMinima: 40,
      humedadMaxima: 65,
      temperaturaIdeal: '18°C - 27°C',
      luzIdeal: 'Luz indirecta brillante (sin sol directo fuerte)',
      frecuenciaRiego: 'Cada 5–7 días cuando los primeros 3 cm estén secos',
      sustratoRecomendado: 'Mezcla aireada: tierra negra, corteza de pino y perlita',
      nivelDificultad: 'Fácil',
      consejoCuidado:
        'Prefiere luz indirecta brillante para desarrollar hojas grandes y fenestradas. Limpia el polvo de las hojas con un paño húmedo y evita dejar agua estancada en el plato.',
      senalesAlerta: [
        'Manchas negras con borde amarillo: exceso de riego.',
        'Hojas enrolladas hacia adentro: falta de agua o baja humedad.',
        'Hojas nuevas sin cortes: necesita un poco más de luz indirecta.',
      ],
    },
  },
  {
    keywords: ['orquidea', 'anturio', 'lirio', 'cuna de moises'],
    profile: {
      nombreCientifico: 'Orchidaceae / Spathiphyllum',
      humedadMinima: 45,
      humedadMaxima: 70,
      temperaturaIdeal: '18°C - 25°C',
      luzIdeal: 'Luz indirecta filtrada (cerca de ventana con cortina)',
      frecuenciaRiego: 'Cada 5–8 días evitando agua encharcada en raíces',
      sustratoRecomendado: 'Corteza de pino gruesa, musgo sphagnum y carbón vegetal',
      nivelDificultad: 'Media',
      consejoCuidado:
        'Usa sustrato muy aireado y riega con agua baja en sales cuando las raíces pierdan el tono verde intenso. Evita mojar el centro de la corona para prevenir pudrición.',
      senalesAlerta: [
        'Raíces plateadas o arrugadas: momento de regar.',
        'Raíces cafés y blandas: exceso de humedad.',
        'Hojas quemadas: exposición a sol directo.',
      ],
    },
  },
  {
    keywords: ['lavanda', 'romero', 'tomillo', 'olivo', 'bugambilia', 'girasol'],
    profile: {
      nombreCientifico: 'Planta mediterránea / de pleno sol',
      humedadMinima: 25,
      humedadMaxima: 45,
      temperaturaIdeal: '16°C - 30°C',
      luzIdeal: 'Pleno sol directo (6+ horas diarias)',
      frecuenciaRiego: 'Cada 4–7 días dejando secar bien la capa superior',
      sustratoRecomendado: 'Sustrato arenoso con excelente drenaje (perlita o grava fina)',
      nivelDificultad: 'Fácil',
      consejoCuidado:
        'Necesita sol directo abundante y drenaje rápido; tolera mucho mejor una ligera sequía que el exceso de humedad en las raíces.',
      senalesAlerta: [
        'Tallos leñosos y hojas grises/cafés en la base: exceso de agua.',
        'Poca floración o aroma débil: falta de sol directo.',
        'Hojas secas quebradizas: sequía prolongada.',
      ],
    },
  },
  {
    keywords: ['lengua de suegra', 'sansevieria', 'espada de san jorge', 'zamioculca'],
    profile: {
      nombreCientifico: 'Dracaena trifasciata',
      humedadMinima: 15,
      humedadMaxima: 35,
      temperaturaIdeal: '16°C - 29°C',
      luzIdeal: 'Luz indirecta media a brillante (tolera poca luz)',
      frecuenciaRiego: 'Cada 10–15 días, solo con sustrato seco',
      sustratoRecomendado: 'Sustrato drenante con perlita o arena gruesa',
      nivelDificultad: 'Fácil',
      consejoCuidado:
        'Una de las plantas más resistentes para interior. Su único enemigo real es el exceso de agua; mantén el umbral de riego bajo y evita regar en invierno si la tierra sigue fresca.',
      senalesAlerta: [
        'Hojas blandas o dobladas desde la base: exceso de riego.',
        'Bordes arrugados: falta prolongada de agua.',
        'Manchas cafés blandas: agua acumulada entre las hojas.',
      ],
    },
  },
];

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatPlantName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Planta de interior';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseDifficulty(value: unknown): CareDifficulty {
  if (typeof value !== 'string') return 'Media';
  const normalized = normalizeText(value);
  if (normalized.includes('facil')) return 'Fácil';
  if (normalized.includes('avanz') || normalized.includes('dificil')) return 'Avanzada';
  return 'Media';
}

function buildFallbackProfile(plantName: string, notaOrigen?: string): PlantCareProfile {
  const normalized = normalizeText(plantName);
  const displayName = formatPlantName(plantName);

  const match = FALLBACK_RULES.find((rule) =>
    rule.keywords.some((kw) => normalized.includes(kw)),
  );

  if (match) {
    return {
      nombre: displayName,
      ...match.profile,
      origen: 'fallback',
      notaOrigen,
    };
  }

  return {
    nombre: displayName,
    nombreCientifico: 'Especie ornamental general',
    humedadMinima: 40,
    humedadMaxima: 65,
    temperaturaIdeal: '18°C - 25°C',
    luzIdeal: 'Luz indirecta brillante (4–6 h diarias)',
    frecuenciaRiego: 'Cada 3–5 días al secarse los primeros 2–3 cm',
    sustratoRecomendado: 'Sustrato universal aireado con 20% perlita',
    nivelDificultad: 'Media',
    consejoCuidado:
      'Mantén luz indirecta constante, evita cambios bruscos de temperatura y riega cuando la capa superficial del sustrato esté seca al tacto.',
    senalesAlerta: [
      'Hojas amarillas y blandas: posible exceso de agua.',
      'Hojas caídas o bordes secos: falta de riego o aire muy seco.',
    ],
    origen: 'fallback',
    notaOrigen,
  };
}

function sanitizeProfile(raw: unknown, requestedName: string): PlantCareProfile {
  if (!raw || typeof raw !== 'object') {
    return buildFallbackProfile(requestedName, 'Respuesta inválida de Gemini; se usó perfil local.');
  }

  const data = raw as Partial<PlantCareProfile>;
  const minRaw = typeof data.humedadMinima === 'number' ? data.humedadMinima : Number(data.humedadMinima);
  const maxRaw = typeof data.humedadMaxima === 'number' ? data.humedadMaxima : Number(data.humedadMaxima);

  if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw)) {
    return buildFallbackProfile(requestedName, 'Métricas incompletas de Gemini; se usó perfil local.');
  }

  const humedadMinima = clamp(minRaw, 10, 85);
  const humedadMaxima = clamp(Math.max(maxRaw, humedadMinima + 10), humedadMinima + 5, 95);
  const senales = Array.isArray(data.senalesAlerta)
    ? data.senalesAlerta
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 4)
    : [];

  return {
    nombre:
      typeof data.nombre === 'string' && data.nombre.trim().length > 0
        ? data.nombre.trim()
        : formatPlantName(requestedName),
    nombreCientifico:
      typeof data.nombreCientifico === 'string' && data.nombreCientifico.trim().length > 0
        ? data.nombreCientifico.trim()
        : 'Especie identificada por IA',
    humedadMinima,
    humedadMaxima,
    temperaturaIdeal:
      typeof data.temperaturaIdeal === 'string' && data.temperaturaIdeal.trim().length > 0
        ? data.temperaturaIdeal.trim()
        : '18°C - 25°C',
    luzIdeal:
      typeof data.luzIdeal === 'string' && data.luzIdeal.trim().length > 0
        ? data.luzIdeal.trim()
        : 'Luz indirecta brillante',
    frecuenciaRiego:
      typeof data.frecuenciaRiego === 'string' && data.frecuenciaRiego.trim().length > 0
        ? data.frecuenciaRiego.trim()
        : 'Cuando la capa superior del sustrato esté seca',
    sustratoRecomendado:
      typeof data.sustratoRecomendado === 'string' && data.sustratoRecomendado.trim().length > 0
        ? data.sustratoRecomendado.trim()
        : 'Sustrato aireado con buen drenaje',
    nivelDificultad: parseDifficulty(data.nivelDificultad),
    consejoCuidado:
      typeof data.consejoCuidado === 'string' && data.consejoCuidado.trim().length > 0
        ? data.consejoCuidado.trim()
        : 'Mantén luz adecuada y riega cuando el sustrato baje del umbral recomendado.',
    senalesAlerta:
      senales.length > 0
        ? senales
        : ['Hojas amarillas o blandas: revisa el drenaje.', 'Hojas caídas: verifica la humedad del suelo.'],
    origen: 'gemini',
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Consulta Gemini 3.8 Flash para obtener una ficha botánica detallada de una planta.
 * Acepta opcionalmente una imagen en Base64 para identificar la especie y evaluar su salud visual.
 * Si falta la API key o falla la red, devuelve un perfil de respaldo detallado.
 */
export async function getPlantCareMetrics(
  plantName: string,
  imageBase64?: string,
  mimeType = 'image/jpeg',
): Promise<PlantCareProfile> {
  const cleanName = plantName.trim();
  const cleanImage = imageBase64?.trim();

  if (!cleanName && !cleanImage) {
    return buildFallbackProfile('Planta de interior');
  }

  const cacheKey = !cleanImage ? normalizeText(cleanName) : null;
  if (cacheKey) {
    const cached = textProfileCache.get(cacheKey);
    if (cached) return cached;
  }

  const fallbackLabel = cleanName || 'Planta de interior';
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return buildFallbackProfile(
      fallbackLabel,
      'Falta configurar VITE_GEMINI_API_KEY; mostrando perfil local.',
    );
  }

  const promptText = cleanImage
    ? `Eres un experto en botánica, jardinería y riego automático. Analiza la foto adjunta de la planta` +
      `${cleanName ? ` (el usuario sugiere "${cleanName}")` : ''}. ` +
      `Identifica la especie con precisión, evalúa su estado de salud visual (hojas, color, hidratación o signos de estrés) ` +
      `e incluye ese diagnóstico en "consejoCuidado". Devuelve una ficha práctica y específica para esa especie:\n` +
      `- "nombre": nombre común en español.\n` +
      `- "nombreCientifico": nombre científico en latín.\n` +
      `- "humedadMinima": entero entre 10 y 85 (umbral mínimo de humedad del suelo en % para activar riego).\n` +
      `- "humedadMaxima": entero mayor a humedadMinima (hasta 95).\n` +
      `- "temperaturaIdeal": rango en formato "18°C - 26°C".\n` +
      `- "luzIdeal": exposición solar específica (p. ej. "Sol directo (6+ horas)" o "Luz indirecta brillante").\n` +
      `- "frecuenciaRiego": guía clara de frecuencia según clima.\n` +
      `- "sustratoRecomendado": mezcla de tierra y drenaje ideal para esa especie.\n` +
      `- "nivelDificultad": exactamente uno de "Fácil", "Media" o "Avanzada".\n` +
      `- "consejoCuidado": diagnóstico visual + guía explicativa de 2 a 3 oraciones en español (220-380 caracteres).\n` +
      `- "senalesAlerta": arreglo de 3 síntomas concretos para detectar problemas a tiempo en esta especie.`
    : `Eres un experto en botánica, jardinería y riego automático. Para la planta "${cleanName}", ` +
      `genera una ficha botánica específica y bien explicada (no genérica) para un macetero inteligente con sensor de humedad del suelo (%):\n` +
      `- "nombre": nombre común en español.\n` +
      `- "nombreCientifico": nombre científico en latín.\n` +
      `- "humedadMinima": entero entre 10 y 85 (umbral mínimo de humedad del suelo en % para activar la bomba).\n` +
      `- "humedadMaxima": entero mayor a humedadMinima (hasta 95).\n` +
      `- "temperaturaIdeal": rango en formato "18°C - 26°C".\n` +
      `- "luzIdeal": exposición solar específica (p. ej. "Sol directo (6+ horas)" o "Luz indirecta suave").\n` +
      `- "frecuenciaRiego": frecuencia orientativa de riego y cómo comprobar el sustrato.\n` +
      `- "sustratoRecomendado": mezcla ideal de tierra y drenaje para esta especie.\n` +
      `- "nivelDificultad": exactamente uno de "Fácil", "Media" o "Avanzada".\n` +
      `- "consejoCuidado": explicación práctica de 2 a 3 oraciones en español sobre cómo cuidarla mejor y por qué necesita ese nivel de riego (220-360 caracteres).\n` +
      `- "senalesAlerta": arreglo de 3 síntomas concretos (ej. hojas amarillas, arrugadas, manchas) y qué significan en esta planta.`;

  const parts: GeminiPart[] = [{ text: promptText }];
  if (cleanImage) {
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanImage,
      },
    });
  }

  try {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              nombre: { type: 'STRING' },
              nombreCientifico: { type: 'STRING' },
              humedadMinima: { type: 'INTEGER' },
              humedadMaxima: { type: 'INTEGER' },
              temperaturaIdeal: { type: 'STRING' },
              luzIdeal: { type: 'STRING' },
              frecuenciaRiego: { type: 'STRING' },
              sustratoRecomendado: { type: 'STRING' },
              nivelDificultad: { type: 'STRING' },
              consejoCuidado: { type: 'STRING' },
              senalesAlerta: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: [
              'nombre',
              'nombreCientifico',
              'humedadMinima',
              'humedadMaxima',
              'temperaturaIdeal',
              'luzIdeal',
              'frecuenciaRiego',
              'sustratoRecomendado',
              'nivelDificultad',
              'consejoCuidado',
              'senalesAlerta',
            ],
          },
          thinkingConfig: {
            thinkingLevel: 'minimal',
          },
        },
      }),
    });

    if (!res.ok) {
      let apiDetail = '';
      try {
        const errPayload = (await res.json()) as { error?: { message?: string } };
        apiDetail = errPayload.error?.message?.trim() ?? '';
      } catch {
        // ignore non-JSON error body
      }
      const reason = apiDetail
        ? `Gemini API (${res.status}): ${apiDetail}`
        : `Gemini API respondió con estado ${res.status}; usando perfil local.`;
      console.warn(reason);
      return buildFallbackProfile(fallbackLabel, reason);
    }

    const payload: GeminiResponse = await res.json();
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return buildFallbackProfile(fallbackLabel, 'Gemini devolvió una respuesta vacía; usando perfil local.');
    }

    const parsed: unknown = JSON.parse(rawText);
    const profile = sanitizeProfile(parsed, fallbackLabel);
    if (cacheKey && profile.origen === 'gemini') {
      textProfileCache.set(cacheKey, profile);
    }
    return profile;
  } catch (err) {
    console.warn('Error consultando Gemini API; usando perfil de respaldo:', err);
    return buildFallbackProfile(
      fallbackLabel,
      'No se pudo conectar con Gemini API; mostrando perfil local.',
    );
  }
}
