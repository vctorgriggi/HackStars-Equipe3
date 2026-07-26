// Normalizacao de texto da engine. Vive em modulo proprio (e nao dentro de
// `engine-conformidade.ts`) porque DOIS consumidores puros dependem dela — a
// comparacao campo a campo e a conferencia de coerencia entre irmas
// (`coerencia.ts`) — e importar uma da outra criaria ciclo de modulo.
// `engine-conformidade.ts` reexporta `normalizar` para nao quebrar quem ja
// importava de la (execucao e extracao).

/**
 * Normaliza um valor apenas para efeito de comparacao: trim, colapso de
 * espacos internos e caixa unica. Comparacao exata — nada de fuzzy match.
 *
 * NFC: 'ô' precomposto e 'o'+combinante são o MESMO texto (equivalência
 * canônica Unicode) — sem isso, QR gerado em iOS/macOS (NFD) divergiria de
 * OCR em NFC. Não é fuzzy: perda de acento continua divergente.
 *
 * Campo parcialmente legivel foi RESOLVIDO como rejeitar sempre (limiar 0.9
 * medido): nao ha similaridade nem percentual em lugar nenhum. O unico
 * criterio alternativo de igualdade e a contencao de TOKEN INTEIRO do modo
 * `contem-token` (`comparacao.ts`), usada so em campo de cliente e por medicao
 * — e ela tambem nao e fuzzy.
 */
export function normalizar(valor: string): string {
  return valor.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Texto presente e nao vazio (string so de espacos nao conta como leitura). */
export function temConteudo(valor: string | null | undefined): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0;
}
