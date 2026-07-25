import { UnprocessableEntityException } from '@nestjs/common';

import { criarExtractor } from '../extracao/adapters/extractor.factory';
import {
  LEITURAS_DEMO,
  MockExtractor,
} from '../extracao/adapters/mock.extractor';
import { ExtracaoService } from '../extracao/extracao.service';
import {
  CampoAlvo,
  ExtractorPort,
  FonteImagem,
  LeituraExtraida,
} from '../extracao/ports/extractor.port';
import { FileDriver } from '../files/config/file-config.type';
import {
  ConteudoEvidencia,
  ehCaminhoDeDisco,
  FotoEvidenciaService,
} from '../foto-evidencia/foto-evidencia.service';
import { ProjetoModelo } from '../projeto-modelos/domain/projeto-modelo';
import { ProjetoModelosService } from '../projeto-modelos/projeto-modelos.service';

import {
  ConferenciaExecucaoService,
  ResultadoExecucao,
} from './conferencia-execucao.service';
import { ConferenciaExtracaoService } from './conferencia-extracao.service';
import { ExecutarConferenciaDto } from './dto/executar-conferencia.dto';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Nenhum teste desta suite toca AWS, disco ou banco: FotoEvidenciaService,
// ProjetoModelosService e ConferenciaExecucaoService entram dublados, e a
// visao roda pelo MockExtractor (driver default do projeto).

/** Checklist do desenho da peca de demo (EPT-163-PI-676), como no seed. */
const CHECKLIST = [
  { campo: 'serie-chumbada-1', fonteFisica: 'chumbado-1', obrigatorio: true },
  { campo: 'serie-chumbada-2', fonteFisica: 'chumbado-2', obrigatorio: true },
  { campo: 'serie-chumbada-3', fonteFisica: 'chumbado-3', obrigatorio: true },
  { campo: 'serie-placa', fonteFisica: 'placa', obrigatorio: true },
  { campo: 'patrimonio-placa', fonteFisica: 'placa', obrigatorio: true },
  {
    campo: 'patrimonio-serigrafia',
    fonteFisica: 'serigrafia',
    obrigatorio: true,
  },
  { campo: 'cliente-serigrafia', fonteFisica: 'serigrafia', obrigatorio: true },
];

