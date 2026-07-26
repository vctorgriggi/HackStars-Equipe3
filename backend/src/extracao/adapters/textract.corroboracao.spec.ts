import { Block } from '@aws-sdk/client-textract';
import sharp from 'sharp';

import {
  TextractExtractor,
  lerValorAncorado,
  menorConfianca,
} from './textract.extractor';
import {
  CampoAlvo,
  FonteImagem,
  LeituraExtraida,
} from '../ports/extractor.port';

// CONSENSO DE RECORTES (spike de 2026-07-25). O que estes testes protegem:
//
// 1. leitura de RELEVO so e aceita quando os dois recortes releem o MESMO
//    valor — e a confianca que sobra e a menor das tres;
// 2. recorte que le OUTRO numero anula a leitura (nunca elege vencedora);
// 3. recorte que nao le nada naquela regiao (ou nem acontece) NAO anula: marca
//    `nao-confirmada`, e quem se recusa a acusar e a engine;
// 4. campo IMPRESSO (serie-placa) nao paga recorte nenhum e sai sem
//    corroboracao — o cenario-ancora depende disso;
// 5. o teto de 3 chamadas por foto e absoluto (constraint 4 do SPEC).
//
// A AWS nao e tocada: o `send` do cliente e substituido por um duble. A imagem
// e real (gerada com sharp), entao o caminho de recorte roda de verdade.

const REGIAO_DA_LEITURA = { Left: 0.4, Top: 0.5, Width: 0.3, Height: 0.05 };

function linha(texto: string, confidence = 99.2): Block {
  return {
    BlockType: 'LINE',
    Text: texto,
    Confidence: confidence,
    Geometry: { BoundingBox: { ...REGIAO_DA_LEITURA } },
  };
}

/** Bloco de recorte: cobre o recorte inteiro, entao sempre casa com a ancora. */
function linhaDoRecorte(texto: string, confidence: number): Block {
  return {
    BlockType: 'LINE',
    Text: texto,
    Confidence: confidence,
    Geometry: { BoundingBox: { Left: 0, Top: 0, Width: 1, Height: 1 } },
  };
}

type ClienteDuble = { cliente: { send: jest.Mock } };

function extratorCom(respostas: Block[][]) {
  const extrator = new TextractExtractor('us-east-1');
  const send = jest.fn();
  for (const blocos of respostas) {
    send.mockResolvedValueOnce({ Blocks: blocos });
  }
  send.mockResolvedValue({ Blocks: [] });
  (extrator as unknown as ClienteDuble).cliente = { send };

  return { extrator, send };
}

const ALVO_RELEVO: CampoAlvo[] = [{ campo: 'serie-chumbada-traseira' }];

