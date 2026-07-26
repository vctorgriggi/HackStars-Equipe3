"use client";

/**
 * VOCABULÁRIO DE TELA da conferência: como um dado da API vira texto que o
 * operador entende em pé, de luva, com a peça na frente.
 *
 * Tudo aqui é APRESENTAÇÃO. Nenhuma função deste arquivo decide, filtra ou
 * compara nada — se uma delas não reconhecer um valor, ela devolve o valor
 * cru, nunca um palpite. Por isso a tela mostra sempre o nome técnico do campo
 * junto do rótulo bonito: quando o rótulo estiver errado, o operador ainda
 * consegue falar com o suporte usando o nome que o sistema usa.
 */

import {
  FONTES_FISICAS,
  ROTULO_FONTE_FISICA,
  type FonteFisica,
  type MotivoCampo,
  type TipoDeMarcacao,
} from "@/lib/tipos";

/* ------------------------------------------------------------------ *
 * Campos e vistas
 * ------------------------------------------------------------------ */

/**
 * O PREFIXO do nome do campo é contrato da API (é por ele que ela acha o valor
 * esperado no QR) — então é seguro traduzi-lo. O resto do nome
 * (`-chumbada-topo`) não vira texto: a marcação e a vista já aparecem como
 * chips próprios, com dado que a API mandou.
 */
const BASE_DO_CAMPO: Record<string, string> = {
  serie: "Número de série",
  patrimonio: "Patrimônio",
  cliente: "Cliente",
  potencia: "Potência",
};

export function rotuloCampo(campo: string): string {
  const prefixo = campo.split("-")[0] ?? campo;
  return BASE_DO_CAMPO[prefixo] ?? campo;
}

/** Nome da vista da peça; valor fora do vocabulário aparece como veio. */
export function rotuloVista(fonteFisica: string): string {
  return ehFonteFisica(fonteFisica)
    ? ROTULO_FONTE_FISICA[fonteFisica]
    : fonteFisica;
}

export function ehFonteFisica(valor: string): valor is FonteFisica {
  return (FONTES_FISICAS as readonly string[]).includes(valor);
}

/* ------------------------------------------------------------------ *
 * Como a marcação foi gravada
 * ------------------------------------------------------------------ */

export const ROTULO_MARCACAO: Record<TipoDeMarcacao, string> = {
  relevo: "Relevo",
  tinta: "Tinta",
  indefinido: "Placa/rótulo",
};

/**
 * O que muda no ENQUADRAMENTO. Não é enfeite: a medição do spike mostrou que,
 * no relevo, a confiança do OCR mede enquadramento e não correção — foto mal
 * enquadrada não gera erro, gera `nao_conferivel` e uma ida a mais até a peça.
 */
export function dicasDeCaptura(
  tipoMarcacao: TipoDeMarcacao,
  fonteFisica: string,
): string[] {
  const dicas: string[] = [];

  if (tipoMarcacao === "relevo") {
    dicas.push(
      "Relevo tem a cor do tanque: chegue perto até a marcação preencher o quadro e use luz de lado para criar sombra.",
    );
  }

  if (tipoMarcacao === "tinta") {
    dicas.push(
      "Serigrafia em tinta preta: enquadre o texto inteiro e evite o brilho do flash sobre a pintura.",
    );
  }

  if (fonteFisica === "placa" || fonteFisica === "etiqueta") {
    dicas.push(
      "É um close: aproxime até a placa (ou a etiqueta) ocupar quase todo o quadro — de longe o texto não é lido.",
    );
  }

  return dicas;
}

/* ------------------------------------------------------------------ *
 * Motivo do `nao_conferivel`
 * ------------------------------------------------------------------ */

export interface ExplicacaoMotivo {
  /** O que aconteceu, na língua do chão de fábrica. */
  titulo: string;
  /** O que fazer — a diferença entre "refotografe" e "vá olhar a peça". */
  acao: string;
}

const MOTIVOS: Record<MotivoCampo, ExplicacaoMotivo> = {
  "sem-valor-esperado": {
    titulo: "A etiqueta não traz este dado.",
    acao: "Não há com o que comparar; o campo fica sem veredito.",
  },
  "sem-leitura": {
    titulo: "A visão não achou este número na foto.",
    acao: "Refotografe a vista mais perto, com a marcação inteira no quadro.",
  },
  "leituras-conflitantes": {
    titulo: "A mesma vista devolveu números diferentes.",
    acao: "Refotografe isolando a marcação — havia mais de um número no quadro.",
  },
  "leitura-de-outro-campo": {
    titulo: "O número lido pertence a outro campo da peça.",
    acao: "Refotografe enquadrando só a marcação deste campo.",
  },
  "confianca-abaixo-do-limiar": {
    titulo: "A leitura saiu fraca demais para afirmar qualquer coisa.",
    acao: "Refotografe com mais luz e menos distância. Aqui o sistema se recusa a chutar.",
  },
  "leitura-nao-corroborada": {
    titulo: "Relevo lido sem confirmação.",
    acao: "O sistema não acusa a peça com uma leitura só de marcação chumbada. Refotografe preenchendo o quadro — ou confira a posição com o olho.",
  },
};

export function explicarMotivo(
  motivo: MotivoCampo | undefined,
): ExplicacaoMotivo | null {
  if (!motivo) return null;
  return MOTIVOS[motivo] ?? null;
}

/* ------------------------------------------------------------------ *
 * Números
 * ------------------------------------------------------------------ */

const PERCENTUAL = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

/**
 * Confiança como a API mandou. Sem cor e sem juízo: dizer "boa" ou "ruim" seria
 * aplicar limiar no cliente, que é justamente o proibido — quem já aplicou o
 * limiar foi a engine, e o resultado dela é o veredito ao lado.
 */
export function formatarConfianca(confianca: number | null): string {
  if (confianca === null || Number.isNaN(confianca)) return "—";
  return PERCENTUAL.format(confianca);
}

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : DATA_HORA.format(data);
}

/* ------------------------------------------------------------------ *
 * Custo da visão (transparência, SPEC constraint 4)
 * ------------------------------------------------------------------ */

/**
 * Teto por foto: 3 chamadas ao Textract (a foto inteira + 2 recortes de
 * corroboração do relevo), a US$ 0,0015 cada — o teto é fixo no adapter, não um
 * laço. Serve para o operador saber que o botão custa dinheiro, e para ninguém
 * achar que apertar de novo é grátis.
 */
// Valor ESPELHADO do teto do adapter
// (`MAXIMO_DE_CHAMADAS_POR_FOTO` em
// `backend/src/extracao/adapters/textract.extractor.ts`) × o preço da chamada:
// revisar se a API mudar as margens de corroboração ou o serviço de visão.
export const CUSTO_MAXIMO_POR_FOTO = 0.0045;

const DOLAR = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function custoMaximoDaVisao(fotos: number): string {
  return DOLAR.format(fotos * CUSTO_MAXIMO_POR_FOTO);
}
