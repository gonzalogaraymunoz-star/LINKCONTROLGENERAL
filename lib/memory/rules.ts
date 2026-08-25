export const CENTRAL_MEMORY_RULES = [
  "El núcleo central no recibe conversaciones completas por defecto.",
  "La operación particular de un cliente permanece en memoria local.",
  "Un aprendizaje puede proponerse al centro solo si puede reutilizarse fuera del proyecto que lo originó.",
  "Las apps hijas nunca escriben directamente en memoria maestra.",
  "Toda inteligencia conserva evidencia y referencias a su fuente.",
  "Una inteligencia no reemplaza el dato fuente.",
  "Toda promoción a memoria central es auditable y versionada.",
  "Eliminar un cliente no elimina automáticamente aprendizajes centrales previamente aprobados.",
] as const;

export function shouldProposeToCentral(input: {
  reusableOutsideOrigin: boolean;
  hasEvidence: boolean;
  conflictsWithConstitution: boolean;
}) {
  if (input.conflictsWithConstitution) return false;
  return input.reusableOutsideOrigin && input.hasEvidence;
}