const PROJETO_MODELO: ProjetoModelo = {
  id: 'projeto-1',
  codigo: 'EPT-163-PI-676',
  descricao: 'Peca de demo',
  checklist: JSON.stringify(CHECKLIST),
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Etiqueta da peca de demo: serie e patrimonio batem com o mock. */
const PAYLOAD_QR = JSON.stringify({
  numeroSerie: '847233',
  patrimonio: '251328',
  cliente: '143091 - Energisa Rondônia Distribuidora de Energia S.A',
  codigoProjeto: 'EPT-163-PI-676',
});

const ID_PLACA = '11111111-1111-4111-8111-111111111111';
const ID_SERIGRAFIA = '22222222-2222-4222-8222-222222222222';

interface Chamada {
  fonteFisica: string;
  campos: string[];
  mimeType: string;
  bytes: string;
}

/** Dubla o adapter e registra as chamadas, delegando a leitura ao mock real. */
class ExtractorEspiao extends ExtractorPort {
  readonly nome = 'mock';

  readonly chamadas: Chamada[] = [];

  constructor(private readonly interno: MockExtractor = new MockExtractor()) {
    super();
  }

  extrair(fonte: FonteImagem, alvos: CampoAlvo[]): Promise<LeituraExtraida[]> {
    this.chamadas.push({
      fonteFisica: fonte.fonteFisica,
      campos: alvos.map((alvo) => alvo.campo),
      mimeType: fonte.mimeType,
      bytes: fonte.imagem.toString(),
    });

    return this.interno.extrair(fonte, alvos);
  }
}

function conteudo(fonteFisica: string): ConteudoEvidencia {
  return {
    buffer: Buffer.from(`bytes-${fonteFisica}`),
    mimeType: 'image/jpeg',
    fonteFisica,
  };
}

interface Bancada {
  service: ConferenciaExtracaoService;
  espiao: ExtractorEspiao;
  executar: jest.Mock<Promise<ResultadoExecucao>, [ExecutarConferenciaDto]>;
  lerConteudo: jest.Mock<Promise<ConteudoEvidencia | null>, [string]>;
}

function montarBancada(
  evidencias: Record<string, ConteudoEvidencia | null> = {
    [ID_PLACA]: conteudo('placa'),
    [ID_SERIGRAFIA]: conteudo('serigrafia'),
  },
  extractor: ExtractorPort = new ExtractorEspiao(),
): Bancada {
  const lerConteudo = jest.fn((id: string) =>
    Promise.resolve(evidencias[id] ?? null),
  );

  const resultadoExecucao: ResultadoExecucao = {
    conferencia: {
      id: 'conferencia-1',
      vereditoGeral: 'divergente',
      createdAt: new Date(),
      checkpoint: null,
    },
    transformador: {
      id: 'transformador-1',
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
      projetoModeloCodigo: 'EPT-163-PI-676',
    },
    etapaAvaliada: null,
    camposAvaliados: CHECKLIST.length,
    campos: [],
  };

  const executar = jest.fn<
    Promise<ResultadoExecucao>,
    [ExecutarConferenciaDto]
  >(() => Promise.resolve(resultadoExecucao));

  const projetoModeloService = {
    findByCodigo: jest.fn(() => Promise.resolve(PROJETO_MODELO)),
    findAll: jest.fn(() => Promise.resolve([PROJETO_MODELO])),
  } as unknown as ProjetoModelosService;

  const service = new ConferenciaExtracaoService(
    { lerConteudo } as unknown as FotoEvidenciaService,
    projetoModeloService,
    new ExtracaoService(extractor),
    { executar } as unknown as ConferenciaExecucaoService,
  );

  return {
    service,
    espiao: extractor as ExtractorEspiao,
    executar,
    lerConteudo,
  };
}

describe('ConferenciaExtracaoService — visao plugada no fluxo', () => {
  it('should recusar com 422 quando a foto informada nao existe', async () => {
    const { service, espiao, executar } = montarBancada({
      [ID_PLACA]: conteudo('placa'),
      [ID_SERIGRAFIA]: null,
    });

    await expect(
      service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        fotoEvidenciaIds: [ID_PLACA, ID_SERIGRAFIA],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    // Foto ausente derruba o lote ANTES de qualquer chamada paga de visao.
    expect(espiao.chamadas).toHaveLength(0);
    expect(executar).not.toHaveBeenCalled();
  });

  it('should apontar no erro qual foto nao existe', async () => {
    const { service } = montarBancada({ [ID_PLACA]: null });

    await expect(
      service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        fotoEvidenciaIds: [ID_PLACA],
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          fotoEvidenciaIds: `foto-evidencia-inexistente: ${ID_PLACA}`,
        },
      },
    });
  });

  it('should chamar o extractor uma vez por foto, com os campos da fonte', async () => {
    const { service, espiao } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA, ID_SERIGRAFIA],
    });

    expect(espiao.chamadas).toHaveLength(2);
    expect(espiao.chamadas[0]).toMatchObject({
      fonteFisica: 'placa',
      campos: ['serie-placa', 'patrimonio-placa'],
      mimeType: 'image/jpeg',
      bytes: 'bytes-placa',
    });
    expect(espiao.chamadas[1].fonteFisica).toBe('serigrafia');
  });

  it('should chamar a visao uma vez so quando o mesmo id vem repetido', async () => {
    const { service, espiao, lerConteudo } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA, ID_PLACA],
    });

    expect(lerConteudo).toHaveBeenCalledTimes(1);
    expect(espiao.chamadas).toHaveLength(1);
  });

  it('should repassar ao executar as leituras produzidas pela visao', async () => {
    const { service, executar } = montarBancada();

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      etapaCodigo: 'fixacao-placa',
      limiarConfianca: 0.7,
      fotoEvidenciaIds: [ID_PLACA, ID_SERIGRAFIA],
    });

    expect(executar).toHaveBeenCalledTimes(1);
    const dto = executar.mock.calls[0][0];

    expect(dto.payloadQr).toBe(PAYLOAD_QR);
    expect(dto.etapaCodigo).toBe('fixacao-placa');
    expect(dto.limiarConfianca).toBe(0.7);

    // Toda leitura chega com confianca e com o vinculo a foto de origem —
    // sem lastro, a conferencia nao seria auditavel (regra de ouro).
    expect(dto.leituras).toHaveLength(4);
    for (const leitura of dto.leituras) {
      expect(typeof leitura.confianca).toBe('number');
      expect(leitura.fotoEvidenciaId).toBeTruthy();
    }

    expect(
      dto.leituras.find((leitura) => leitura.campo === 'serie-placa'),
    ).toMatchObject({
      valorLido: LEITURAS_DEMO['serie-placa'],
      fotoEvidenciaId: ID_PLACA,
    });
    expect(
      dto.leituras.find((leitura) => leitura.campo === 'cliente-serigrafia'),
    ).toMatchObject({ fotoEvidenciaId: ID_SERIGRAFIA });
  });

  it('should devolver o resultado do executar somado ao resumo da extracao', async () => {
    const { service } = montarBancada();

    const resultado = await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_PLACA, ID_SERIGRAFIA],
    });

    expect(resultado.conferencia.id).toBe('conferencia-1');
    expect(resultado.extracao).toEqual({
      driver: 'mock',
      fotos: 2,
      leiturasProduzidas: 4,
    });
  });

  it('should produzir as leituras da peca de demo com o driver default (mock)', async () => {
    // `criarExtractor()` sem EXTRACTOR_DRIVER e o caminho de producao em modo
    // mock: o sistema roda a conferencia ponta a ponta sem credencial AWS.
    const anterior = process.env.EXTRACTOR_DRIVER;
    delete process.env.EXTRACTOR_DRIVER;

    try {
      const { service, executar } = montarBancada(
        {
          [ID_PLACA]: conteudo('placa'),
          [ID_SERIGRAFIA]: conteudo('serigrafia'),
        },
        criarExtractor(),
      );

      const resultado = await service.executarComFotos({
        payloadQr: PAYLOAD_QR,
        fotoEvidenciaIds: [ID_PLACA, ID_SERIGRAFIA],
      });

      expect(resultado.extracao.driver).toBe('mock');

      const dto = executar.mock.calls[0][0];
      const porCampo = new Map(
        dto.leituras.map((leitura) => [leitura.campo, leitura.valorLido]),
      );

      // Cenario-ancora do SPEC: a placa mente (847833) e a serigrafia nao.
      expect(porCampo.get('serie-placa')).toBe('847833');
      expect(porCampo.get('patrimonio-placa')).toBe('251328');
      expect(porCampo.get('patrimonio-serigrafia')).toBe('251328');
    } finally {
      if (anterior === undefined) {
        delete process.env.EXTRACTOR_DRIVER;
      } else {
        process.env.EXTRACTOR_DRIVER = anterior;
      }
    }
  });

  it('should seguir para o executar mesmo sem nenhuma leitura', async () => {
    // Foto de fonte fora do checklist nao gera chamada de visao; a conferencia
    // continua e a engine devolve nao_conferivel — nunca conforme.
    const ID_GERAL = '33333333-3333-4333-8333-333333333333';
    const { service, espiao, executar } = montarBancada({
      [ID_GERAL]: conteudo('geral'),
    });

    await service.executarComFotos({
      payloadQr: PAYLOAD_QR,
      fotoEvidenciaIds: [ID_GERAL],
    });

    expect(espiao.chamadas).toHaveLength(0);
    expect(executar).toHaveBeenCalledTimes(1);
    expect(executar.mock.calls[0][0].leituras).toEqual([]);
  });

  it('should recusar com 422 payload de QR ilegivel antes de chamar a visao', async () => {
    const { service, espiao, lerConteudo } = montarBancada();

    await expect(
      service.executarComFotos({
        payloadQr: '   ',
        fotoEvidenciaIds: [ID_PLACA],
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);

    expect(lerConteudo).not.toHaveBeenCalled();
    expect(espiao.chamadas).toHaveLength(0);
  });

  it('should recusar com 422 payload que so traz codigo de lookup', async () => {
    const { service, espiao } = montarBancada();

    await expect(
      service.executarComFotos({
        payloadQr: 'TPD-408136',
        fotoEvidenciaIds: [ID_PLACA],
      }),
    ).rejects.toMatchObject({
      response: {
        errors: {
          payloadQr:
            'payload-somente-codigo: lookup nao suportado nesta rodada',
        },
      },
    });

    expect(espiao.chamadas).toHaveLength(0);
  });
});

