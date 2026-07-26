import { UnprocessableEntityException } from '@nestjs/common';

import { ConferenciasService } from '../conferencias/conferencias.service';
import { Conferencia } from '../conferencias/domain/conferencia';
import { FotoEvidencia } from '../fotos-evidencia/domain/foto-evidencia';
import { FotosEvidenciaService } from '../fotos-evidencia/fotos-evidencia.service';

import { CamposConferidosService } from './campos-conferidos.service';
import { CampoConferidoRepository } from './infrastructure/persistence/campo-conferido.repository';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// Achado A2 da revisao adversarial: a recusa de evidencia emprestada existia so
// no FIM da linha (`criarComVeredito`), quando a Conferencia ja tinha sido
// criada e N campos gravados. Esta suite fixa a recusa BARATA, que a execucao
// chama antes da primeira escrita. Nada aqui toca banco: os colaboradores
// entram dublados.

const OUTRA_CONFERENCIA = { id: 'conferencia-de-outra-peca' } as Conferencia;

function foto(id: string, conferencia: Conferencia | null): FotoEvidencia {
  return {
    id,
    url: `${id}.jpg`,
    fonteFisica: 'placa',
    conferencia,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function montarBancada(evidencias: Record<string, FotoEvidencia | null>) {
  const findById = jest.fn((id: string) =>
    Promise.resolve(evidencias[id] ?? null),
  );

  const service = new CamposConferidosService(
    { findById } as unknown as FotosEvidenciaService,
    {} as unknown as ConferenciasService,
    {} as unknown as CampoConferidoRepository,
  );

  return { service, findById };
}

describe('validarEvidenciasDisponiveis — recusa barata da evidencia emprestada', () => {
  it('should recusar id de foto que ja pertence a outra conferencia', async () => {
    const { service } = montarBancada({
      'foto-1': foto('foto-1', OUTRA_CONFERENCIA),
    });

    await expect(
      service.validarEvidenciasDisponiveis(['foto-1']),
    ).rejects.toMatchObject({
      response: {
        errors: {
          fotoEvidenciaId: 'foto-evidencia-de-outra-conferencia: foto-1',
        },
      },
    });
  });

  it('should aceitar foto ainda solta', async () => {
    const { service } = montarBancada({ 'foto-1': foto('foto-1', null) });

    await expect(
      service.validarEvidenciasDisponiveis(['foto-1']),
    ).resolves.toBeUndefined();
  });

  it('should tolerar id inexistente, como o contrato do DTO promete', async () => {
    // "Id de FotoEvidencia ja gravada; ignorado se nao existir": a evidencia e
    // complementar ao veredito, e derrubar a conferencia por um id velho
    // perderia um veredito legitimo. Quem persiste sem foto e criarComVeredito.
    const { service } = montarBancada({});

    await expect(
      service.validarEvidenciasDisponiveis(['foto-fantasma']),
    ).resolves.toBeUndefined();
  });

  it('should consultar uma vez so o id repetido no lote', async () => {
    const { service, findById } = montarBancada({
      'foto-1': foto('foto-1', null),
    });

    await service.validarEvidenciasDisponiveis(['foto-1', 'foto-1']);

    expect(findById).toHaveBeenCalledTimes(1);
  });

  it('should recusar o lote inteiro por causa de UMA foto emprestada', async () => {
    const { service } = montarBancada({
      'foto-1': foto('foto-1', null),
      'foto-2': foto('foto-2', OUTRA_CONFERENCIA),
    });

    await expect(
      service.validarEvidenciasDisponiveis(['foto-1', 'foto-2']),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('should nao consultar nada com lote vazio', async () => {
    const { service, findById } = montarBancada({});

    await service.validarEvidenciasDisponiveis([]);

    expect(findById).not.toHaveBeenCalled();
  });
});