describe('TextractExtractor — consenso de recortes', () => {
  let fotoReal: Buffer;

  beforeAll(async () => {
    fotoReal = await sharp({
      create: { width: 1000, height: 1000, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .toBuffer();
  });

  function foto(imagem: Buffer = fotoReal): FonteImagem {
    return {
      fotoEvidenciaId: 'foto-1',
      fonteFisica: 'traseira',
      imagem,
      mimeType: 'image/jpeg',
    };
  }

  it('should confirmar a leitura quando os dois recortes releem o mesmo valor', async () => {
    const { extrator, send } = extratorCom([
      [linha('847233', 99.2)],
      [linhaDoRecorte('847233', 95.0)],
      [linhaDoRecorte('847233', 91.4)],
    ]);

    const { leituras } = await extrator.extrair(foto(), ALVO_RELEVO);

    expect(leituras[0].valorLido).toBe('847233');
    expect(leituras[0].corroboracao).toBe('confirmada');
    // A MENOR das tres: a evidencia mais fraca e a que vale.
    expect(leituras[0].confianca).toBeCloseTo(0.914);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('should anular a leitura quando um recorte le OUTRO numero', async () => {
    // O caso que motivou tudo: 847233 (certo) x 847833 (errado) a 0,3 ponto de
    // confianca. Sem vencedora: nulo vira nao_conferivel na engine.
    const { extrator, send } = extratorCom([
      [linha('847233', 84.3)],
      [linhaDoRecorte('847833', 84.6)],
    ]);

    const { leituras } = await extrator.extrair(foto(), ALVO_RELEVO);

    expect(leituras[0].valorLido).toBeNull();
    expect(leituras[0].confianca).toBeNull();
    expect(leituras[0].regiaoLeitura).toBeNull();
    expect(leituras[0].corroboracao).toBe('nao-confirmada');
    // Discordancia encerra na hora: nao se paga o terceiro recorte.
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('should preservar o valor quando o recorte nao le nada na regiao', async () => {
    // Falta de segunda evidencia NAO e contradicao. Anular aqui faria uma falha
    // de enquadramento zerar leituras boas e derrubar o criterio 3 do SPEC.
    const { extrator } = extratorCom([[linha('847233')], []]);

    const { leituras } = await extrator.extrair(foto(), ALVO_RELEVO);

    expect(leituras[0].valorLido).toBe('847233');
    expect(leituras[0].corroboracao).toBe('nao-confirmada');
  });

  it('should ignorar numero do recorte que nao casa com a regiao ancorada', async () => {
    // Marcacao vizinha dentro do mesmo recorte (o topo tem serie chumbada E
    // patrimonio serigrafado) nao pode corroborar a leitura de outra posicao.
    const vizinho: Block = {
      BlockType: 'LINE',
      Text: '251328',
      Confidence: 99.0,
      Geometry: {
        BoundingBox: { Left: 0.0, Top: 0.0, Width: 0.05, Height: 0.05 },
      },
    };
    const ancorado = linhaDoRecorte('847233', 97.0);
    ancorado.Geometry = {
      BoundingBox: { Left: 0.2, Top: 0.2, Width: 0.6, Height: 0.6 },
    };

    const { extrator } = extratorCom([
      [linha('847233')],
      [vizinho],
      [ancorado],
    ]);

    const { leituras } = await extrator.extrair(foto(), ALVO_RELEVO);

    // O primeiro recorte so viu o vizinho (fora da ancora) — sem corroboracao,
    // e sem contradicao inventada.
    expect(leituras[0].valorLido).toBe('847233');
    expect(leituras[0].corroboracao).toBe('nao-confirmada');
  });

  it('should degradar para UMA chamada quando nao ha como recortar', async () => {
    // Buffer que nao decodifica = mesmo galho da lib nativa ausente
    // (`abrirImagem` devolve null). O sistema segue: leitura preservada, sem
    // corroboracao.
    const { extrator, send } = extratorCom([[linha('847233')]]);

    const { leituras } = await extrator.extrair(
      foto(Buffer.from('isto-nao-e-imagem')),
      ALVO_RELEVO,
    );

    expect(leituras[0].valorLido).toBe('847233');
    expect(leituras[0].corroboracao).toBe('nao-confirmada');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('should nao corroborar (nem gastar chamada) campo IMPRESSO — cenario-ancora', async () => {
    // A placa le a 99,9% e e o campo que TEM de continuar sendo acusado.
    const { extrator, send } = extratorCom([
      [linha('N° 847833'), linha('PATRIMONIO 251328')],
    ]);

    const { leituras } = await extrator.extrair(
      { ...foto(), fonteFisica: 'placa' },
      [{ campo: 'serie-placa' }, { campo: 'patrimonio-placa' }],
    );

    expect(leituras[0].valorLido).toBe('847833');
    expect(leituras[0].corroboracao).toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('should marcar como nao corroborada a leitura de relevo sem bounding box', async () => {
    const semGeometria = linha('847233');
    delete semGeometria.Geometry;

    const { extrator, send } = extratorCom([[semGeometria]]);

    const { leituras } = await extrator.extrair(foto(), ALVO_RELEVO);

    expect(leituras[0].valorLido).toBe('847233');
    expect(leituras[0].corroboracao).toBe('nao-confirmada');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('should nao corroborar quando a releitura do recorte falha', async () => {
    const extrator = new TextractExtractor('us-east-1');
    const send = jest
      .fn()
      .mockResolvedValueOnce({ Blocks: [linha('847233')] })
      .mockRejectedValue(new Error('throttling'));
    (extrator as unknown as ClienteDuble).cliente = { send };

    const { leituras } = await extrator.extrair(foto(), ALVO_RELEVO);

    expect(leituras[0].valorLido).toBe('847233');
    expect(leituras[0].corroboracao).toBe('nao-confirmada');
  });

  it('should respeitar o teto de 3 chamadas por foto (orcamento)', async () => {
    // Branch defensivo: hoje a heuristica nunca resolve DUAS leituras de relevo
    // na mesma foto (duas series sem rotulo caem no caso ambiguo e saem nulas),
    // entao o orcamento so se esgota se isso mudar. O teto e da constraint 4 do
    // SPEC e nao pode depender da heuristica de hoje.
    const { extrator, send } = extratorCom([
      [linhaDoRecorte('847233', 96)],
      [linhaDoRecorte('847233', 96)],
    ]);
    const emRelevo = (campo: string): LeituraExtraida => ({
      campo,
      valorLido: '847233',
      confianca: 0.99,
      regiaoLeitura: JSON.stringify(REGIAO_DA_LEITURA),
      fotoEvidenciaId: 'foto-1',
    });

    const corroborar = (
      extrator as unknown as {
        corroborarRelevos: (
          fonte: FonteImagem,
          leituras: LeituraExtraida[],
        ) => Promise<LeituraExtraida[]>;
      }
    ).corroborarRelevos.bind(extrator);

    const saida = await corroborar(foto(), [
      emRelevo('serie-chumbada-topo'),
      emRelevo('serie-chumbada-traseira'),
    ]);

    expect(saida[0].corroboracao).toBe('confirmada');
    expect(saida[1].corroboracao).toBe('nao-confirmada');
    // Duas releituras no total: a segunda leitura nao ganha orcamento proprio.
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('lerValorAncorado', () => {
  const ancora = { Left: 0.25, Top: 0.25, Width: 0.5, Height: 0.5 };

  it('should escolher a linha numerica de maior sobreposicao com a ancora', () => {
    const dentro: Block = {
      BlockType: 'LINE',
      Text: '847233',
      Confidence: 95,
      Geometry: {
        BoundingBox: { Left: 0.3, Top: 0.3, Width: 0.4, Height: 0.4 },
      },
    };
    const deLado: Block = {
      BlockType: 'LINE',
      Text: '251328',
      Confidence: 99,
      Geometry: {
        BoundingBox: { Left: 0.7, Top: 0.3, Width: 0.2, Height: 0.1 },
      },
    };

    expect(lerValorAncorado([deLado, dentro], ancora)).toEqual({
      valor: '847233',
      confianca: 0.95,
    });
  });

  it('should devolver null quando nada numerico toca a ancora', () => {
    const longe: Block = {
      BlockType: 'LINE',
      Text: '847233',
      Confidence: 99,
      Geometry: {
        BoundingBox: { Left: 0.8, Top: 0.8, Width: 0.1, Height: 0.1 },
      },
    };

    expect(lerValorAncorado([longe], ancora)).toBeNull();
  });

  it('should ignorar linha com mais de um numero (ambiguidade nao corrobora)', () => {
    const dois: Block = {
      BlockType: 'LINE',
      Text: '847233 251328',
      Confidence: 99,
      Geometry: { BoundingBox: { Left: 0, Top: 0, Width: 1, Height: 1 } },
    };

    expect(lerValorAncorado([dois], ancora)).toBeNull();
  });
});

describe('menorConfianca', () => {
  it('should devolver a menor das evidencias', () => {
    expect(menorConfianca([0.99, 0.95, 0.91])).toBeCloseTo(0.91);
  });

  it('should devolver null quando alguma evidencia veio sem confianca', () => {
    // Sem lastro em uma das leituras, o conjunto nao tem lastro.
    expect(menorConfianca([0.99, null])).toBeNull();
  });
});
