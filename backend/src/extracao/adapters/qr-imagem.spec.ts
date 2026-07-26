import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FonteImagem } from '../ports/extractor.port';
import {
  CONFIANCA_DECODE_QR,
  caixaDosCantos,
  decodificarQr,
  lerQrDaFoto,
  mapearPayloadParaLeituras,
} from './qr-imagem';

// O QR DA PLACA COMO MARCACAO CONFERIVEL. Duas metades, testadas de jeitos
// diferentes de proposito:
//
// 1. a REGRA (payload -> leituras + achados) e pura e nao precisa de imagem
//    nenhuma — mesmo padrao de `interpretarBlocos` e da engine;
// 2. o DECODE e I/O de pixel, e so um QR de verdade prova que ele funciona.
//    Por isso existe um fixture: `__fixtures__/qr-placa-posicional.png` e o
//    recorte do QR REAL da placa em `fotos-demo/PLACA-5.jpg` (cinza, 260 px,
//    4 KB). Nao e QR sintetico — tem a perspectiva, o brilho e o ruido da foto
//    de celular, que e onde um decode de laboratorio falharia.
//
// O que NAO se testa aqui: veredito. Este arquivo produz leitura; quem julga e
// a engine, e ela nao sabe que QR existe.

/**
 * Payload REAL do QR da placa (medido em 2026-07-26; o mesmo fixture de
 * `transformadores/qr/qr-payload.parser.spec.ts`). Linha 5 = serie 847233 — a
 * CORRETA —, linha 9 = patrimonio 251328. O numero IMPRESSO na mesma placa diz
 * 847833: e a peca se contradizendo dentro da propria placa.
 */
const PAYLOAD_POSICIONAL = [
  '91616',
  '19930',
  'TPD-408136',
  '01/06/2026',
  '847233',
  '1',
  '10',
  '15',
  '251328',
  '226/13299',
].join('\r\n');

const ALVOS_QR = [
  { campo: 'serie-placa-qr' },
  { campo: 'patrimonio-placa-qr' },
];

const REGIAO = JSON.stringify({
  Left: 0.1,
  Top: 0.2,
  Width: 0.3,
  Height: 0.3,
});

const FOTO_DA_PLACA: FonteImagem = {
  fotoEvidenciaId: 'foto-da-placa',
  fonteFisica: 'placa',
  imagem: Buffer.alloc(0),
  mimeType: 'image/jpeg',
};

function fixtureDoQr(): Buffer {
  return readFileSync(
    join(__dirname, '__fixtures__', 'qr-placa-posicional.png'),
  );
}

async function imagemSemQr(): Promise<Buffer> {
  const sharp = (await import('sharp')).default;

  return sharp({
    create: {
      width: 240,
      height: 240,
      channels: 3,
      background: { r: 130, g: 130, b: 130 },
    },
  })
    .png()
    .toBuffer();
}

