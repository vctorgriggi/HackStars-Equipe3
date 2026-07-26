import { AnuncioPassagemService } from './anuncio-passagem.service';
import { OcupacaoEsteiraService } from './consultas/ocupacao-esteira.service';
import { TempoRealGateway } from './tempo-real.gateway';
import { ResultadoRegistroPassagem } from '../passagens/dto/resultado-registro-passagem.dto';

// Nota de lint: todo `it` comeca com "should"; o resto da frase em portugues.
//
// O contrato critico do anuncio: quando ele roda, a Passagem JA esta gravada —
// erro de difusao nunca pode virar 500 num scan que deu certo.

function resultado(): ResultadoRegistroPassagem {
  return {
    passagem: {
      id: 'passagem-1',
      createdAt: new Date('2026-07-26T12:00:00.000Z'),
      observacao: null,
    },
    checkpoint: { codigo: 'serigrafia', nome: 'Serigrafia', ordem: 2 },
    transformador: {
      id: 'transformador-1',
      numeroSerie: '847233',
      patrimonio: '251328',
      cliente: 'Energisa',
    },
    ultimaConferencia: null,
  };
}

function montarBancada(opcoes: { totaisFalham?: boolean } = {}) {
  const emitir = jest.fn();
  const gateway = {
    emitirPassagemRegistrada: emitir,
  } as unknown as TempoRealGateway;

  const totais = opcoes.totaisFalham
    ? jest.fn(() => Promise.reject(new Error('banco fora do ar')))
    : jest.fn(() =>
        Promise.resolve([
          { codigo: 'adesivacao', total: 0 },
          { codigo: 'serigrafia', total: 1 },
        ]),
      );
  const ocupacao = { totais } as unknown as OcupacaoEsteiraService;

  return { service: new AnuncioPassagemService(gateway, ocupacao), emitir };
}

describe('anunciar', () => {
  it('should emitir o evento com resultado, checkpoint anterior e totais', async () => {
    const { service, emitir } = montarBancada();
    const dado = resultado();

    await service.anunciar(dado, {
      codigo: 'adesivacao',
      nome: 'Adesivacao',
      ordem: 1,
    });

    expect(emitir).toHaveBeenCalledWith({
      resultado: dado,
      checkpointAnterior: {
        codigo: 'adesivacao',
        nome: 'Adesivacao',
        ordem: 1,
      },
      totais: [
        { codigo: 'adesivacao', total: 0 },
        { codigo: 'serigrafia', total: 1 },
      ],
    });
  });

  it('should nao propagar falha do calculo de totais', async () => {
    const { service, emitir } = montarBancada({ totaisFalham: true });

    // Nao lanca: o scan que disparou o anuncio JA foi gravado.
    await expect(service.anunciar(resultado(), null)).resolves.toBeUndefined();
    expect(emitir).not.toHaveBeenCalled();
  });
});
