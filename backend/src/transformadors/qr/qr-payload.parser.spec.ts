import { PayloadEtiqueta, PayloadInvalidoError } from './payload-etiqueta';
import { parsePayloadEtiqueta } from './qr-payload.parser';

/**
 * Fixture-ancora: simula a etiqueta impressa real (formato chave:valor).
 * O conteudo exato do QR ainda nao foi decodificado (decisao em aberto T1.1);
 * quando for lido, ele vira apenas mais uma fixture aqui.
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
