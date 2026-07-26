import {
  CaixaNormalizada,
  abrirImagem,
  areaDaIntersecao,
  calcularEnvelope,
  calcularRecorte,
  dimensoesOrientadas,
  lerCaixa,
  mapearCaixaNoRecorte,
  recorteLigado,
} from './recorte';

// Geometria do recorte: funcoes PURAS, exercitadas sem lib nativa e sem AWS.
// E aqui que se fixa o que o spike aprovou (recortar na resolucao nativa) e o
// que ele reprovou (ampliar, filtrar pixel) — nenhuma destas funcoes
// redimensiona nada.

const CAIXA: CaixaNormalizada = {
  Left: 0.4,
  Top: 0.5,
  Width: 0.1,
  Height: 0.05,
};

describe('calcularRecorte', () => {
  it('should crescer o retangulo em fracao do lado da caixa, de cada lado', () => {
    // Caixa de 100x50 px em uma foto de 1000x1000; margem 0.5 acrescenta 50 px
    // na horizontal e 25 na vertical de cada lado.
    const recorte = calcularRecorte(CAIXA, 1000, 1000, 0.5);

    expect(recorte).toEqual({ left: 350, top: 475, width: 200, height: 100 });
  });

  it('should quadruplicar o lado com margem 1.5', () => {
    const recorte = calcularRecorte(CAIXA, 1000, 1000, 1.5);

    expect(recorte).toEqual({ left: 250, top: 425, width: 400, height: 200 });
  });

  it('should cortar nas bordas em vez de deslocar o retangulo', () => {
    // Deslocar mudaria a regiao que se quer corroborar — o recorte tem de
    // continuar centrado na marcacao, mesmo perdendo margem.
    const naBorda: CaixaNormalizada = {
      Left: 0,
      Top: 0,
      Width: 0.1,
      Height: 0.1,
    };
    const recorte = calcularRecorte(naBorda, 1000, 1000, 1.5);

    expect(recorte).toEqual({ left: 0, top: 0, width: 250, height: 250 });
  });

  it('should devolver null para caixa sem area ou foto sem dimensao', () => {
    expect(calcularRecorte({ ...CAIXA, Width: 0 }, 1000, 1000, 0.5)).toBeNull();
    expect(calcularRecorte(CAIXA, 0, 1000, 0.5)).toBeNull();
  });
});

describe('mapearCaixaNoRecorte', () => {
  it('should centralizar a caixa original dentro do recorte', () => {
    const retangulo = calcularRecorte(CAIXA, 1000, 1000, 0.5);
    const mapeada = mapearCaixaNoRecorte(CAIXA, retangulo!, 1000, 1000);

    // 100 px de caixa em 200 px de recorte, comecando a 50 px do inicio.
    expect(mapeada).toEqual({
      Left: 0.25,
      Top: 0.25,
      Width: 0.5,
      Height: 0.5,
    });
  });
});

describe('areaDaIntersecao', () => {
  it('should medir a area comum a duas caixas', () => {
    expect(
      areaDaIntersecao(
        { Left: 0, Top: 0, Width: 0.5, Height: 0.5 },
        { Left: 0.25, Top: 0.25, Width: 0.5, Height: 0.5 },
      ),
    ).toBeCloseTo(0.0625);
  });

  it('should devolver zero para caixas que nao se tocam', () => {
    expect(
      areaDaIntersecao(
        { Left: 0, Top: 0, Width: 0.2, Height: 0.2 },
        { Left: 0.5, Top: 0.5, Width: 0.2, Height: 0.2 },
      ),
    ).toBe(0);
  });
});

describe('lerCaixa', () => {
  it('should ler o bounding box serializado em regiaoLeitura', () => {
    expect(lerCaixa(JSON.stringify(CAIXA))).toEqual(CAIXA);
  });

  it('should devolver null para regiao ausente, quebrada ou sem area', () => {
    expect(lerCaixa(null)).toBeNull();
    expect(lerCaixa('   ')).toBeNull();
    expect(lerCaixa('{')).toBeNull();
    expect(lerCaixa('{"Left":0.1}')).toBeNull();
    expect(lerCaixa(JSON.stringify({ ...CAIXA, Width: 0 }))).toBeNull();
  });
});

describe('recorteLigado', () => {
  it('should vir ligado por default e desligar so com off explicito', () => {
    expect(recorteLigado(undefined)).toBe(true);
    expect(recorteLigado('')).toBe(true);
    expect(recorteLigado('on')).toBe(true);
    expect(recorteLigado(' OFF ')).toBe(false);
  });
});

describe('abrirImagem — chave de desligamento', () => {
  it('should devolver null quando EXTRACAO_RECORTE=off', async () => {
    const anterior = process.env.EXTRACAO_RECORTE;
    process.env.EXTRACAO_RECORTE = 'off';

    try {
      // Degradacao por env: nem tenta carregar a lib nativa.
      await expect(
        abrirImagem(Buffer.from('nao-e-imagem')),
      ).resolves.toBeNull();
    } finally {
      if (anterior === undefined) {
        delete process.env.EXTRACAO_RECORTE;
      } else {
        process.env.EXTRACAO_RECORTE = anterior;
      }
    }
  });

  it('should devolver null (sem lancar) quando o buffer nao e imagem', async () => {
    // Foto corrompida vira "sem corroboracao", nunca 500: o campo cai para
    // nao_conferivel, que e o veredito honesto.
    await expect(abrirImagem(Buffer.from('nao-e-imagem'))).resolves.toBeNull();
  });
});

describe('dimensoesOrientadas', () => {
  // ARMADILHA MEDIDA em 2026-07-26 (`PLACA-4.jpg`, orientation 6): a metadata
  // do sharp com `autoOrient` reporta as dimensoes CRUAS, e o pipeline recorta
  // a imagem JA rotacionada. Sem esta correcao, o `extract` estourava com
  // `bad extract area` — ou, pior, caia numa regiao vazia e falhava calado.
  // O Textract, esse, respeita o EXIF: verificado recortando o bounding box de
  // `847833` nos dois referenciais (no cru sai borrao, no orientado sai o
  // numero legivel).

  it('should manter as dimensoes quando nao ha transposicao (1..4)', () => {
    expect(dimensoesOrientadas(4096, 2304, 1)).toEqual({
      largura: 4096,
      altura: 2304,
    });
    expect(dimensoesOrientadas(4096, 2304, 3)).toEqual({
      largura: 4096,
      altura: 2304,
    });
  });

  it('should trocar largura por altura nas orientacoes de 90 graus (5..8)', () => {
    for (const orientacao of [5, 6, 7, 8]) {
      expect(dimensoesOrientadas(4096, 2304, orientacao)).toEqual({
        largura: 2304,
        altura: 4096,
      });
    }
  });

  it('should manter as dimensoes quando a foto nao declara orientacao', () => {
    expect(dimensoesOrientadas(800, 600, undefined)).toEqual({
      largura: 800,
      altura: 600,
    });
  });
});

describe('calcularEnvelope', () => {
  it('should crescer o retangulo igualmente nos quatro lados', () => {
    expect(
      calcularEnvelope(
        { left: 100, top: 100, width: 60, height: 20 },
        20,
        1000,
        1000,
      ),
    ).toEqual({ left: 80, top: 80, width: 100, height: 60 });
  });

  it('should cortar nas bordas da foto', () => {
    expect(
      calcularEnvelope({ left: 5, top: 5, width: 20, height: 10 }, 20, 30, 30),
    ).toEqual({ left: 0, top: 0, width: 30, height: 30 });
  });
});
