import { PayloadEtiqueta, PayloadInvalidoError } from './payload-etiqueta';
import { parsePayloadEtiqueta } from './qr-payload.parser';

/**
 * Fixture-ancora: simula a etiqueta impressa (formato chave:valor).
 * Continua valendo como formato alternativo: o QR da ETIQUETA real, medido em
 * 2026-07-26, e apenas um codigo de lookup de 13 digitos (ver a suite
 * "formato codigo"), entao nenhum QR da peca de demo produz este layout hoje.
 */
const ETIQUETA_CHAVE_VALOR = [
  'Pedido: 68202',
  'Núm. Série: 847233',
  'Seq: 98',
  'Patrimônio: 251328',
  'Cliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A',
  'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
  'TPD-408136',
].join('\n');

const ETIQUETA_ESPERADA: PayloadEtiqueta = {
  numeroSerie: '847233',
  patrimonio: '251328',
  cliente: '143091 - Energisa Rondônia Distribuidora de Energia S.A',
  pedido: '68202',
  seq: '98',
  descricao: 'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
  codigoProjeto: 'TPD-408136',
};

/**
 * Fixture REAL do QR da PLACA de identificacao, decodificado em 2026-07-26
 * (zxing-cpp sobre fotos-demo/PLACA-4.jpg e
 * DIAGONAL-TRASEIRA-DIREITA-2.jpg — as duas leituras deram o mesmo conteudo).
 * Linhas separadas por CRLF, sem rotulo nenhum.
 *
 * Layout inferido por evidencia externa (etiqueta impressa e placa da mesma
 * peca): linha 3 = codigo de projeto, linha 5 = numero de serie, linha 9 =
 * patrimonio. Linhas 1/2/6/10 seguem de significado DESCONHECIDO — amostra
 * unica, por isso o parser nao mapeia nada alem do que foi corroborado.
 *
 * Detalhe do dominio: o QR desta placa carrega a serie CORRETA (847233),
 * enquanto o numero IMPRESSO nela e 847833 — o defeito conhecido da peca de
 * demo e de impressao, e nao contamina o payload.
 */
