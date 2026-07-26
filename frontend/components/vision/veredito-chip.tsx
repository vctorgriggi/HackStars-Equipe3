// Chip do veredito de conformidade como a API o gravou (regra de ouro: o
// front só mapeia as 3 strings para cor — nunca calcula nem "corrige").
// Compartilhado entre listagem e detalhe (2º consumidor promove p/ cá).

import { NeutralChip, StatusChip } from "@/components/ui/chip";
import { VEREDITO_LABELS } from "@/lib/domain/transformador-api";
import { VEREDITO_TO_READING, type Veredito } from "@/lib/domain/types";

export function VereditoChip({ veredito }: { veredito: Veredito | null }) {
  // null é estado legítimo (peça nunca conferida / conferência sem veredito)
  // — chip neutro, nunca um veredito inventado.
  if (!veredito) return <NeutralChip>Sem conferência</NeutralChip>;
  return (
    <StatusChip
      status={VEREDITO_TO_READING[veredito]}
      label={VEREDITO_LABELS[veredito]}
    />
  );
}
