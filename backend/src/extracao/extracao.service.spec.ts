import { AlvoChecklist, ExtracaoService } from './extracao.service';
import { criarExtractor } from './adapters/extractor.factory';
import { LEITURAS_DEMO, MockExtractor } from './adapters/mock.extractor';
import {
  CampoAlvo,
  ExtractorPort,
  FonteImagem,
  ResultadoExtracao,
} from './ports/extractor.port';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.

interface Chamada {
  fonteFisica: string;
  campos: string[];
}

/**
 * Dubla o adapter e registra as chamadas. Envolve o `MockExtractor` em vez de
 * reimplementar a leitura: o que se testa aqui e o roteamento do service, nao
 * o mock.
 */
class ExtractorEspiao extends ExtractorPort {
  readonly nome = 'mock';

  readonly chamadas: Chamada[] = [];

  constructor(private readonly interno: MockExtractor = new MockExtractor()) {
    super();
  }

  extrair(fonte: FonteImagem, alvos: CampoAlvo[]): Promise<ResultadoExtracao> {
    this.chamadas.push({
      fonteFisica: fonte.fonteFisica,
      campos: alvos.map((alvo) => alvo.campo),
    });

    return this.interno.extrair(fonte, alvos);
  }
}

/** Checklist da peca de demo (desenho EPT-163-PI-676). */
const CHECKLIST: AlvoChecklist[] = [
  { campo: 'serie-chumbada-topo', fonteFisica: 'topo' },
  { campo: 'serie-chumbada-lateral-direita', fonteFisica: 'lateral-direita' },
  { campo: 'serie-chumbada-traseira', fonteFisica: 'traseira' },
  { campo: 'serie-placa', fonteFisica: 'placa' },
  { campo: 'patrimonio-placa', fonteFisica: 'placa' },
  { campo: 'patrimonio-serigrafia-frente', fonteFisica: 'frente' },
  { campo: 'cliente-serigrafia-frente', fonteFisica: 'frente' },
  { campo: 'potencia-serigrafia-frente', fonteFisica: 'frente' },
];

function foto(
  fonteFisica: string,
  fotoEvidenciaId: string | null,
): FonteImagem {
  return {
    fotoEvidenciaId,
    fonteFisica,
    imagem: Buffer.from('imagem-de-teste'),
    mimeType: 'image/jpeg',
  };
}

describe('ExtracaoService — roteamento foto -> campos', () => {
  it('should mandar para cada foto apenas os campos com a mesma fonte fisica', async () => {
    const espiao = new ExtractorEspiao();
    const service = new ExtracaoService(espiao);

    await service.extrairDeFotos(
      [foto('placa', 'foto-placa'), foto('frente', 'foto-serigrafia')],
      CHECKLIST,
    );

    expect(espiao.chamadas).toEqual([
      {
        fonteFisica: 'placa',
        campos: ['serie-placa', 'patrimonio-placa'],
      },
      {
        fonteFisica: 'frente',
        campos: [
          'patrimonio-serigrafia-frente',
          'cliente-serigrafia-frente',
          'potencia-serigrafia-frente',
        ],
      },
    ]);
  });

  it('should devolver uma leitura por campo alvo da foto', async () => {
    const service = new ExtracaoService(new ExtractorEspiao());

    const { leituras } = await service.extrairDeFotos(
      [foto('placa', 'foto-placa')],
      CHECKLIST,
    );

    expect(leituras.map((leitura) => leitura.campo)).toEqual([
      'serie-placa',
      'patrimonio-placa',
    ]);
    expect(leituras[0].valorLido).toBe(LEITURAS_DEMO['serie-placa']);
  });

  it('should ignorar campo do checklist cuja fonte fisica nao foi fotografada', async () => {
    const service = new ExtracaoService(new ExtractorEspiao());

    const { leituras } = await service.extrairDeFotos(
      [foto('topo', 'foto-chumbado-1')],
      CHECKLIST,
    );

    expect(leituras).toHaveLength(1);
    expect(leituras[0].campo).toBe('serie-chumbada-topo');
  });
});

