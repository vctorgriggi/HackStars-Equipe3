import { Block } from '@aws-sdk/client-textract';

import { interpretarBlocos } from './textract.extractor';
import { CampoAlvo, FonteImagem } from '../ports/extractor.port';

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

function porCampo(leituras: ReturnType<typeof interpretarBlocos>) {
  return new Map(leituras.map((leitura) => [leitura.campo, leitura]));
}

describe('interpretarBlocos — serie x patrimonio por rotulo', () => {
  it('should separar serie e patrimonio quando o rotulo esta na mesma linha', () => {
    const leituras = porCampo(
      interpretarBlocos(
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
      interpretarBlocos(
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
    const leituras = interpretarBlocos(
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
    const [leitura] = interpretarBlocos(
      [linha('847233', 0.5)],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.valorLido).toBe('847233');
    expect(leitura.confianca).toBeCloseTo(0.992);
  });

  it('should ignorar sequencia com menos de seis digitos', () => {
    const [leitura] = interpretarBlocos(
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
      interpretarBlocos(
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
    const [leitura] = interpretarBlocos(
      [linha('ENERGISA', 0.2)],
      [{ campo: 'potencia-serigrafia' }],
      foto('serigrafia'),
    );

    expect(leitura.valorLido).toBeNull();
  });
});

describe('interpretarBlocos — contrato da leitura', () => {
  it('should devolver uma leitura por alvo, na ordem recebida', () => {
    const leituras = interpretarBlocos([], ALVOS_PLACA, foto('placa'));

    expect(leituras.map((leitura) => leitura.campo)).toEqual([
      'serie-placa',
      'patrimonio-placa',
    ]);
  });

  it('should carimbar o fotoEvidenciaId e a regiao lida em toda leitura com valor', () => {
    const [leitura] = interpretarBlocos(
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
    const [leitura] = interpretarBlocos(
      [{ ...linha('847233', 0.5), BlockType: 'WORD' }],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.valorLido).toBeNull();
  });

  it('should devolver confianca nula quando o bloco vem sem Confidence', () => {
    const bloco = linha('847233', 0.5);
    delete bloco.Confidence;

    const [leitura] = interpretarBlocos(
      [bloco],
      [{ campo: 'serie-chumbada-1' }],
      foto('chumbado-1'),
    );

    expect(leitura.valorLido).toBe('847233');
    // Leitura sem lastro: a engine transforma isso em `nao_conferivel`.
    expect(leitura.confianca).toBeNull();
  });
});