describe('mapearPayloadParaLeituras', () => {
  it('should mapear serie e patrimonio do QR posicional da placa', () => {
    const { leituras } = mapearPayloadParaLeituras(
      PAYLOAD_POSICIONAL,
      ALVOS_QR,
      FOTO_DA_PLACA,
      REGIAO,
    );

    expect(leituras).toEqual([
      {
        campo: 'serie-placa-qr',
        valorLido: '847233',
        confianca: CONFIANCA_DECODE_QR,
        regiaoLeitura: REGIAO,
        fotoEvidenciaId: 'foto-da-placa',
      },
      {
        campo: 'patrimonio-placa-qr',
        valorLido: '251328',
        confianca: CONFIANCA_DECODE_QR,
        regiaoLeitura: REGIAO,
        fotoEvidenciaId: 'foto-da-placa',
      },
    ]);
  });

  it('should reportar confianca 1 — decode e binario, nao estimativa', () => {
    // O 1,0 e o unico legitimo do sistema: Reed-Solomon fecha ou nao fecha.
    // Se este numero virar 0.9 "por seguranca", o campo passa a depender do
    // limiar do endpoint e um QR perfeitamente lido pode virar nao_conferivel.
    const { leituras } = mapearPayloadParaLeituras(
      PAYLOAD_POSICIONAL,
      ALVOS_QR,
      FOTO_DA_PLACA,
      REGIAO,
    );

    expect(CONFIANCA_DECODE_QR).toBe(1);
    expect(leituras.every((leitura) => leitura.confianca === 1)).toBe(true);
  });

  it('should deixar `corroboracao` ausente — o QR e acusavel com uma leitura', () => {
    // Ausente significa "nao se aplica" (extractor.port.ts). Se o QR chegasse
    // a engine como 'nao-confirmada', a placa com QR divergente nunca seria
    // ACUSADA — viraria `nao_conferivel`, que e a mensagem errada para uma
    // marcacao que o sistema leu com certeza matematica.
    const { leituras } = mapearPayloadParaLeituras(
      PAYLOAD_POSICIONAL,
      ALVOS_QR,
      FOTO_DA_PLACA,
      REGIAO,
    );

    for (const leitura of leituras) {
      expect(leitura.corroboracao).toBeUndefined();
    }
  });

  it('should mandar para achados livres toda linha que nao virou leitura', () => {
    const { achadosLivres } = mapearPayloadParaLeituras(
      PAYLOAD_POSICIONAL,
      ALVOS_QR,
      FOTO_DA_PLACA,
      REGIAO,
    );

    // As duas linhas consumidas somem; as outras oito seguem para o
    // cruzamento contra o QR da etiqueta (`cruzarAchados`), que filtra ruido
    // por comprimento sozinho.
    expect(achadosLivres.map((achado) => achado.texto)).toEqual([
      '91616',
      '19930',
      'TPD-408136',
      '01/06/2026',
      '1',
      '10',
      '15',
      '226/13299',
    ]);
    expect(achadosLivres[0]).toMatchObject({
      confianca: CONFIANCA_DECODE_QR,
      fotoEvidenciaId: 'foto-da-placa',
      regiaoLeitura: REGIAO,
    });
  });

  it('should nao produzir leitura quando o parser recusa o payload', () => {
    // QR de outro sistema, outro formato, ou lixo: campo sem leitura (ambar na
    // tela), nunca valor chutado. As linhas ainda alarmam pelo outro canal.
    const { leituras, achadosLivres } = mapearPayloadParaLeituras(
      'https://exemplo.invalido/rastreio\nlote 12',
      ALVOS_QR,
      FOTO_DA_PLACA,
      REGIAO,
    );

    expect(leituras.map((leitura) => leitura.valorLido)).toEqual([null, null]);
    expect(leituras.map((leitura) => leitura.confianca)).toEqual([null, null]);
    expect(achadosLivres).toHaveLength(2);
  });

  it('should nao produzir leitura para QR que so carrega codigo de lookup', () => {
    // O QR da ETIQUETA adesiva real e isto: 13 digitos de lookup. Ele nao
    // afirma serie nem patrimonio, e resolver o codigo exigiria ERP.
    const { leituras, achadosLivres } = mapearPayloadParaLeituras(
      '1001020511056',
      ALVOS_QR,
      FOTO_DA_PLACA,
      REGIAO,
    );

    expect(leituras.map((leitura) => leitura.valorLido)).toEqual([null, null]);
    expect(achadosLivres.map((achado) => achado.texto)).toEqual([
      '1001020511056',
    ]);
  });

  it('should ignorar alvo cujo prefixo nao tem origem no payload', () => {
    // `potencia-*` nao vem do QR (mesma regra de ORIGENS_DO_ESPERADO).
    const { leituras } = mapearPayloadParaLeituras(
      PAYLOAD_POSICIONAL,
      [{ campo: 'potencia-placa-qr' }],
      FOTO_DA_PLACA,
      REGIAO,
    );

    expect(leituras).toEqual([
      {
        campo: 'potencia-placa-qr',
        valorLido: null,
        confianca: null,
        regiaoLeitura: null,
        fotoEvidenciaId: 'foto-da-placa',
      },
    ]);
  });

  it('should aceitar qualquer formato que o parser do QR entenda', () => {
    // A regra posicional NAO e reimplementada aqui: o payload vai inteiro para
    // `parsePayloadEtiqueta`. Consequencia de graca — placa de outro cliente
    // com QR em chave:valor funciona sem tocar neste arquivo.
    const { leituras } = mapearPayloadParaLeituras(
      ['Núm. Série: 847233', 'Patrimônio: 251328'].join('\n'),
      ALVOS_QR,
      FOTO_DA_PLACA,
      REGIAO,
    );

    expect(leituras.map((leitura) => leitura.valorLido)).toEqual([
      '847233',
      '251328',
    ]);
  });
});

describe('caixaDosCantos', () => {
  it('should envelopar os quatro cantos, normalizado 0..1', () => {
    // O QR aparece em PERSPECTIVA numa foto de peca: a caixa e o envelope dos
    // cantos torcidos, no mesmo formato do bounding box do Textract.
    const caixa = caixaDosCantos(
      [
        { x: 100, y: 200 },
        { x: 300, y: 210 },
        { x: 305, y: 400 },
        { x: 95, y: 395 },
      ],
      1000,
      1000,
    );

    expect(caixa).toEqual({
      Left: 0.095,
      Top: 0.2,
      Width: 0.21,
      Height: 0.2,
    });
  });

  it('should limitar a 0..1 em vez de devolver coordenada negativa', () => {
    const caixa = caixaDosCantos(
      [
        { x: -20, y: -10 },
        { x: 1200, y: 1100 },
      ],
      1000,
      1000,
    );

    expect(caixa).toEqual({ Left: 0, Top: 0, Width: 1, Height: 1 });
  });

  it('should devolver null para caixa sem area, foto sem dimensao ou canto invalido', () => {
    const ponto = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
    ];

    expect(caixaDosCantos(ponto, 1000, 1000)).toBeNull();
    expect(caixaDosCantos([], 1000, 1000)).toBeNull();
    expect(caixaDosCantos([{ x: 0, y: 0 }], 0, 1000)).toBeNull();
    expect(
      caixaDosCantos(
        [
          { x: Number.NaN, y: 0 },
          { x: 10, y: 10 },
        ],
        1000,
        1000,
      ),
    ).toBeNull();
  });
});