describe('ExtracaoService — uma chamada por foto (constraint 4 do SPEC)', () => {
  it('should chamar o adapter exatamente uma vez por foto com campos alvo', async () => {
    const espiao = new ExtractorEspiao();
    const service = new ExtracaoService(espiao);

    await service.extrairDeFotos(
      [
        foto('placa', 'foto-placa'),
        foto('frente', 'foto-serigrafia'),
        foto('topo', 'foto-chumbado-1'),
      ],
      CHECKLIST,
    );

    expect(espiao.chamadas).toHaveLength(3);
  });

  it('should chamar o adapter uma vez por foto mesmo com varios campos na mesma fonte', async () => {
    const espiao = new ExtractorEspiao();
    const service = new ExtracaoService(espiao);

    await service.extrairDeFotos([foto('frente', 'foto-s')], CHECKLIST);

    expect(espiao.chamadas).toHaveLength(1);
    expect(espiao.chamadas[0].campos).toHaveLength(3);
  });

  it('should chamar o adapter duas vezes para duas fotos da mesma fonte fisica', async () => {
    const espiao = new ExtractorEspiao();
    const service = new ExtracaoService(espiao);

    await service.extrairDeFotos(
      [foto('placa', 'foto-placa-1'), foto('placa', 'foto-placa-2')],
      CHECKLIST,
    );

    expect(espiao.chamadas).toHaveLength(2);
  });
});

describe('ExtracaoService — vinculo com a foto de evidencia', () => {
  it('should propagar o fotoEvidenciaId da foto para toda leitura', async () => {
    const service = new ExtracaoService(new ExtractorEspiao());

    const { leituras } = await service.extrairDeFotos(
      [foto('placa', 'foto-placa'), foto('frente', 'foto-serigrafia')],
      CHECKLIST,
    );

    const porCampo = new Map(
      leituras.map((leitura) => [leitura.campo, leitura.fotoEvidenciaId]),
    );

    expect(porCampo.get('serie-placa')).toBe('foto-placa');
    expect(porCampo.get('patrimonio-placa')).toBe('foto-placa');
    expect(porCampo.get('cliente-serigrafia-frente')).toBe('foto-serigrafia');
  });

  it('should carimbar o fotoEvidenciaId mesmo quando o adapter devolve null', async () => {
    class ExtractorSemVinculo extends ExtractorPort {
      readonly nome = 'mock';

      extrair(
        fonte: FonteImagem,
        alvos: CampoAlvo[],
      ): Promise<ResultadoExtracao> {
        void fonte;

        return Promise.resolve({
          leituras: alvos.map((alvo) => ({
            campo: alvo.campo,
            valorLido: '847833',
            confianca: 0.9,
            regiaoLeitura: null,
            fotoEvidenciaId: null,
          })),
          achadosLivres: [{ texto: '847833', confianca: 0.9 }],
        });
      }
    }

    const service = new ExtracaoService(new ExtractorSemVinculo());

    const { leituras, achadosLivres } = await service.extrairDeFotos(
      [foto('placa', 'foto-placa')],
      CHECKLIST,
    );

    expect(
      leituras.every((leitura) => leitura.fotoEvidenciaId === 'foto-placa'),
    ).toBe(true);
    // Achado livre segue a MESMA regra da leitura: sem evidencia de origem,
    // o alarme nao daria para conferir na foto.
    expect(
      achadosLivres.every((achado) => achado.fotoEvidenciaId === 'foto-placa'),
    ).toBe(true);
  });

  it('should deixar a foto que falhou sem leitura E sem achado livre', async () => {
    class ExtractorQueFalha extends ExtractorPort {
      readonly nome = 'mock';

      extrair(): Promise<ResultadoExtracao> {
        return Promise.reject(new Error('throttle da AWS'));
      }
    }

    const service = new ExtracaoService(new ExtractorQueFalha());

    const { leituras, achadosLivres } = await service.extrairDeFotos(
      [foto('placa', 'foto-placa')],
      CHECKLIST,
    );

    // Foto ruim vira `nao_conferivel` na engine, nunca 500 — e nao pode gerar
    // alarme de consistencia a partir de leitura que nao existiu.
    expect(leituras).toEqual([]);
    expect(achadosLivres).toEqual([]);
  });

  it('should preservar fotoEvidenciaId null quando a foto tambem nao tem id', async () => {
    const service = new ExtracaoService(new ExtractorEspiao());

    const { leituras } = await service.extrairDeFotos(
      [foto('placa', null)],
      CHECKLIST,
    );

    expect(leituras.every((leitura) => leitura.fotoEvidenciaId === null)).toBe(
      true,
    );
  });
});

