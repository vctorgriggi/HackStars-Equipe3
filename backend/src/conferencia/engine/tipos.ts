// Tipos da engine de conformidade. Vocabulário de domínio em português sem
// acentos; uniões literais no lugar de enums (convenção do projeto).

export type Veredito = 'conforme' | 'divergente' | 'nao_conferivel';

export interface ItemChecklist {
  campo: string; // ex.: 'serie-placa'
  fonteFisica: string; // ex.: 'placa'
  obrigatorio: boolean;
}

export interface LeituraCampo {
  campo: string;
  valorLido: string | null;
  confianca: number | null; // 0..1
  regiaoLeitura?: string | null;
  fotoEvidenciaId?: string | null;
}

export interface OpcoesEngine {
  limiarConfianca: number; // parâmetro obrigatório — nunca constante enterrada
}

export interface ResultadoCampo {
  campo: string;
  fonteFisica: string;
  obrigatorio: boolean;
  valorEsperado: string | null;
  valorLido: string | null;
  confianca: number | null;
  veredito: Veredito;
  motivo?: string; // ex.: 'sem-leitura', 'confianca-abaixo-do-limiar', 'sem-valor-esperado'
}

export interface ResultadoConferencia {
  vereditoGeral: Veredito;
  campos: ResultadoCampo[];
}
