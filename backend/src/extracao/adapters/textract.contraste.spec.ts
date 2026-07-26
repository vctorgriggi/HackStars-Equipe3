import { Block } from '@aws-sdk/client-textract';

import { ClasseDeContraste } from './contraste';
import {
  ClassesPorRegiao,
  TextractExtractor,
  interpretarBlocos,
  interpretarComPendencias,
} from './textract.extractor';
import {
  CampoAlvo,
  FonteImagem,
  LeituraExtraida,
} from '../ports/extractor.port';

// PASSO 3 DA HEURISTICA — casamento por CONTRASTE, exercitado sem pixel e sem
// AWS: o mapa de classes entra pronto, como se a medicao ja tivesse acontecido.
//
// O QUE ESTA SUITE PROTEGE:
//   1. a vista com duas marcacoes (topo) resolve os dois campos quando a fisica
//      distingue os numeros;
//   2. um numero so resolve APENAS o campo cujo tipo ele tem;
//   3. duvida (indeterminado) devolve o comportamento antigo: tudo nulo;
//   4. SEM mapa de classes (sharp ausente, `EXTRACAO_RECORTE=off`) nada muda em
//      relacao ao que existia antes de 2026-07-26;
//   5. o rotulo VETA o pixel — as duas evidencias precisam concordar;
//   6. o cenario-ancora (placa) nao passa por aqui.

const REGIAO_RELEVO = { Left: 0.49, Top: 0.38, Width: 0.06, Height: 0.05 };
const REGIAO_TINTA = { Left: 0.1, Top: 0.6, Width: 0.5, Height: 0.12 };
const REGIAO_PLACA = { Left: 0.3, Top: 0.59, Width: 0.02, Height: 0.01 };

function linha(
  texto: string,
  caixa: { Left: number; Top: number; Width: number; Height: number },
  confidence = 98.5,
): Block {
  return {
    BlockType: 'LINE',
    Text: texto,
    Confidence: confidence,
    Geometry: { BoundingBox: { ...caixa } },
  };
}

function foto(fonteFisica: string): FonteImagem {
  return {
    fotoEvidenciaId: 'foto-1',
    fonteFisica,
    imagem: Buffer.from('imagem-de-teste'),
    mimeType: 'image/jpeg',
  };
}

function classes(...pares: [object, ClasseDeContraste][]): ClassesPorRegiao {
  return new Map(
    pares.map(([caixa, classe]) => [JSON.stringify(caixa), classe]),
  );
}

function porCampo(leituras: LeituraExtraida[]) {
  return new Map(leituras.map((leitura) => [leitura.campo, leitura]));
}

const ALVOS_TOPO: CampoAlvo[] = [
  { campo: 'serie-chumbada-topo' },
  { campo: 'patrimonio-serigrafia-topo' },
];