describe('ExtracaoService — foto sem campo no checklist', () => {
  it('should nao chamar o adapter para foto cuja fonte fisica nao esta no checklist', async () => {
    const espiao = new ExtractorEspiao();
    const service = new ExtracaoService(espiao);

    const { leituras } = await service.extrairDeFotos(
      [foto('geral', 'foto-geral')],
      CHECKLIST,
    );

    expect(espiao.chamadas).toHaveLength(0);
    expect(leituras).toEqual([]);
  });

  it('should chamar o adapter so para as fotos que tem campo no checklist', async () => {
    const espiao = new ExtractorEspiao();
    const service = new ExtracaoService(espiao);

    await service.extrairDeFotos(
      [
        foto('geral', 'foto-geral'),
        foto('placa', 'foto-placa'),
        foto('fonte-desconhecida', 'foto-x'),
      ],
      CHECKLIST,
    );

    expect(espiao.chamadas.map((chamada) => chamada.fonteFisica)).toEqual([
      'placa',
    ]);
  });

  it('should devolver lista vazia quando o checklist esta vazio', async () => {
    const espiao = new ExtractorEspiao();
    const service = new ExtracaoService(espiao);

    const { leituras } = await service.extrairDeFotos(
      [foto('placa', 'foto-placa')],
      [],
    );

    expect(espiao.chamadas).toHaveLength(0);
    expect(leituras).toEqual([]);
  });
});

describe('ExtracaoService — leitura fora dos alvos', () => {
  it('should descartar leitura de campo que nao foi pedido para aquela foto', async () => {
    class ExtractorIntrometido extends ExtractorPort {
      readonly nome = 'mock';

      extrair(
        fonte: FonteImagem,
        alvos: CampoAlvo[],
      ): Promise<ResultadoExtracao> {
        return Promise.resolve({
          leituras: [
            ...alvos.map((alvo) => ({
              campo: alvo.campo,
              valorLido: '847833',
              confianca: 0.9,
              regiaoLeitura: null,
              fotoEvidenciaId: fonte.fotoEvidenciaId,
            })),
            {
              campo: 'cliente-serigrafia-frente',
              valorLido: 'Energisa',
              confianca: 0.99,
              regiaoLeitura: null,
              fotoEvidenciaId: fonte.fotoEvidenciaId,
            },
          ],
          achadosLivres: [],
        });
      }
    }

    const service = new ExtracaoService(new ExtractorIntrometido());

    const { leituras } = await service.extrairDeFotos(
      [foto('placa', 'foto-placa')],
      CHECKLIST,
    );

    expect(leituras.map((leitura) => leitura.campo)).toEqual([
      'serie-placa',
      'patrimonio-placa',
    ]);
  });
});