// Vive nesta suite (e nao numa de foto-evidencia) porque so existe para servir
// a extracao: e o que decide de onde vem o byte que a visao vai ler.
describe('ehCaminhoDeDisco — origem dos bytes da evidencia', () => {
  it('should ler do disco tudo enquanto o driver for local', () => {
    expect(ehCaminhoDeDisco('/api/v1/files/abc.jpg', FileDriver.LOCAL)).toBe(
      true,
    );
    expect(ehCaminhoDeDisco('c3ff4dbbf11b.jpg', FileDriver.LOCAL)).toBe(true);
  });

  it('should ler do disco a evidencia anterior a virada para s3', () => {
    // Upload feito sob FILE_DRIVER=local: a key nao existe no bucket, e
    // decidir so pelo driver atual daria 500 nas fotos da peca de demo.
    expect(
      ehCaminhoDeDisco('/api/v1/files/07099539c76.webp', FileDriver.S3),
    ).toBe(true);
  });

  it('should tratar como key de bucket a evidencia enviada sob s3', () => {
    // multer-s3 nomeia a key com hash chapado, sem barra.
    expect(ehCaminhoDeDisco('c3ff4dbbf11b6d84e39.jpg', FileDriver.S3)).toBe(
      false,
    );
    expect(
      ehCaminhoDeDisco('c3ff4dbbf11b6d84e39.jpg', FileDriver.S3_PRESIGNED),
    ).toBe(false);
  });
});
