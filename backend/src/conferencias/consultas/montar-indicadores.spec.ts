import { EtapaResumo } from '../dto/resumos-compartilhados.dto';
import {
  ContagemDeCampo,
  ContagemDeConferencia,
  EntradaIndicadores,
  LinhaDaPeca,
  montarIndicadores,
} from './montar-indicadores';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// O que esta suite protege: os indicadores sao CONTAGEM do que a engine ja
// gravou. Nenhum teste aqui espera veredito calculado — o que se protege e a
// agregacao (grupos, etapa nula, peca sem historico) e a ORDEM, que e contrato:
// e ela que faz o topo de `porCampo` significar "investigue por aqui" e o topo
// de `linha` significar "esta peca acabou de se mover".

const SERIGRAFIA: EtapaResumo = {
  codigo: 'serigrafia',
  nome: 'Serigrafia',
  ordem: 2,
};

const FIXACAO_PLACA: EtapaResumo = {
  codigo: 'fixacao-placa',
  nome: 'Fixacao da placa de identificacao',
  ordem: 4,
};

function entrada(
  parcial: Partial<EntradaIndicadores> = {},
): EntradaIndicadores {
  return {
    conferencias: [],
    campos: [],
    pecas: [],
    totalPecas: 0,
    totalPassagens: 0,
    ...parcial,
  };
}

function peca(parcial: Partial<LinhaDaPeca> & { numeroSerie: string }) {
  return {
    transformadorId: `id-${parcial.numeroSerie}`,
    patrimonio: null,
    ultimaPassagem: null,
    ultimaConferencia: null,
    ...parcial,
  } satisfies LinhaDaPeca;
}