describe('MockExtractor — determinismo', () => {
  it('should devolver a mesma leitura para a mesma foto em chamadas repetidas', async () => {
    const extractor = new MockExtractor();
    const alvos: CampoAlvo[] = [{ campo: 'serie-placa' }];

    const primeira = await extractor.extrair(foto('placa', 'f1'), alvos);
    const segunda = await extractor.extrair(foto('placa', 'f1'), alvos);

    expect(primeira).toEqual(segunda);
  });

  it('should devolver leitura nula e sem confianca para campo fora do mapa', async () => {
    const extractor = new MockExtractor({ 'serie-placa': '847833' });

    const { leituras } = await extractor.extrair(foto('placa', 'f1'), [
      { campo: 'patrimonio-placa' },
    ]);

    expect(leituras[0].valorLido).toBeNull();
    expect(leituras[0].confianca).toBeNull();
  });

  it('should aceitar valores configurados pelo construtor', async () => {
    const extractor = new MockExtractor({ 'serie-placa': '847233' }, 0.5);

    const { leituras } = await extractor.extrair(foto('placa', 'f1'), [
      { campo: 'serie-placa' },
    ]);

    expect(leituras[0].valorLido).toBe('847233');
    expect(leituras[0].confianca).toBe(0.5);
  });
});

describe('MockExtractor — achados livres', () => {
  // INVERSAO DELIBERADA (achado A4 da revisao adversarial). Este teste dizia
  // "should ecoar como achado livre o proprio valor que leu" e consagrava um
  // mock que fazia o CONTRARIO do Textract: la, `achadosDasLinhas` remove as
  // linhas consumidas pelos alvos (ver
  // 'should manter fora dos achados a linha consumida como leitura de campo',
  // em textract.extractor.spec.ts). Mock divergente do adapter real sustenta
  // teste verde que a producao nao reproduz.
  it('should NAO ecoar como achado livre o valor que virou leitura de campo', async () => {
    const extractor = new MockExtractor({ 'serie-placa': '847833' });

    const { leituras, achadosLivres } = await extractor.extrair(
      foto('placa', 'f1'),
      [{ campo: 'serie-placa' }],
    );

    expect(leituras.map((leitura) => leitura.valorLido)).toEqual(['847833']);
    expect(achadosLivres).toEqual([]);
  });

  it('should nao inventar achado quando nao ha leitura nem texto extra', async () => {
    // Default do modo demo: o mock nao polui o fluxo com alarme fabricado.
    const extractor = new MockExtractor({});

    const { achadosLivres } = await extractor.extrair(foto('placa', 'f1'), [
      { campo: 'serie-placa' },
    ]);

    expect(achadosLivres).toEqual([]);
  });

  it('should devolver o texto extra do construtor so como achado livre', async () => {
    const extractor = new MockExtractor({ 'serie-placa': '847233' }, 0.99, [
      '999999',
    ]);

    const { leituras, achadosLivres } = await extractor.extrair(
      foto('placa', 'f1'),
      [{ campo: 'serie-placa' }],
    );

    // So o texto extra: o valor que virou leitura de campo fica fora, como no
    // Textract. `textosExtras` e a UNICA fonte de achado livre do mock.
    expect(leituras.map((leitura) => leitura.valorLido)).toEqual(['847233']);
    expect(achadosLivres.map((achado) => achado.texto)).toEqual(['999999']);
  });
});

describe('criarExtractor — escolha do driver', () => {
  // Nenhum destes testes toca AWS: os adapters so abrem conexao quando
  // `extrair()` roda. Construir o cliente e barato e offline.
  it('should usar o mock quando EXTRACTOR_DRIVER nao esta definido', () => {
    expect(criarExtractor(undefined).nome).toBe('mock');
  });

  it('should usar o mock quando EXTRACTOR_DRIVER esta vazio', () => {
    expect(criarExtractor('   ').nome).toBe('mock');
  });

  it('should cair no mock quando o driver e desconhecido', () => {
    expect(criarExtractor('gpt-vision').nome).toBe('mock');
  });

  it('should aceitar textract e bedrock, ignorando caixa e espacos', () => {
    expect(criarExtractor(' Textract ').nome).toBe('textract');
    expect(criarExtractor('BEDROCK').nome).toBe('bedrock');
  });
});
