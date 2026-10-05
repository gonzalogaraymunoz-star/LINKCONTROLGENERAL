export type TechnologyStatus = "connected" | "partial" | "planned";

export type MicelioTechnology = {
  id: string;
  name: string;
  role: string;
  owner: string;
  repository: string;
  vercelProject: string | null;
  status: TechnologyStatus;
  receives: string[];
  contributes: string[];
  nextIntegration: string;
};

export const MICELIO_TECHNOLOGIES: MicelioTechnology[] = [
  {
    id: "playground",
    name: "LINK Preview Studio",
    role: "Archivo visual vivo y memoria de versiones de las construcciones LINK.",
    owner: "Playground",
    repository: "gonzalogaraymunoz-star/LINK-PREVIEW-STUDIO",
    vercelProject: "playground",
    status: "partial",
    receives: ["resultado visual aprobado", "version", "referencias", "artefactos de preview"],
    contributes: ["preview", "historial visual", "comparacion responsive", "referencias reutilizables"],
    nextIntegration: "Conectar el indice visual al Micelio sin duplicar proyectos ni memoria.",
  },
  {
    id: "factory",
    name: "LINK Factory",
    role: "Taller material de GÉNESIS para construir y transformar capacidades.",
    owner: "GÉNESIS",
    repository: "gonzalogaraymunoz-star/LINKFACTORY",
    vercelProject: "linkfactory",
    status: "partial",
    receives: ["mision", "contexto", "skills", "reglas", "referencias", "evidencia"],
    contributes: ["construccion", "version", "prueba", "artefacto", "evento"],
    nextIntegration: "Expandir Build Mode desde HTML hacia capacidades LINK verificables.",
  },
  {
    id: "digital",
    name: "LINK Digital",
    role: "Puerta comercial que transforma conversaciones y dolores en oportunidades estructuradas.",
    owner: "LINK Digital",
    repository: "gonzalogaraymunoz-star/LINKDIGITALWEB",
    vercelProject: "linkdigitalweb",
    status: "partial",
    receives: ["entrevista", "necesidad", "dolor", "fortaleza", "contexto de negocio"],
    contributes: ["mapa de negocio", "oportunidad", "lead", "mision candidata"],
    nextIntegration: "Agregar diagnostico conversacional y cruce contra capacidades existentes.",
  },
];

export const MICELIO_RECEPTION_FLOW = [
  "percibir",
  "identificar",
  "resolver_dueno",
  "contextualizar",
  "decidir",
  "ejecutar",
  "evidenciar",
  "aprender",
] as const;
