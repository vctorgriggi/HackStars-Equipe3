import { Block } from '@aws-sdk/client-textract';

import { interpretarBlocos } from './textract.extractor';
import {
  CampoAlvo,
  FonteImagem,
  LeituraExtraida,
} from '../ports/extractor.port';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// `interpretarBlocos` e pura: estes testes exercitam a heuristica com blocos
// falsos, sem tocar a AWS. E aqui que o spike T2.1 vai registrar o que
// aprender com as fotos reais.

function linha(
  texto: string,
  top: number,
  left = 0.1,
  confidence = 99.2,
): Block {
  return {
    BlockType: 'LINE',
    Text: texto,
    Confidence: confidence,
    Geometry: {
      BoundingBox: { Left: left, Top: top, Width: 0.3, Height: 0.05 },
    },
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

const ALVOS_PLACA: CampoAlvo[] = [
  { campo: 'serie-placa' },
  { campo: 'patrimonio-placa' },
];

/** Só as leituras: a maioria dos casos aqui exercita a heuristica de campo. */
function ler(
  blocos: Block[],
  alvos: CampoAlvo[],
  fonte: FonteImagem,
): LeituraExtraida[] {
  return interpretarBlocos(blocos, alvos, fonte).leituras;
}

function porCampo(leituras: LeituraExtraida[]) {
  return new Map(leituras.map((leitura) => [leitura.campo, leitura]));
}

describe('interpretarBlocos — serie x patrimonio por rotulo', () => {
  it('should separar serie e patrimonio quando o rotulo esta na mesma linha', () => {
    const leituras = porCampo(
      ler(
        [
          linha('TRAEL TRANSFORMADORES', 0.05),
          linha('N° 847233', 0.2),
          linha('PATRIMONIO 251328', 0.3),
        ],
        ALVOS_PLACA,
        foto('placa'),
      ),
    );

    expect(leituras.get('serie-placa')?.valorLido).toBe('847233');
    expect(leituras.get('patrimonio-placa')?.valorLido).toBe('251328');
  });

  it('should separar serie e patrimonio quando o rotulo esta em linha vizinha', () => {
    const leituras = porCampo(
      ler(
        [
          linha('N°', 0.2, 0.1),
          linha('847233', 0.2, 0.25),
          linha('PATRIM.', 0.35, 0.1),
          linha('251328', 0.35, 0.25),
        ],
        ALVOS_PLACA,
        foto('placa'),
      ),
    );

    expect(leituras.get('serie-placa')?.valorLido).toBe('847233');
    expect(leituras.get('patrimonio-placa')?.valorLido).toBe('251328');
  });
});

describe('interpretarBlocos — ambiguidade nao vira chute', () => {
  it('should devolver leitura nula quando dois numeros sem rotulo disputam dois campos', () => {
    const leituras = ler(
      [linha('847233', 0.3), linha('251328', 0.5)],
      ALVOS_PLACA,
      foto('placa'),
    );

    expect(leituras.every((leitura) => leitura.valorLido === null)).toBe(true);
    expect(leituras.every((leitura) => leitura.confianca === null)).toBe(true);
    expect(leituras.every((leitura) => leitura.regiaoLeitura === null)).toBe(
      true,
    );
  });

  it('should aceitar o unico numero quando ha exatamente um campo pendente', () => {
    const [leitura] = ler(
      [linha('847233', 0.5)],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.valorLido).toBe('847233');
    expect(leitura.confianca).toBeCloseTo(0.992);
  });

  it('should ignorar sequencia com menos de seis digitos', () => {
    const [leitura] = ler(
      [linha('12345', 0.5)],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.valorLido).toBeNull();
  });
});

describe('interpretarBlocos — campos textuais', () => {
  it('should ler cliente da linha com mais letras e potencia da linha com kVA', () => {
    const leituras = porCampo(
      ler(
        [
          linha('143091 - Energisa Rondonia', 0.2),
          linha('10 kVA', 0.35),
          linha('PATRIMONIO 251328', 0.5),
        ],
        [
          { campo: 'patrimonio-serigrafia' },
          { campo: 'cliente-serigrafia' },
          { campo: 'potencia-serigrafia' },
        ],
        foto('serigrafia'),
      ),
    );

    expect(leituras.get('cliente-serigrafia')?.valorLido).toBe(
      '143091 - Energisa Rondonia',
    );
    expect(leituras.get('potencia-serigrafia')?.valorLido).toBe('10 kVA');
    expect(leituras.get('patrimonio-serigrafia')?.valorLido).toBe('251328');
  });

  it('should devolver potencia nula quando nenhuma linha tem kVA', () => {
    const [leitura] = ler(
      [linha('ENERGISA', 0.2)],
      [{ campo: 'potencia-serigrafia' }],
      foto('serigrafia'),
    );

    expect(leitura.valorLido).toBeNull();
  });
});

describe('interpretarBlocos — contrato da leitura', () => {
  it('should devolver uma leitura por alvo, na ordem recebida', () => {
    const leituras = ler([], ALVOS_PLACA, foto('placa'));

    expect(leituras.map((leitura) => leitura.campo)).toEqual([
      'serie-placa',
      'patrimonio-placa',
    ]);
  });

  it('should carimbar o fotoEvidenciaId e a regiao lida em toda leitura com valor', () => {
    const [leitura] = ler(
      [linha('847233', 0.5, 0.2)],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.fotoEvidenciaId).toBe('foto-1');
    expect(JSON.parse(leitura.regiaoLeitura ?? '{}')).toEqual({
      Left: 0.2,
      Top: 0.5,
      Width: 0.3,
      Height: 0.05,
    });
  });

  it('should ignorar bloco que nao e LINE', () => {
    const [leitura] = ler(
      [{ ...linha('847233', 0.5), BlockType: 'WORD' }],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.valorLido).toBeNull();
  });

  it('should devolver confianca nula quando o bloco vem sem Confidence', () => {
    const bloco = linha('847233', 0.5);
    delete bloco.Confidence;

    const [leitura] = ler(
      [bloco],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.valorLido).toBe('847233');
    // Leitura sem lastro: a engine transforma isso em `nao_conferivel`.
    expect(leitura.confianca).toBeNull();
  });
});

// O que estes testes protegem: o adapter reaproveita a MESMA resposta do
// Textract (custo AWS zero) e nao entrega duas vezes o mesmo texto — o que
// virou leitura de campo nao volta como achado livre.
describe('interpretarBlocos — achados livres (texto nao consumido)', () => {
  it('should devolver como achado livre a linha que nao virou leitura', () => {
    const { achadosLivres } = interpretarBlocos(
      [
        linha('N° 847233', 0.2),
        linha('PATRIMONIO 251328', 0.3),
        linha('13800 V', 0.4),
        linha('847999', 0.6),
      ],
      ALVOS_PLACA,
      foto('placa'),
    );

    expect(achadosLivres.map((achado) => achado.texto)).toEqual([
      '13800 V',
      '847999',
    ]);
  });

  it('should manter fora dos achados a linha consumida como leitura de campo', () => {
    const { leituras, achadosLivres } = interpretarBlocos(
      [linha('N° 847233', 0.2), linha('PATRIMONIO 251328', 0.3)],
      ALVOS_PLACA,
      foto('placa'),
    );

    expect(leituras.map((leitura) => leitura.valorLido)).toEqual([
      '847233',
      '251328',
    ]);
    expect(achadosLivres).toEqual([]);
  });

  it('should devolver como achado o numero recusado por ambiguidade', () => {
    // Dois numeros sem rotulo disputando dois campos nao viram leitura (o
    // adapter nao chuta) — mas seguem visiveis para o alarme de consistencia.
    const { leituras, achadosLivres } = interpretarBlocos(
      [linha('847233', 0.3), linha('251328', 0.5)],
      ALVOS_PLACA,
      foto('placa'),
    );

    expect(leituras.every((leitura) => leitura.valorLido === null)).toBe(true);
    expect(achadosLivres.map((achado) => achado.texto)).toEqual([
      '847233',
      '251328',
    ]);
  });

  it('should carimbar confianca, regiao e foto de origem no achado', () => {
    const { achadosLivres } = interpretarBlocos(
      [linha('847999', 0.6, 0.4)],
      [{ campo: 'cliente-serigrafia' }],
      foto('serigrafia'),
    );

    expect(achadosLivres).toHaveLength(1);
    expect(achadosLivres[0].confianca).toBeCloseTo(0.992);
    expect(achadosLivres[0].fotoEvidenciaId).toBe('foto-1');
    expect(JSON.parse(achadosLivres[0].regiaoLeitura ?? '{}')).toEqual({
      Left: 0.4,
      Top: 0.6,
      Width: 0.3,
      Height: 0.05,
    });
  });

  it('should marcar confianca zero no achado de bloco sem Confidence', () => {
    const bloco = linha('847999', 0.6);
    delete bloco.Confidence;

    const { achadosLivres } = interpretarBlocos(
      [bloco],
      [{ campo: 'cliente-serigrafia' }],
      foto('serigrafia'),
    );

    // Zero diz "sem lastro" — achado livre so alerta, nunca vira veredito.
    expect(achadosLivres[0].confianca).toBe(0);
  });

  it('should nao devolver achado nenhum quando a foto nao tem texto', () => {
    expect(
      interpretarBlocos([], ALVOS_PLACA, foto('placa')).achadosLivres,
    ).toEqual([]);
  });
});
