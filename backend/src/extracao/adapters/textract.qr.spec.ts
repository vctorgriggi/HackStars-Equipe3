import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Block } from '@aws-sdk/client-textract';

import { CampoAlvo, FonteImagem } from '../ports/extractor.port';
import { TextractExtractor } from './textract.extractor';

// ROTEAMENTO DOS DOIS CANAIS NA MESMA FOTO: o close da placa carrega quatro
// campos da checklist — dois de texto impresso (OCR, pago) e dois de QR
// (decode local, de graca). O que estes testes protegem:
//
// 1. o campo `*-qr` NAO disputa numero de OCR, apesar de ter prefixo
//    `serie-`/`patrimonio-` como qualquer outro;
// 2. e por isso a placa pode se contradizer: impresso 847833, QR 847233 — os
//    dois lados aparecem na MESMA resposta, e a incoerencia entre irmaos passa
//    a ser visivel dentro de uma peca so;
// 3. foto cujos alvos sao TODOS de QR nao chama o Textract (constraint 4);
// 4. QR ilegivel nao contamina as leituras de OCR da mesma foto.
//
// A AWS nao e tocada (o `send` do cliente e um duble); a imagem e o QR REAL da
// placa, entao o decode roda de verdade.

const FIXTURE_QR = join(__dirname, '__fixtures__', 'qr-placa-posicional.png');

const ALVOS_DA_PLACA: CampoAlvo[] = [
  { campo: 'serie-placa' },
  { campo: 'patrimonio-placa' },
  { campo: 'serie-placa-qr' },
  { campo: 'patrimonio-placa-qr' },
];

function linha(texto: string, top: number): Block {
  return {
    BlockType: 'LINE',
    Text: texto,
    Confidence: 99.8,
    Geometry: {
      BoundingBox: { Left: 0.1, Top: top, Width: 0.4, Height: 0.05 },
    },
  };
}

/** O que o Textract le NA PLACA IMPRESSA da peca de demo (serie errada). */
const BLOCOS_DA_PLACA: Block[] = [
  linha('N° 847833', 0.2),
  linha('PATRIMONIO 251328', 0.3),
];

type ClienteDuble = { cliente: { send: jest.Mock } };

function extratorCom(blocos: Block[]) {
  const extrator = new TextractExtractor('us-east-1');
  const send = jest.fn().mockResolvedValue({ Blocks: blocos });
  (extrator as unknown as ClienteDuble).cliente = { send };

  return { extrator, send };
}

function fotoDaPlaca(imagem: Buffer): FonteImagem {
  return {
    fotoEvidenciaId: 'foto-da-placa',
    fonteFisica: 'placa',
    imagem,
    mimeType: 'image/png',
  };
}

describe('TextractExtractor — QR da placa', () => {
  let comQr: Buffer;
  let semQr: Buffer;

  beforeAll(async () => {
    comQr = readFileSync(FIXTURE_QR);
    semQr = await (
      await import('sharp')
    )
      .default({
        create: {
          width: 240,
          height: 240,
          channels: 3,
          background: '#8a8a8a',
        },
      })
      .png()
      .toBuffer();
  });

  it('should ler impresso por OCR e QR por decode, na mesma foto', async () => {
    const { extrator, send } = extratorCom(BLOCOS_DA_PLACA);

    const { leituras } = await extrator.extrair(
      fotoDaPlaca(comQr),
      ALVOS_DA_PLACA,
    );

    // A PLACA SE CONTRADIZENDO — o defeito real da peca de demo, visivel pela
    // primeira vez dentro de uma unica vista: o numero impresso diz 847833 e o
    // QR da mesma placa diz 847233 (o correto). Quem transforma isso em
    // veredito e incoerencia e a engine; o adapter so entrega os dois lados.
    expect(
      leituras.map((leitura) => [leitura.campo, leitura.valorLido]),
    ).toEqual([
      ['serie-placa', '847833'],
      ['patrimonio-placa', '251328'],
      ['serie-placa-qr', '847233'],
      ['patrimonio-placa-qr', '251328'],
    ]);
    // UMA chamada de visao: o decode nao gastou nenhuma.
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('should preservar a ordem dos alvos mesmo com os canais separados', async () => {
    const { extrator } = extratorCom(BLOCOS_DA_PLACA);

    // Ordem embaralhada de proposito: a resposta segue a ordem da CHECKLIST,
    // que e o que a tela e a tabela do spike consomem.
    const { leituras } = await extrator.extrair(fotoDaPlaca(comQr), [
      { campo: 'serie-placa-qr' },
      { campo: 'serie-placa' },
      { campo: 'patrimonio-placa-qr' },
    ]);

    expect(leituras.map((leitura) => leitura.campo)).toEqual([
      'serie-placa-qr',
      'serie-placa',
      'patrimonio-placa-qr',
    ]);
  });

  it('should NAO chamar o Textract quando todos os alvos sao de QR', async () => {
    const { extrator, send } = extratorCom(BLOCOS_DA_PLACA);

    const { leituras } = await extrator.extrair(fotoDaPlaca(comQr), [
      { campo: 'serie-placa-qr' },
      { campo: 'patrimonio-placa-qr' },
    ]);

    expect(send).not.toHaveBeenCalled();
    expect(leituras.map((leitura) => leitura.valorLido)).toEqual([
      '847233',
      '251328',
    ]);
  });

  it('should deixar so os campos de QR nulos quando a foto nao tem QR', async () => {
    // Degradacao isolada: QR ilegivel nao pode zerar o que o OCR ja leu na
    // mesma foto (era o bug que a distincao entre ausencia e contradicao
    // resolveu no contraste, e vale igual aqui).
    const { extrator } = extratorCom(BLOCOS_DA_PLACA);

    const { leituras } = await extrator.extrair(
      fotoDaPlaca(semQr),
      ALVOS_DA_PLACA,
    );

    expect(leituras.map((leitura) => leitura.valorLido)).toEqual([
      '847833',
      '251328',
      null,
      null,
    ]);
  });

  it('should mandar as linhas nao mapeadas do QR para achados livres', async () => {
    const { extrator } = extratorCom(BLOCOS_DA_PLACA);

    const { achadosLivres } = await extrator.extrair(
      fotoDaPlaca(comQr),
      ALVOS_DA_PLACA,
    );

    // Custo zero: o payload ja estava decodificado. `cruzarAchados` filtra o
    // ruido por comprimento, entao TPD-408136 e a data nao viram alarme.
    expect(achadosLivres.map((achado) => achado.texto)).toEqual(
      expect.arrayContaining(['TPD-408136', '01/06/2026', '226/13299']),
    );
  });
});