const PLACA_POSICIONAL_CRLF = [
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

/** Codigo lido do QR da ETIQUETA adesiva real (2026-07-26): lookup de 13 digitos. */
const ETIQUETA_CODIGO_LOOKUP = '1001020511056';

const ETIQUETA_JSON = JSON.stringify({
  pedido: '68202',
  numeroSerie: '847233',
  seq: '98',
  patrimonio: '251328',
  cliente: '143091 - Energisa Rondônia Distribuidora de Energia S.A',
  descricao: 'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
  codigoProjeto: 'TPD-408136',
});

function esperarMotivo(payload: string, motivo: string | RegExp): void {
  let capturado: unknown;
  try {
    parsePayloadEtiqueta(payload);
  } catch (erro) {
    capturado = erro;
  }
  expect(capturado).toBeInstanceOf(PayloadInvalidoError);
  const erro = capturado as PayloadInvalidoError;
  if (typeof motivo === 'string') {
    expect(erro.motivo).toBe(motivo);
  } else {
    expect(erro.motivo).toMatch(motivo);
  }
}

describe('parsePayloadEtiqueta', () => {
  describe('fixture-ancora (etiqueta real em chave:valor)', () => {
    it('should parse a etiqueta completa com os 7 campos preenchidos', () => {
      const resultado = parsePayloadEtiqueta(ETIQUETA_CHAVE_VALOR);

      expect(resultado).toEqual({ tipo: 'completo', dados: ETIQUETA_ESPERADA });
    });

    it('should extrair numeroSerie, patrimonio e codigoProjeto da etiqueta', () => {
      const resultado = parsePayloadEtiqueta(ETIQUETA_CHAVE_VALOR);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.numeroSerie).toBe('847233');
      expect(resultado.dados.patrimonio).toBe('251328');
      expect(resultado.dados.codigoProjeto).toBe('TPD-408136');
      expect(resultado.dados.descricao).toBe(
        'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
      );
    });
  });

  describe('formato chave:valor', () => {
    it('should aceitar chaves sem acento e o separador "="', () => {
      const payload = [
        'PEDIDO=68202',
        'Num. Serie=847233',
        'seq=98',
        'Patrimonio=251328',
        'cliente=143091 - Energisa Rondônia Distribuidora de Energia S.A',
        'Projeto=TPD-408136',
        'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
      ].join('\n');

      expect(parsePayloadEtiqueta(payload)).toEqual({
        tipo: 'completo',
        dados: ETIQUETA_ESPERADA,
      });
    });

    it('should aceitar a chave curta "Serie" e ignorar caixa das chaves', () => {
      const payload = 'sErIe: 847233\nPATRIMONIO: 251328';

      expect(parsePayloadEtiqueta(payload)).toEqual({
        tipo: 'completo',
        dados: {
          numeroSerie: '847233',
          patrimonio: '251328',
          cliente: null,
          pedido: null,
          seq: null,
          descricao: null,
          codigoProjeto: null,
        },
      });
    });

    it('should aplicar trim nos valores e preservar ":" dentro do valor', () => {
      const payload =
        '  Núm. Série  :   847233   \n Patrimônio : 251328 \nCliente: Energisa: RO';

      const resultado = parsePayloadEtiqueta(payload);

      expect(resultado).toEqual({
        tipo: 'completo',
        dados: {
          numeroSerie: '847233',
          patrimonio: '251328',
          cliente: 'Energisa: RO',
          pedido: null,
          seq: null,
          descricao: null,
          codigoProjeto: null,
        },
      });
    });

    it('should reconhecer TPD em linha sem separador de forma case-insensitive', () => {
      const payload = 'Serie: 847233\nPatrimonio: 251328\ncodigo tpd-408136';

      const resultado = parsePayloadEtiqueta(payload);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.codigoProjeto).toBe('tpd-408136');
    });

    it('should ignorar linhas sem separador que nao sao TPD nem TRANSFORMADOR', () => {
      const payload = [
        'Serie: 847233',
        'Patrimonio: 251328',
        'linha solta qualquer',
        '',
        'Fabricado no Brasil',
      ].join('\n');

      const resultado = parsePayloadEtiqueta(payload);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.descricao).toBeNull();
      expect(resultado.dados.codigoProjeto).toBeNull();
    });

    it('should ignorar chaves desconhecidas', () => {
      const payload = 'Serie: 847233\nPatrimonio: 251328\nTensao: 15kV';

      expect(parsePayloadEtiqueta(payload)).toEqual({
        tipo: 'completo',
        dados: {
          numeroSerie: '847233',
          patrimonio: '251328',
          cliente: null,
          pedido: null,
          seq: null,
          descricao: null,
          codigoProjeto: null,
        },
      });
    });

    it('should lancar PayloadInvalidoError listando patrimonio ausente', () => {
      esperarMotivo('Núm. Série: 847233\nPedido: 68202', /patrimonio/);
    });

    it('should lancar PayloadInvalidoError listando os dois campos ausentes', () => {
      esperarMotivo('Pedido: 68202\nSeq: 98', /numeroSerie.*patrimonio/);
    });

    it('should tratar valor vazio como campo ausente', () => {
      esperarMotivo('Serie: 847233\nPatrimonio:   ', /patrimonio/);
    });
  });

  describe('formato posicional (QR da placa de identificacao)', () => {
    it('should parse o payload real da placa com CRLF entre as linhas', () => {
      expect(parsePayloadEtiqueta(PLACA_POSICIONAL_CRLF)).toEqual({
        tipo: 'completo',
        dados: {
          numeroSerie: '847233',
          patrimonio: '251328',
          codigoProjeto: 'TPD-408136',
          cliente: null,
          pedido: null,
          seq: null,
          descricao: null,
        },
      });
    });

    it('should aceitar a mesma sequencia separada por LF', () => {
      const payload = PLACA_POSICIONAL_CRLF.split('\r\n').join('\n');

      expect(parsePayloadEtiqueta(payload)).toEqual(
        parsePayloadEtiqueta(PLACA_POSICIONAL_CRLF),
      );
    });

    it('should ignorar linhas vazias e espacos ao redor dos valores', () => {
      const payload = [
        '',
        '  91616 ',
        '19930',
        '',
        ' TPD-408136',
        '01/06/2026',
        '  847233  ',
        '1',
        '10',
        '15',
        ' 251328',
        '226/13299',
        '   ',
      ].join('\r\n');

      const resultado = parsePayloadEtiqueta(payload);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.numeroSerie).toBe('847233');
      expect(resultado.dados.patrimonio).toBe('251328');
    });

    it('should seguir o deslocamento RELATIVO quando o codigo do projeto muda de linha', () => {
      // Mesma peca, codigo do projeto na 1a linha: serie 2 linhas depois,
      // patrimonio 6 linhas depois. Nada aqui e indice absoluto.
      const payload = [
        'TPD-408136',
        '01/06/2026',
        '847233',
        '1',
        '10',
        '15',
        '251328',
        '226/13299',
        '91616',
        '19930',
      ].join('\n');

      const resultado = parsePayloadEtiqueta(payload);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.numeroSerie).toBe('847233');
      expect(resultado.dados.patrimonio).toBe('251328');
      expect(resultado.dados.codigoProjeto).toBe('TPD-408136');
    });

    it('should aceitar outro prefixo de projeto no padrao (ex.: EPT)', () => {
      const payload = PLACA_POSICIONAL_CRLF.replace('TPD-408136', 'EPT-408136');

      const resultado = parsePayloadEtiqueta(payload);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.codigoProjeto).toBe('EPT-408136');
    });

    it('should deixar cliente, pedido, seq e descricao ausentes (o formato nao os traz)', () => {
      const resultado = parsePayloadEtiqueta(PLACA_POSICIONAL_CRLF);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.cliente).toBeNull();
      expect(resultado.dados.pedido).toBeNull();
      expect(resultado.dados.seq).toBeNull();
      expect(resultado.dados.descricao).toBeNull();
    });

    it('should recusar quando a linha do numero de serie nao e identificador numerico', () => {
      // Amostra unica: se o layout nao bate, o parser NAO chuta outro campo.
      const payload = PLACA_POSICIONAL_CRLF.replace(
        '\r\n847233\r\n',
        '\r\n01/06/2026\r\n',
      );

      esperarMotivo(payload, /posicional-numero-serie-invalido/);
    });

    it('should recusar numero de serie curto demais para ser identificador', () => {
      const payload = PLACA_POSICIONAL_CRLF.replace(
        '\r\n847233\r\n',
        '\r\n7\r\n',
      );

      esperarMotivo(payload, /posicional-numero-serie-invalido/);
    });

    it('should recusar quando a linha do patrimonio nao e identificador numerico', () => {
      const payload = PLACA_POSICIONAL_CRLF.replace(
        '\r\n251328\r\n',
        '\r\n226/13299\r\n',
      );

      esperarMotivo(payload, /posicional-patrimonio-invalido/);
    });

    it('should recusar quando o deslocamento do patrimonio cai fora do payload', () => {
      const payload = [
        '91616',
        '19930',
        '01/06/2026',
        '1',
        '10',
        'TPD-408136',
        '15',
        '847233',
        '251328',
      ].join('\n');

      esperarMotivo(payload, /posicional-patrimonio-ausente/);
    });

    it('should nomear a linha problematica na mensagem de erro', () => {
      const payload = PLACA_POSICIONAL_CRLF.replace(
        '\r\n847233\r\n',
        '\r\nABC\r\n',
      );

      esperarMotivo(payload, /linha 5/);
      esperarMotivo(payload, /ABC/);
    });

    it('should exigir 9+ linhas: payload curto cai nos formatos existentes', () => {
      const curto = [
        '91616',
        '19930',
        'TPD-408136',
        '01/06/2026',
        '847233',
        '1',
        '10',
        '15',
      ].join('\r\n');

      // 8 linhas: nao e posicional. Cai no chave:valor, que so reconhece o TPD
      // e acusa a falta dos obrigatorios — nunca inventa serie/patrimonio.
      esperarMotivo(curto, /campos-obrigatorios-ausentes/);
    });

    it('should exigir UM unico codigo de projeto: dois codigos caem nos formatos existentes', () => {
      const ambiguo = PLACA_POSICIONAL_CRLF.replace(
        '\r\n226/13299',
        '\r\nEPT-163999',
      );

      esperarMotivo(ambiguo, /campos-obrigatorios-ausentes/);
    });

    it('should manter o payload ROTULADO no formato chave:valor mesmo com 9+ linhas', () => {
      // Guarda de regressao: rotulo vence posicao. Um payload com chaves
      // conhecidas nunca e lido por deslocamento.
      const rotulado = [
        'Pedido: 68202',
        'Núm. Série: 847233',
        'Seq: 98',
        'Patrimônio: 251328',
        'Cliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A',
        'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
        'TPD-408136',
        'Tensao: 15kV',
        'Fabricado no Brasil',
        'Peso: 120kg',
      ].join('\r\n');

      expect(parsePayloadEtiqueta(rotulado)).toEqual({
        tipo: 'completo',
        dados: ETIQUETA_ESPERADA,
      });
    });
  });

  describe('formato JSON', () => {
    it('should parse o JSON equivalente a etiqueta', () => {
      expect(parsePayloadEtiqueta(ETIQUETA_JSON)).toEqual({
        tipo: 'completo',
        dados: ETIQUETA_ESPERADA,
      });
    });

    it('should aceitar os aliases de chave do numero de serie', () => {
      const aliases = [
        'numeroSerie',
        'numero_serie',
        'serie',
        'num_serie',
        'numSerie',
        'NUMEROSERIE',
      ];

      for (const alias of aliases) {
        const payload = JSON.stringify({
          [alias]: '847233',
          patrimonio: '251328',
        });

        const resultado = parsePayloadEtiqueta(payload);

        if (resultado.tipo !== 'completo') {
          throw new Error(`esperado tipo completo para alias ${alias}`);
        }
        expect(resultado.dados.numeroSerie).toBe('847233');
      }
    });

    it('should aceitar os aliases de descricao e codigo de projeto', () => {
      const payload = JSON.stringify({
        serie: '847233',
        patrimonio: '251328',
        produto: 'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
        tpd: 'TPD-408136',
      });

      const resultado = parsePayloadEtiqueta(payload);

      if (resultado.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(resultado.dados.descricao).toBe(
        'TRANSFORMADOR 10kVA 15kV 1F 240/120V 8660V',
      );
      expect(resultado.dados.codigoProjeto).toBe('TPD-408136');

      const comProjeto = parsePayloadEtiqueta(
        JSON.stringify({
          serie: '847233',
          patrimonio: '251328',
          projeto: 'TPD-408136',
        }),
      );

      if (comProjeto.tipo !== 'completo') {
        throw new Error('esperado tipo completo');
      }
      expect(comProjeto.dados.codigoProjeto).toBe('TPD-408136');
    });

    it('should converter valores numericos em string', () => {
      const payload = JSON.stringify({
        numeroSerie: 847233,
        patrimonio: 251328,
        pedido: 68202,
        seq: 98,
      });

      expect(parsePayloadEtiqueta(payload)).toEqual({
        tipo: 'completo',
        dados: {
          numeroSerie: '847233',
          patrimonio: '251328',
          cliente: null,
          pedido: '68202',
          seq: '98',
          descricao: null,
          codigoProjeto: null,
        },
      });
    });

    it('should aplicar trim e preencher campos ausentes com null', () => {
      const payload = JSON.stringify({
        numeroSerie: '  847233  ',
        patrimonio: ' 251328 ',
      });

      expect(parsePayloadEtiqueta(payload)).toEqual({
        tipo: 'completo',
        dados: {
          numeroSerie: '847233',
          patrimonio: '251328',
          cliente: null,
          pedido: null,
          seq: null,
          descricao: null,
          codigoProjeto: null,
        },
      });
    });

    it('should lancar PayloadInvalidoError quando faltam os obrigatorios', () => {
      esperarMotivo(
        JSON.stringify({ pedido: '68202', cliente: 'Energisa' }),
        /numeroSerie.*patrimonio/,
      );
    });

    it('should lancar PayloadInvalidoError quando falta so o numero de serie', () => {
      esperarMotivo(JSON.stringify({ patrimonio: '251328' }), /numeroSerie/);
    });
  });

  describe('formato codigo (token unico de lookup)', () => {
    it('should retornar tipo codigo para um token numerico', () => {
      expect(parsePayloadEtiqueta('847233')).toEqual({
        tipo: 'codigo',
        codigo: '847233',
      });
    });

    it('should aplicar trim no codigo', () => {
      expect(parsePayloadEtiqueta('   847233\t ')).toEqual({
        tipo: 'codigo',
        codigo: '847233',
      });
    });

    it('should aceitar os caracteres - _ . / no codigo', () => {
      expect(parsePayloadEtiqueta('TPD-408136_98/A.1')).toEqual({
        tipo: 'codigo',
        codigo: 'TPD-408136_98/A.1',
      });
    });

    it('should recusar token acima de 64 caracteres', () => {
      esperarMotivo('A'.repeat(65), 'formato-desconhecido');
    });

    it('should tratar o QR REAL da etiqueta adesiva como codigo de lookup', () => {
      // Medido em 2026-07-26 (zxing-cpp sobre fotos-demo/ETIQUETA-1.jpg): o QR
      // da etiqueta nao carrega campos, e sim um codigo de 13 digitos da mesma
      // familia dos EAN-13 impressos ao lado. Sem ERP nesta rodada, o caminho
      // de recuperacao e a digitacao manual dos campos (SPEC, T3.1) — e por
      // isso o parser marca `tipo: 'codigo'` em vez de fingir uma identidade.
      expect(parsePayloadEtiqueta(ETIQUETA_CODIGO_LOOKUP)).toEqual({
        tipo: 'codigo',
        codigo: '1001020511056',
      });
    });
  });

  describe('payloads invalidos', () => {
    it('should lancar payload-vazio para string vazia ou so espacos', () => {
      esperarMotivo('', 'payload-vazio');
      esperarMotivo('    ', 'payload-vazio');
      esperarMotivo('\n\t  \r\n', 'payload-vazio');
    });

    it('should lancar formato-desconhecido para texto livre sem estrutura', () => {
      esperarMotivo(
        'este e um texto longo sem qualquer estrutura reconhecivel pelo parser da etiqueta',
        'formato-desconhecido',
      );
    });

    it('should lancar formato-desconhecido para JSON que nao e objeto', () => {
      esperarMotivo('["847233", "251328"]', 'formato-desconhecido');
    });

    it('should expor a mensagem igual ao motivo', () => {
      const erro = new PayloadInvalidoError('payload-vazio');

      expect(erro.message).toBe('payload-vazio');
      expect(erro.motivo).toBe('payload-vazio');
      expect(erro).toBeInstanceOf(Error);
    });
  });
});
