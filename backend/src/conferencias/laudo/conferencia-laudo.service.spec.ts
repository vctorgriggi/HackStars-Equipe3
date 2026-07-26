import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';

import { MockRedator } from '../../extracao/adapters/mock.redator';
import {
  DISCLAIMER_LAUDO,
  FatosDoLaudo,
  RedatorPort,
} from '../../extracao/ports/redator.port';
import { ConferenciaConsultasService } from '../consultas/conferencia-consultas.service';
import { VereditoConferencia } from '../consultas/veredito-conferencia';
import { ConferenciaLaudoService } from './conferencia-laudo.service';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should".
//
// O QUE ESTA SUITE PROTEGE: que o laudo seja SEMPRE subordinado ao veredito.
// Tres invariantes, nesta ordem de importancia:
//
// 1. falha do redator NUNCA vira texto (vazio, generico ou de desculpa) — vira
//    erro explicito `laudo-indisponivel`. Um laudo em branco ao lado de uma
//    peca divergente e lido como "nada a relatar";
// 2. o disclaimer sai em todo laudo, inclusive quando o modelo o esquece;
// 3. conferencia inexistente e 404 ANTES de qualquer chamada paga.

const AGORA = new Date('2026-07-26T13:02:11.412Z');

const CENARIO_ANCORA: VereditoConferencia = {
  conferencia: {
    id: 'conferencia-1',
    vereditoGeral: 'divergente',
    createdAt: AGORA,
    observacao: null,
    checkpoint: { codigo: 'fixacao-placa', nome: 'Fixação da placa', ordem: 4 },
  },
  transformador: {
    id: 'transformador-1',
    numeroSerie: '847233',
    patrimonio: '251328',
    cliente: 'Energisa',
  },
  campos: [
    {
      id: 'campo-1',
      campo: 'serie-chumbada-topo',
      fonteFisica: 'topo',
      obrigatorio: true,
      valorEsperado: '847233',
      valorLido: '847233',
      confianca: 0.999,
      veredito: 'conforme',
      regiaoLeitura: null,
      fotoEvidencia: null,
    },
    {
      id: 'campo-2',
      campo: 'serie-placa',
      fonteFisica: 'placa',
      obrigatorio: true,
      valorEsperado: '847233',
      valorLido: '847833',
      confianca: 0.998,
      veredito: 'divergente',
      regiaoLeitura: null,
      fotoEvidencia: null,
    },
    {
      id: 'campo-3',
      campo: 'serie-chumbada-traseira',
      fonteFisica: 'traseira',
      obrigatorio: true,
      valorEsperado: '847233',
      valorLido: null,
      confianca: null,
      veredito: 'nao_conferivel',
      regiaoLeitura: null,
      fotoEvidencia: null,
    },
  ],
};

function montar({
  vereditoEncontrado = CENARIO_ANCORA,
  redator = new MockRedator() as RedatorPort,
}: {
  vereditoEncontrado?: VereditoConferencia | 'inexistente';
  redator?: RedatorPort;
} = {}) {
  const consultas = {
    vereditoPorConferencia: jest.fn(() =>
      vereditoEncontrado === 'inexistente'
        ? Promise.reject(
            new NotFoundException({
              errors: {
                conferencia: 'conferencia-inexistente: conferencia-1',
              },
            }),
          )
        : Promise.resolve(vereditoEncontrado),
    ),
  } as unknown as ConferenciaConsultasService;

  return {
    service: new ConferenciaLaudoService(consultas, redator),
    consultas,
    redator,
  };
}

/** Redator dublê que registra os fatos recebidos e devolve texto controlado. */
class RedatorEspiao extends RedatorPort {
  readonly nome = 'espiao';
  readonly modelo = 'modelo-de-teste';

  recebeu: FatosDoLaudo | null = null;

  constructor(private readonly texto: string) {
    super();
  }

  redigirLaudo(fatos: FatosDoLaudo): Promise<string> {
    this.recebeu = fatos;
    return Promise.resolve(this.texto);
  }
}

class RedatorQueFalha extends RedatorPort {
  readonly nome = 'quebrado';
  readonly modelo = 'modelo-de-teste';

  redigirLaudo(): Promise<string> {
    return Promise.reject(new Error('AccessDeniedException: sem credencial'));
  }
}