describe('interpretarBlocos — passo 3 na vista do topo (duas marcacoes)', () => {
  // Blocos fieis ao que o Textract devolve em TOPO-2.jpg: a serie chumbada sai
  // como linha propria e a serigrafia sai GRUDADA com a potencia.
  const BLOCOS_DO_TOPO = [
    linha('847233', REGIAO_RELEVO, 98.8),
    linha('10 kVA 251328', REGIAO_TINTA, 98.5),
  ];

  it('should mandar o relevo para a serie chumbada e a tinta para o patrimonio', () => {
    const leituras = porCampo(
      interpretarBlocos(
        BLOCOS_DO_TOPO,
        ALVOS_TOPO,
        foto('topo'),
        classes([REGIAO_RELEVO, 'relevo'], [REGIAO_TINTA, 'tinta']),
      ).leituras,
    );

    expect(leituras.get('serie-chumbada-topo')?.valorLido).toBe('847233');
    expect(leituras.get('patrimonio-serigrafia-topo')?.valorLido).toBe(
      '251328',
    );
  });

  it('should resolver so o patrimonio quando o unico numero e tinta', () => {
    // A tampa fotografada de longe: o OCR pega a serigrafia preta e nao pega o
    // relevo. O patrimonio resolve; a serie chumbada continua nula, porque ela
    // simplesmente nao foi lida.
    const leituras = porCampo(
      interpretarBlocos(
        [linha('251328', REGIAO_TINTA)],
        ALVOS_TOPO,
        foto('topo'),
        classes([REGIAO_TINTA, 'tinta']),
      ).leituras,
    );

    expect(leituras.get('patrimonio-serigrafia-topo')?.valorLido).toBe(
      '251328',
    );
    expect(leituras.get('serie-chumbada-topo')?.valorLido).toBeNull();
  });

  it('should resolver so a serie chumbada quando o unico numero e relevo', () => {
    const leituras = porCampo(
      interpretarBlocos(
        [linha('847233', REGIAO_RELEVO)],
        ALVOS_TOPO,
        foto('topo'),
        classes([REGIAO_RELEVO, 'relevo']),
      ).leituras,
    );

    expect(leituras.get('serie-chumbada-topo')?.valorLido).toBe('847233');
    expect(leituras.get('patrimonio-serigrafia-topo')?.valorLido).toBeNull();
  });

  it('should deixar os DOIS campos nulos quando a classificacao ficou indeterminada', () => {
    // Comportamento de hoje, preservado: medir e nao concluir nao autoriza nada.
    const leituras = interpretarBlocos(
      [linha('251328', REGIAO_TINTA)],
      ALVOS_TOPO,
      foto('topo'),
      classes([REGIAO_TINTA, 'indeterminado']),
    ).leituras;

    expect(leituras.every((leitura) => leitura.valorLido === null)).toBe(true);
  });

  it('should deixar os dois campos nulos quando UM dos numeros ficou indeterminado', () => {
    // O indeterminado envenena o conjunto: com ele solto na foto, resolver o
    // outro seria escolher entre duas hipoteses vivas.
    const leituras = interpretarBlocos(
      BLOCOS_DO_TOPO,
      ALVOS_TOPO,
      foto('topo'),
      classes([REGIAO_RELEVO, 'relevo'], [REGIAO_TINTA, 'indeterminado']),
    ).leituras;

    expect(leituras.every((leitura) => leitura.valorLido === null)).toBe(true);
  });

  it('should carimbar confianca e regiao da linha escolhida pelo contraste', () => {
    const leituras = porCampo(
      interpretarBlocos(
        BLOCOS_DO_TOPO,
        ALVOS_TOPO,
        foto('topo'),
        classes([REGIAO_RELEVO, 'relevo'], [REGIAO_TINTA, 'tinta']),
      ).leituras,
    );

    const serie = leituras.get('serie-chumbada-topo');
    expect(serie?.confianca).toBeCloseTo(0.988);
    expect(JSON.parse(serie?.regiaoLeitura ?? '{}')).toEqual(REGIAO_RELEVO);
    expect(serie?.fotoEvidenciaId).toBe('foto-1');
  });

  it('should tirar dos achados livres a linha que o contraste consumiu', () => {
    const { achadosLivres } = interpretarBlocos(
      BLOCOS_DO_TOPO,
      ALVOS_TOPO,
      foto('topo'),
      classes([REGIAO_RELEVO, 'relevo'], [REGIAO_TINTA, 'tinta']),
    );

    expect(achadosLivres).toEqual([]);
  });
});

describe('interpretarBlocos — sem medicao de contraste (degradacao)', () => {
  // Sem `sharp`, com `EXTRACAO_RECORTE=off` ou com foto que nao decodifica, o
  // mapa chega vazio. Nada aqui pode mudar em relacao ao comportamento anterior.

  it('should recusar os dois campos do topo, como antes de 2026-07-26', () => {
    const leituras = interpretarBlocos(
      [linha('251328', REGIAO_TINTA)],
      ALVOS_TOPO,
      foto('topo'),
    );

    expect(
      leituras.leituras.every((leitura) => leitura.valorLido === null),
    ).toBe(true);
  });

  it('should manter o caso 1-para-1 da vista de uma marcacao so', () => {
    const [leitura] = interpretarBlocos(
      [linha('847233', REGIAO_RELEVO)],
      [{ campo: 'serie-chumbada-traseira' }],
      foto('traseira'),
    ).leituras;

    expect(leitura.valorLido).toBe('847233');
  });

  it('should manter fora dos candidatos o numero grudado em texto', () => {
    // Sem contraste, `10 kVA 251328` nao tem evidencia nenhuma a favor: nao
    // pode virar leitura pela regra da contagem.
    const [leitura] = interpretarBlocos(
      [linha('10 kVA 251328', REGIAO_TINTA)],
      [{ campo: 'patrimonio-serigrafia-topo' }],
      foto('topo'),
    ).leituras;

    expect(leitura.valorLido).toBeNull();
  });
});