describe('decodificarQr (foto real da placa)', () => {
  it('should ler o payload posicional do QR fisico da peca', async () => {
    const decodificado = await decodificarQr(fixtureDoQr());

    expect(decodificado?.payload).toBe(PAYLOAD_POSICIONAL);
  });

  it('should devolver a regiao do QR no formato do bounding box do Textract', async () => {
    const decodificado = await decodificarQr(fixtureDoQr());
    const caixa = JSON.parse(decodificado?.regiaoLeitura ?? 'null');

    // Mesmo formato de `regiaoLeitura` do OCR (0..1), para `lerCaixa` e a
    // conferencia posicional futura lerem os dois sem saber a origem.
    expect(caixa).toMatchObject({
      Left: expect.any(Number),
      Top: expect.any(Number),
      Width: expect.any(Number),
      Height: expect.any(Number),
    });
    expect(caixa.Left).toBeGreaterThanOrEqual(0);
    expect(caixa.Left + caixa.Width).toBeLessThanOrEqual(1);
    expect(caixa.Top + caixa.Height).toBeLessThanOrEqual(1);
    // O QR ocupa a maior parte do recorte: caixa minuscula significaria que o
    // decode achou outra coisa.
    expect(caixa.Width).toBeGreaterThan(0.5);
  });

  it('should devolver null — sem lancar — para foto sem QR', async () => {
    await expect(decodificarQr(await imagemSemQr())).resolves.toBeNull();
  });

  it('should devolver null — sem lancar — para arquivo que nao e imagem', async () => {
    // Arquivo corrompido nao pode derrubar a extracao das OUTRAS marcacoes da
    // mesma foto.
    await expect(
      decodificarQr(Buffer.from('isto nao e uma imagem')),
    ).resolves.toBeNull();
  });

  it('should respeitar o disjuntor EXTRACAO_RECORTE=off', async () => {
    // Mesma chave que desliga recorte e contraste: se a lib nativa e o
    // problema, os tres usos dela caem juntos.
    const anterior = process.env.EXTRACAO_RECORTE;
    process.env.EXTRACAO_RECORTE = 'off';

    try {
      await expect(decodificarQr(fixtureDoQr())).resolves.toBeNull();
    } finally {
      process.env.EXTRACAO_RECORTE = anterior;
    }
  });
});

describe('lerQrDaFoto', () => {
  it('should produzir as leituras dos campos de QR a partir da foto real', async () => {
    const { leituras, achadosLivres } = await lerQrDaFoto(
      { ...FOTO_DA_PLACA, imagem: fixtureDoQr() },
      ALVOS_QR,
    );

    expect(
      leituras.map((leitura) => [leitura.campo, leitura.valorLido]),
    ).toEqual([
      ['serie-placa-qr', '847233'],
      ['patrimonio-placa-qr', '251328'],
    ]);
    expect(leituras.every((leitura) => leitura.confianca === 1)).toBe(true);
    expect(
      leituras.every((leitura) => leitura.fotoEvidenciaId === 'foto-da-placa'),
    ).toBe(true);
    expect(achadosLivres.length).toBeGreaterThan(0);
  });

  it('should devolver leitura vazia — nunca erro — quando a foto nao tem QR', async () => {
    const { leituras, achadosLivres } = await lerQrDaFoto(
      { ...FOTO_DA_PLACA, imagem: await imagemSemQr() },
      ALVOS_QR,
    );

    expect(leituras.map((leitura) => leitura.valorLido)).toEqual([null, null]);
    expect(leituras.map((leitura) => leitura.confianca)).toEqual([null, null]);
    // Sem QR nao ha texto decodificado: nada a alarmar por este canal.
    expect(achadosLivres).toEqual([]);
  });

  it('should nao decodificar nada quando a foto nao tem alvo de QR', async () => {
    // Foto de vista sem campo `*-qr` na checklist nao paga nem o custo local
    // de rasterizar 37 MB de RGBA.
    const resultado = await lerQrDaFoto(
      { ...FOTO_DA_PLACA, imagem: fixtureDoQr() },
      [],
    );

    expect(resultado).toEqual({ leituras: [], achadosLivres: [] });
  });
});