describe('ConferenciaLaudoService.gerarLaudo', () => {
  it('should devolver laudo, modelo e geradoEm', async () => {
    const { service } = montar();

    const resposta = await service.gerarLaudo('conferencia-1');

    expect(resposta.laudo.length).toBeGreaterThan(0);
    expect(resposta.modelo).toBe('mock');
    expect(() => new Date(resposta.geradoEm).toISOString()).not.toThrow();
  });

  it('should terminar o laudo no disclaimer mesmo quando o modelo o esquece', async () => {
    const { service } = montar({
      redator: new RedatorEspiao('A peca esta divergente e deve parar.'),
    });

    const resposta = await service.gerarLaudo('conferencia-1');

    expect(resposta.laudo.endsWith(DISCLAIMER_LAUDO)).toBe(true);
  });

  it('should mandar ao redator so os fatos persistidos, com as contagens', async () => {
    const espiao = new RedatorEspiao(`texto\n\n${DISCLAIMER_LAUDO}`);
    const { service } = montar({ redator: espiao });

    await service.gerarLaudo('conferencia-1');

    expect(espiao.recebeu).toMatchObject({
      peca: {
        numeroSerie: '847233',
        patrimonio: '251328',
        cliente: 'Energisa',
      },
      etapaAvaliada: 'Fixação da placa',
      vereditoGeral: 'divergente',
      contagens: {
        total: 3,
        conformes: 1,
        divergentes: 1,
        naoConferiveis: 1,
        semVeredito: 0,
      },
    });
  });

  it('should transportar o cenario-ancora ao laudo sem alterar o veredito', async () => {
    // 847233 na etiqueta, 847833 na placa: o laudo cita os dois numeros e
    // continua chamando a conferencia de divergente. Redacao NAO reclassifica.
    const { service } = montar();

    const resposta = await service.gerarLaudo('conferencia-1');

    expect(resposta.laudo).toContain('847233');
    expect(resposta.laudo).toContain('847833');
    expect(resposta.laudo).toContain('divergente');
  });

  it('should responder 503 laudo-indisponivel quando o redator falha', async () => {
    // Nunca texto vazio nem "nao foi possivel analisar": ao lado de uma peca
    // divergente, os dois seriam lidos como "nada a relatar".
    const { service } = montar({ redator: new RedatorQueFalha() });

    await expect(service.gerarLaudo('conferencia-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await expect(service.gerarLaudo('conferencia-1')).rejects.toMatchObject({
      response: {
        errors: {
          laudo: 'laudo-indisponivel: AccessDeniedException: sem credencial',
        },
      },
    });
  });

  it('should propagar 404 conferencia-inexistente sem chamar o redator', async () => {
    const espiao = new RedatorEspiao('nao deveria ser chamado');
    const { service } = montar({
      vereditoEncontrado: 'inexistente',
      redator: espiao,
    });

    await expect(service.gerarLaudo('conferencia-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    // Id errado nao pode gastar credito AWS.
    expect(espiao.recebeu).toBeNull();
  });

  it('should ler o veredito uma unica vez, pela mesma porta da releitura', async () => {
    const { service, consultas } = montar();

    await service.gerarLaudo('conferencia-1');

    expect(consultas.vereditoPorConferencia).toHaveBeenCalledTimes(1);
    expect(consultas.vereditoPorConferencia).toHaveBeenCalledWith(
      'conferencia-1',
    );
  });
});

describe('MockRedator', () => {
  it('should anunciar que o laudo e SIMULADO', async () => {
    // Texto em prosa parece autoral: se a IA nao rodou, o leitor tem de saber.
    const laudo = await new MockRedator().redigirLaudo({
      peca: {
        numeroSerie: '847233',
        patrimonio: '251328',
        cliente: 'Energisa',
      },
      etapaAvaliada: null,
      vereditoGeral: 'conforme',
      campos: [],
      contagens: {
        total: 0,
        conformes: 0,
        divergentes: 0,
        naoConferiveis: 0,
        semVeredito: 0,
      },
      observacao: null,
      conferidaEm: AGORA.toISOString(),
    });

    expect(laudo).toContain('SIMULADO');
    expect(laudo.endsWith(DISCLAIMER_LAUDO)).toBe(true);
  });
});