describe('interpretarComPendencias — regioes a medir', () => {
  it('should apontar as regioes ambiguas quando ainda nao houve medicao', () => {
    const { regioesAmbiguas } = interpretarComPendencias(
      [linha('847233', REGIAO_RELEVO), linha('10 kVA 251328', REGIAO_TINTA)],
      ALVOS_TOPO,
      foto('topo'),
    );

    expect(regioesAmbiguas).toEqual([
      JSON.stringify(REGIAO_RELEVO),
      JSON.stringify(REGIAO_TINTA),
    ]);
  });

  it('should nao apontar regiao nenhuma quando todos os alvos ja resolveram', () => {
    const { regioesAmbiguas } = interpretarComPendencias(
      [
        linha('N° 847233', REGIAO_RELEVO),
        linha('PATRIMONIO 251328', REGIAO_TINTA),
      ],
      [{ campo: 'serie-placa' }, { campo: 'patrimonio-placa' }],
      foto('placa'),
    );

    expect(regioesAmbiguas).toEqual([]);
  });

  it('should nao apontar regiao nenhuma quando os alvos pendentes sao de tipo indefinido', () => {
    // CENARIO-ANCORA: a vista da placa nao paga medicao de pixel. Os campos
    // dela sao `indefinido` de proposito (`ports/marcacao.ts`).
    const { regioesAmbiguas } = interpretarComPendencias(
      [linha('847833', REGIAO_PLACA), linha('251328', REGIAO_TINTA)],
      [{ campo: 'serie-placa' }, { campo: 'patrimonio-placa' }],
      foto('placa'),
    );

    expect(regioesAmbiguas).toEqual([]);
  });

  it('should desistir da medicao quando algum candidato nao tem bounding box', () => {
    const semGeometria = linha('251328', REGIAO_TINTA);
    delete semGeometria.Geometry;

    const { regioesAmbiguas } = interpretarComPendencias(
      [linha('847233', REGIAO_RELEVO), semGeometria],
      ALVOS_TOPO,
      foto('topo'),
    );

    expect(regioesAmbiguas).toEqual([]);
  });
});

describe('interpretarBlocos — o rotulo VETA o pixel', () => {
  it('should recusar leitura rotulada como patrimonio para campo de serie', () => {
    // Duas evidencias tem de concordar. Se o pixel diz "relevo" mas o texto diz
    // "PATRIMONIO", a leitura nao vai para a serie chumbada.
    const leituras = porCampo(
      interpretarBlocos(
        [
          linha('PATRIMONIO 251328', REGIAO_TINTA),
          linha('PATRIMONIO 847233', REGIAO_RELEVO),
        ],
        [{ campo: 'serie-chumbada-topo' }],
        foto('topo'),
        classes([REGIAO_RELEVO, 'relevo'], [REGIAO_TINTA, 'tinta']),
      ).leituras,
    );

    expect(leituras.get('serie-chumbada-topo')?.valorLido).toBeNull();
  });
});