describe('montarIndicadores', () => {
  describe('totais', () => {
    it('should somar as conferencias por veredito e repassar peca e passagem', () => {
      const conferencias: ContagemDeConferencia[] = [
        { etapa: SERIGRAFIA, veredito: 'conforme', quantidade: 3 },
        { etapa: SERIGRAFIA, veredito: 'divergente', quantidade: 1 },
        { etapa: FIXACAO_PLACA, veredito: 'divergente', quantidade: 2 },
        { etapa: null, veredito: 'nao_conferivel', quantidade: 4 },
      ];

      const indicadores = montarIndicadores(
        entrada({ conferencias, totalPecas: 7, totalPassagens: 21 }),
      );

      expect(indicadores.totais).toEqual({
        conferencias: 10,
        divergentes: 3,
        naoConferiveis: 4,
        conformes: 3,
        pecas: 7,
        passagens: 21,
      });
    });

    it('should contar conferencia sem veredito no total e em nenhum balde', () => {
      // Linha crua do `POST /conferencias` (CRUD gerado): existe no banco, mas
      // nao passou pela engine. Some-la a um balde inventaria conformidade.
      const indicadores = montarIndicadores(
        entrada({
          conferencias: [
            { etapa: null, veredito: null, quantidade: 2 },
            { etapa: null, veredito: 'conforme', quantidade: 1 },
          ],
        }),
      );

      expect(indicadores.totais.conferencias).toBe(3);
      expect(indicadores.totais.conformes).toBe(1);
      expect(indicadores.totais.divergentes).toBe(0);
      expect(indicadores.totais.naoConferiveis).toBe(0);
    });

    it('should ignorar veredito desconhecido em vez de escolher um balde', () => {
      const indicadores = montarIndicadores(
        entrada({
          conferencias: [
            { etapa: null, veredito: 'quase-conforme', quantidade: 5 },
          ],
        }),
      );

      expect(indicadores.totais.conferencias).toBe(5);
      expect(indicadores.totais.conformes).toBe(0);
      expect(indicadores.totais.divergentes).toBe(0);
      expect(indicadores.totais.naoConferiveis).toBe(0);
    });

    it('should devolver zeros com o banco vazio, nunca lista ou undefined', () => {
      const indicadores = montarIndicadores(entrada());

      expect(indicadores.totais).toEqual({
        conferencias: 0,
        divergentes: 0,
        naoConferiveis: 0,
        conformes: 0,
        pecas: 0,
        passagens: 0,
      });
      expect(indicadores.porEtapa).toEqual([]);
      expect(indicadores.porCampo).toEqual([]);
      expect(indicadores.linha).toEqual([]);
    });
  });

  describe('porEtapa', () => {
    it('should juntar os vereditos da mesma etapa num grupo so', () => {
      const indicadores = montarIndicadores(
        entrada({
          conferencias: [
            { etapa: SERIGRAFIA, veredito: 'conforme', quantidade: 3 },
            { etapa: SERIGRAFIA, veredito: 'divergente', quantidade: 1 },
            { etapa: SERIGRAFIA, veredito: 'nao_conferivel', quantidade: 2 },
          ],
        }),
      );

      expect(indicadores.porEtapa).toEqual([
        {
          etapa: SERIGRAFIA,
          divergentes: 1,
          naoConferiveis: 2,
          conformes: 3,
        },
      ]);
    });

    it('should ordenar as etapas pela ordem da linha', () => {
      const indicadores = montarIndicadores(
        entrada({
          conferencias: [
            { etapa: FIXACAO_PLACA, veredito: 'conforme', quantidade: 1 },
            { etapa: SERIGRAFIA, veredito: 'conforme', quantidade: 1 },
          ],
        }),
      );

      expect(indicadores.porEtapa.map((grupo) => grupo.etapa?.codigo)).toEqual([
        'serigrafia',
        'fixacao-placa',
      ]);
    });

    it('should desempatar por codigo quando duas etapas tem a mesma ordem', () => {
      // `Checkpoint.ordem` nao tem unique (gap 15 do CLAUDE.md): sem desempate
      // estavel a tela reordenaria sozinha a cada refresh.
      const gemea: EtapaResumo = {
        codigo: 'adesivacao',
        nome: 'Adesivacao',
        ordem: 2,
      };

      const indicadores = montarIndicadores(
        entrada({
          conferencias: [
            { etapa: SERIGRAFIA, veredito: 'conforme', quantidade: 1 },
            { etapa: gemea, veredito: 'conforme', quantidade: 1 },
          ],
        }),
      );

      expect(indicadores.porEtapa.map((grupo) => grupo.etapa?.codigo)).toEqual([
        'adesivacao',
        'serigrafia',
      ]);
    });

    it('should agrupar a conferencia sem etapa e deixa-la por ultimo', () => {
      // `etapa: null` e a conferencia da PECA INTEIRA — nao e posicao da linha.
      const indicadores = montarIndicadores(
        entrada({
          conferencias: [
            { etapa: null, veredito: 'divergente', quantidade: 2 },
            { etapa: null, veredito: 'conforme', quantidade: 1 },
            { etapa: SERIGRAFIA, veredito: 'conforme', quantidade: 1 },
          ],
        }),
      );

      expect(indicadores.porEtapa).toEqual([
        { etapa: SERIGRAFIA, divergentes: 0, naoConferiveis: 0, conformes: 1 },
        { etapa: null, divergentes: 2, naoConferiveis: 0, conformes: 1 },
      ]);
    });
  });

  describe('porCampo', () => {
    it('should juntar os vereditos do mesmo campo num grupo so', () => {
      const campos: ContagemDeCampo[] = [
        { campo: 'serie-placa', veredito: 'conforme', quantidade: 8 },
        { campo: 'serie-placa', veredito: 'divergente', quantidade: 2 },
        { campo: 'serie-placa', veredito: 'nao_conferivel', quantidade: 1 },
      ];

      const indicadores = montarIndicadores(entrada({ campos }));

      expect(indicadores.porCampo).toEqual([
        {
          campo: 'serie-placa',
          divergentes: 2,
          naoConferiveis: 1,
          conformes: 8,
        },
      ]);
    });

    it('should ordenar por divergentes desc — o topo e onde investigar', () => {
      const indicadores = montarIndicadores(
        entrada({
          campos: [
            {
              campo: 'patrimonio-serigrafia-topo',
              veredito: 'divergente',
              quantidade: 1,
            },
            { campo: 'serie-placa', veredito: 'divergente', quantidade: 9 },
            {
              campo: 'serie-chumbada-topo',
              veredito: 'divergente',
              quantidade: 4,
            },
          ],
        }),
      );

      expect(indicadores.porCampo.map((grupo) => grupo.campo)).toEqual([
        'serie-placa',
        'serie-chumbada-topo',
        'patrimonio-serigrafia-topo',
      ]);
    });

    it('should desempatar divergentes iguais por nao conferiveis desc', () => {
      // Campo que so acumula `nao_conferivel` tambem e problema (de captura,
      // nao de peca) — o alfabeto nao pode enterra-lo.
      const indicadores = montarIndicadores(
        entrada({
          campos: [
            { campo: 'a-campo-tranquilo', veredito: 'conforme', quantidade: 9 },
            {
              campo: 'z-campo-ilegivel',
              veredito: 'nao_conferivel',
              quantidade: 7,
            },
          ],
        }),
      );

      expect(indicadores.porCampo.map((grupo) => grupo.campo)).toEqual([
        'z-campo-ilegivel',
        'a-campo-tranquilo',
      ]);
    });

    it('should desempatar por nome quando as contagens sao iguais', () => {
      const indicadores = montarIndicadores(
        entrada({
          campos: [
            { campo: 'serie-placa', veredito: 'divergente', quantidade: 2 },
            {
              campo: 'patrimonio-placa',
              veredito: 'divergente',
              quantidade: 2,
            },
          ],
        }),
      );

      expect(indicadores.porCampo.map((grupo) => grupo.campo)).toEqual([
        'patrimonio-placa',
        'serie-placa',
      ]);
    });

    it('should manter o campo cujo veredito o banco nao conhece, zerado', () => {
      const indicadores = montarIndicadores(
        entrada({
          campos: [{ campo: 'serie-placa', veredito: null, quantidade: 3 }],
        }),
      );

      expect(indicadores.porCampo).toEqual([
        {
          campo: 'serie-placa',
          divergentes: 0,
          naoConferiveis: 0,
          conformes: 0,
        },
      ]);
    });
  });

  describe('linha', () => {
    const emSerigrafia = {
      checkpoint: { codigo: 'serigrafia', nome: 'Serigrafia' },
      em: '2026-07-26T10:00:00.000Z',
    };

    const emFixacao = {
      checkpoint: {
        codigo: 'fixacao-placa',
        nome: 'Fixacao da placa de identificacao',
      },
      em: '2026-07-26T18:30:00.000Z',
    };

    it('should ordenar pela passagem mais recente primeiro', () => {
      const indicadores = montarIndicadores(
        entrada({
          pecas: [
            peca({ numeroSerie: '111', ultimaPassagem: emSerigrafia }),
            peca({ numeroSerie: '222', ultimaPassagem: emFixacao }),
          ],
        }),
      );

      expect(indicadores.linha.map((item) => item.numeroSerie)).toEqual([
        '222',
        '111',
      ]);
    });

    it('should jogar para o fim a peca que nunca passou por checkpoint', () => {
      const indicadores = montarIndicadores(
        entrada({
          pecas: [
            peca({ numeroSerie: '333' }),
            peca({ numeroSerie: '111', ultimaPassagem: emSerigrafia }),
          ],
        }),
      );

      expect(indicadores.linha.map((item) => item.numeroSerie)).toEqual([
        '111',
        '333',
      ]);
    });

    it('should desempatar quem nao passou pela conferencia mais recente', () => {
      const indicadores = montarIndicadores(
        entrada({
          pecas: [
            peca({
              numeroSerie: '111',
              ultimaConferencia: {
                veredito: 'conforme',
                etapa: SERIGRAFIA,
                em: '2026-07-26T08:00:00.000Z',
              },
            }),
            peca({
              numeroSerie: '222',
              ultimaConferencia: {
                veredito: 'divergente',
                etapa: null,
                em: '2026-07-26T09:00:00.000Z',
              },
            }),
          ],
        }),
      );

      expect(indicadores.linha.map((item) => item.numeroSerie)).toEqual([
        '222',
        '111',
      ]);
    });

    it('should desempatar por numero de serie a peca sem historico nenhum', () => {
      const indicadores = montarIndicadores(
        entrada({
          pecas: [peca({ numeroSerie: '999' }), peca({ numeroSerie: '111' })],
        }),
      );

      expect(indicadores.linha.map((item) => item.numeroSerie)).toEqual([
        '111',
        '999',
      ]);
    });

    it('should preservar a peca sem conferencia com ultimaConferencia null', () => {
      // `null` aqui NAO e "sem problema": e ausencia de conferencia, e a tela
      // precisa poder dizer isso — por isso a chave existe, em vez de sumir.
      const indicadores = montarIndicadores(
        entrada({
          pecas: [
            peca({
              numeroSerie: '847233',
              patrimonio: '251328',
              ultimaPassagem: emSerigrafia,
            }),
          ],
        }),
      );

      expect(indicadores.linha).toEqual([
        {
          transformadorId: 'id-847233',
          numeroSerie: '847233',
          patrimonio: '251328',
          ultimaPassagem: emSerigrafia,
          ultimaConferencia: null,
        },
      ]);
    });

    it('should carregar a etapa colada ao veredito vigente (gap 14)', () => {
      // `conforme` de gate parcial nao atesta a peca inteira: quem exibe o
      // veredito precisa receber a etapa no MESMO objeto, nunca em outra rota.
      const indicadores = montarIndicadores(
        entrada({
          pecas: [
            peca({
              numeroSerie: '847233',
              ultimaConferencia: {
                veredito: 'conforme',
                etapa: SERIGRAFIA,
                em: '2026-07-26T09:00:00.000Z',
              },
            }),
          ],
        }),
      );

      expect(indicadores.linha[0].ultimaConferencia).toEqual({
        veredito: 'conforme',
        etapa: SERIGRAFIA,
        em: '2026-07-26T09:00:00.000Z',
      });
    });

    it('should nao mutar a lista de pecas recebida', () => {
      const pecas = [
        peca({ numeroSerie: '222', ultimaPassagem: emFixacao }),
        peca({ numeroSerie: '111', ultimaPassagem: emSerigrafia }),
      ];
      const ordemOriginal = pecas.map((item) => item.numeroSerie);

      montarIndicadores(entrada({ pecas }));

      expect(pecas.map((item) => item.numeroSerie)).toEqual(ordemOriginal);
    });
  });
});