describe('interpretarBlocos — regressao da lateral direita', () => {
  // FOTO REAL `LATERAL-DIREITA-2.jpg`: a vista pega o tanque (serie chumbada em
  // relevo), a ETIQUETA (com o rotulo `Núm Série:` colado nela) e a PLACA.
  //
  // O bug que isto fixa: o rotulo da etiqueta alcancava tambem o relevo por
  // proximidade, entao os DOIS `847233` viravam familia 'serie' e o unico
  // numero "sem rotulo" que sobrava era o `847833` DA PLACA — que o passo 2
  // entregava como serie chumbada da lateral. Numero errado, campo errado, e
  // uma peca correta caminhando para `divergente`.
  const REGIAO_ETIQUETA = { Left: 0.47, Top: 0.35, Width: 0.02, Height: 0.01 };
  const REGIAO_ROTULO = { Left: 0.45, Top: 0.35, Width: 0.02, Height: 0.01 };
  const REGIAO_TANQUE = { Left: 0.33, Top: 0.47, Width: 0.05, Height: 0.02 };

  const BLOCOS = [
    linha('Núm Série:', REGIAO_ROTULO, 65.5),
    linha('847233', REGIAO_ETIQUETA, 94.5),
    linha('847233', REGIAO_TANQUE, 58.3),
    linha('847833', REGIAO_PLACA, 84.6),
  ];
  const ALVO: CampoAlvo[] = [{ campo: 'serie-chumbada-lateral-direita' }];

  it('should entregar o numero da PLACA sem contraste (o bug, fixado como estava)', () => {
    const [leitura] = interpretarBlocos(
      BLOCOS,
      ALVO,
      foto('lateral-direita'),
    ).leituras;

    expect(leitura.valorLido).toBe('847833');
  });

  it('should entregar o numero do TANQUE com contraste', () => {
    const [leitura] = interpretarBlocos(
      BLOCOS,
      ALVO,
      foto('lateral-direita'),
      classes(
        [REGIAO_ETIQUETA, 'tinta'],
        [REGIAO_TANQUE, 'relevo'],
        [REGIAO_PLACA, 'claro-sobre-escuro'],
      ),
    ).leituras;

    expect(leitura.valorLido).toBe('847233');
    expect(leitura.confianca).toBeCloseTo(0.583);
  });

  it('should deixar o campo NULO quando nenhum candidato e relevo', () => {
    // Nem sequer volta ao passo 2: medir e nao achar relevo e evidencia de que
    // a marcacao nao esta legivel na foto, nao licenca para pegar o que sobrou.
    const [leitura] = interpretarBlocos(
      BLOCOS,
      ALVO,
      foto('lateral-direita'),
      classes(
        [REGIAO_ETIQUETA, 'tinta'],
        [REGIAO_TANQUE, 'claro-sobre-escuro'],
        [REGIAO_PLACA, 'claro-sobre-escuro'],
      ),
    ).leituras;

    expect(leitura.valorLido).toBeNull();
  });
});

describe('TextractExtractor — medicao inconclusiva NUNCA piora o resultado', () => {
  // O INVARIANTE, no nivel do adapter: sem lib de imagem, com a chave de
  // desligamento ou com foto sem textura, a extracao tem de devolver
  // EXATAMENTE o que devolvia antes de existir discriminacao por contraste.
  //
  // Nao e teorico: enquanto esta guarda nao existia, uma foto lisa fazia a
  // classificacao sair `indeterminado` e ANULAVA a leitura que o passo 2 tinha
  // acabado de resolver — quebrando a corroboracao por recorte inteira.

  type ClienteDuble = { cliente: { send: jest.Mock } };

  function extratorCom(blocos: Block[]) {
    const extrator = new TextractExtractor('us-east-1');
    const send = jest.fn().mockResolvedValue({ Blocks: blocos });
    (extrator as unknown as ClienteDuble).cliente = { send };
    return extrator;
  }

  const ALVO_RELEVO: CampoAlvo[] = [{ campo: 'serie-chumbada-traseira' }];

  it('should preservar a leitura do passo 2 quando a foto nao decodifica', async () => {
    const extrator = extratorCom([linha('847233', REGIAO_RELEVO)]);

    const { leituras } = await extrator.extrair(
      { ...foto('traseira'), imagem: Buffer.from('isto-nao-e-imagem') },
      ALVO_RELEVO,
    );

    expect(leituras[0].valorLido).toBe('847233');
  });

  it('should preservar a leitura do passo 2 com EXTRACAO_RECORTE=off', async () => {
    const anterior = process.env.EXTRACAO_RECORTE;
    process.env.EXTRACAO_RECORTE = 'off';

    try {
      const extrator = extratorCom([linha('847233', REGIAO_RELEVO)]);

      const { leituras } = await extrator.extrair(
        foto('traseira'),
        ALVO_RELEVO,
      );

      expect(leituras[0].valorLido).toBe('847233');
      expect(leituras[0].corroboracao).toBe('nao-confirmada');
    } finally {
      if (anterior === undefined) {
        delete process.env.EXTRACAO_RECORTE;
      } else {
        process.env.EXTRACAO_RECORTE = anterior;
      }
    }
  });
});
