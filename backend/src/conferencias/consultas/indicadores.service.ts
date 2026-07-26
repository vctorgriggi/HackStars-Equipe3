import {
  // common
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CampoConferidoEntity } from '../../campos-conferidos/infrastructure/persistence/relational/entities/campo-conferido.entity';
import { PassagemEntity } from '../../passagens/infrastructure/persistence/relational/entities/passagem.entity';
import { TransformadorEntity } from '../../transformadores/infrastructure/persistence/relational/entities/transformador.entity';

import { Indicadores, TETO_PECAS_NA_LINHA } from '../dto/indicadores.dto';
import { EtapaResumo } from '../dto/resumos-compartilhados.dto';
import { ConferenciaEntity } from '../infrastructure/persistence/relational/entities/conferencia.entity';
import {
  ContagemDeCampo,
  ContagemDeConferencia,
  LinhaDaPeca,
  montarIndicadores,
} from './montar-indicadores';

/**
 * Leitura AGREGADA para o dashboard de linha (T5.1) e os indicadores de
 * auditoria (T5.2). Consulta pura: nenhum INSERT, nenhuma chamada de visão,
 * nenhum crédito AWS — e, sobretudo, nenhum veredito nasce aqui. Tudo o que
 * este serviço faz é CONTAR o que a engine já gravou em
 * `conferencia.vereditoGeral` e `campo_conferido.veredito`.
 *
 * POR QUE ELE FALA COM O TypeORM DIRETO, e não com os `*Repository` do
 * boilerplate: as portas de persistência devolvem AGREGADOS DE DOMÍNIO
 * (`Conferencia`, `Passagem`, com as relações `eager` do gap 3). Montar
 * indicadores com elas significaria carregar conferências, campos e passagens
 * inteiros na memória para contar em JavaScript — exatamente o que um endpoint
 * de dashboard não pode fazer. Aqui a agregação acontece no BANCO
 * (`COUNT`/`GROUP BY`/`DISTINCT ON`), e o que trafega são linhas de contagem.
 * É o lado de LEITURA do sistema, e ele é read-only por construção: a escrita
 * de veredito continua tendo um caminho só
 * (`CamposConferidosService.criarComVeredito`).
 *
 * Nenhuma consulta é por peça: são 6 queries de tamanho fixo, sem N+1, mesmo
 * com o dashboard cheio.
 */
@Injectable()
export class IndicadoresService {
  constructor(
    @InjectRepository(ConferenciaEntity)
    private readonly conferenciaRepository: Repository<ConferenciaEntity>,

    @InjectRepository(CampoConferidoEntity)
    private readonly campoConferidoRepository: Repository<CampoConferidoEntity>,

    @InjectRepository(PassagemEntity)
    private readonly passagemRepository: Repository<PassagemEntity>,

    @InjectRepository(TransformadorEntity)
    private readonly transformadorRepository: Repository<TransformadorEntity>,
  ) {}

  async indicadores(): Promise<Indicadores> {
    const [conferencias, campos, totalPecas, totalPassagens, pecas] =
      await Promise.all([
        this.contarConferenciasPorEtapa(),
        this.contarCamposPorNome(),
        this.transformadorRepository.count(),
        this.passagemRepository.count(),
        this.lerPecasDaLinha(),
      ]);

    return montarIndicadores({
      conferencias,
      campos,
      pecas,
      totalPecas,
      totalPassagens,
    });
  }

  /** `GROUP BY (checkpoint, vereditoGeral)`: uma linha por combinação. */
  private async contarConferenciasPorEtapa(): Promise<ContagemDeConferencia[]> {
    const linhas = await this.conferenciaRepository
      .createQueryBuilder('conferencia')
      // LEFT: conferência SEM checkpoint é a da peça inteira, e ela precisa
      // aparecer no agregado — INNER a apagaria em silêncio.
      .leftJoin('conferencia.checkpoint', 'checkpoint')
      .select('checkpoint.codigo', 'codigo')
      .addSelect('checkpoint.nome', 'nome')
      .addSelect('checkpoint.ordem', 'ordem')
      .addSelect('conferencia.vereditoGeral', 'veredito')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('checkpoint.codigo')
      .addGroupBy('checkpoint.nome')
      .addGroupBy('checkpoint.ordem')
      .addGroupBy('conferencia.vereditoGeral')
      .getRawMany<{
        codigo: string | null;
        nome: string | null;
        ordem: number | null;
        veredito: string | null;
        quantidade: string;
      }>();

    return linhas.map((linha) => ({
      etapa: paraEtapa(linha),
      veredito: linha.veredito,
      quantidade: paraNumero(linha.quantidade),
    }));
  }

  /** `GROUP BY (nomeCampo, veredito)`: o "quais campos mais dão problema". */
  private async contarCamposPorNome(): Promise<ContagemDeCampo[]> {
    const linhas = await this.campoConferidoRepository
      .createQueryBuilder('campo')
      .select('campo.nomeCampo', 'campo')
      .addSelect('campo.veredito', 'veredito')
      .addSelect('COUNT(*)', 'quantidade')
      .groupBy('campo.nomeCampo')
      .addGroupBy('campo.veredito')
      .getRawMany<{
        campo: string;
        veredito: string | null;
        quantidade: string;
      }>();

    return linhas.map((linha) => ({
      campo: linha.campo,
      veredito: linha.veredito,
      quantidade: paraNumero(linha.quantidade),
    }));
  }

  /**
   * As peças do dashboard, cada uma com a última passagem e a última
   * conferência.
   *
   * TRÊS queries de tamanho limitado, nunca uma por peça: (1) as peças, já
   * recortadas pelo teto e ordenadas pelo movimento mais recente — a subquery
   * correlacionada de `MAX(createdAt)` faz o corte pegar quem está ANDANDO na
   * linha, não quem foi cadastrado por último; (2) e (3) o último evento de
   * cada peça via `DISTINCT ON`, restritas aos ids que passaram no teto.
   */
  private async lerPecasDaLinha(): Promise<LinhaDaPeca[]> {
    const pecas = await this.transformadorRepository
      .createQueryBuilder('transformador')
      .select('transformador.id', 'id')
      .addSelect('transformador.numeroSerie', 'numeroSerie')
      .addSelect('transformador.patrimonio', 'patrimonio')
      .addSelect(
        (subquery) =>
          subquery
            .select('MAX(passagem."createdAt")')
            .from(PassagemEntity, 'passagem')
            .where('passagem."transformadorId" = transformador.id'),
        'ultimoMovimento',
      )
      .orderBy('"ultimoMovimento"', 'DESC', 'NULLS LAST')
      .addOrderBy('transformador.createdAt', 'DESC')
      .limit(TETO_PECAS_NA_LINHA)
      .getRawMany<{
        id: string;
        numeroSerie: string;
        patrimonio: string | null;
      }>();

    const ids = pecas.map((peca) => peca.id);
    const [ultimasPassagens, ultimasConferencias] = await Promise.all([
      this.lerUltimaPassagemPorPeca(ids),
      this.lerUltimaConferenciaPorPeca(ids),
    ]);

    return pecas.map((peca) => ({
      transformadorId: peca.id,
      numeroSerie: peca.numeroSerie,
      patrimonio: peca.patrimonio ?? null,
      ultimaPassagem: ultimasPassagens.get(peca.id) ?? null,
      ultimaConferencia: ultimasConferencias.get(peca.id) ?? null,
    }));
  }

  private async lerUltimaPassagemPorPeca(
    ids: string[],
  ): Promise<Map<string, LinhaDaPeca['ultimaPassagem']>> {
    if (ids.length === 0) {
      return new Map();
    }

    const linhas = await this.passagemRepository
      .createQueryBuilder('passagem')
      // `DISTINCT ON` + `ORDER BY` é o jeito do Postgres de dizer "a primeira
      // linha de cada peça": uma query para todas, em vez de uma por peça.
      .distinctOn(['transformador.id'])
      .innerJoin('passagem.transformador', 'transformador')
      .innerJoin('passagem.checkpoint', 'checkpoint')
      .select('transformador.id', 'transformadorId')
      .addSelect('passagem.createdAt', 'em')
      .addSelect('checkpoint.codigo', 'codigo')
      .addSelect('checkpoint.nome', 'nome')
      .where('transformador.id IN (:...ids)', { ids })
      .orderBy('transformador.id')
      .addOrderBy('passagem.createdAt', 'DESC')
      // Desempate estável: duas passagens no MESMO instante (scan repetido)
      // devolveriam vencedora aleatória sem isto.
      .addOrderBy('passagem.id', 'DESC')
      .getRawMany<{
        transformadorId: string;
        em: Date;
        codigo: string;
        nome: string;
      }>();

    return new Map(
      linhas.map((linha) => [
        linha.transformadorId,
        {
          checkpoint: { codigo: linha.codigo, nome: linha.nome },
          em: paraIso(linha.em),
        },
      ]),
    );
  }

  private async lerUltimaConferenciaPorPeca(
    ids: string[],
  ): Promise<Map<string, LinhaDaPeca['ultimaConferencia']>> {
    if (ids.length === 0) {
      return new Map();
    }

    const linhas = await this.conferenciaRepository
      .createQueryBuilder('conferencia')
      .distinctOn(['transformador.id'])
      .innerJoin('conferencia.transformador', 'transformador')
      .leftJoin('conferencia.checkpoint', 'checkpoint')
      .select('transformador.id', 'transformadorId')
      .addSelect('conferencia.createdAt', 'em')
      .addSelect('conferencia.vereditoGeral', 'veredito')
      .addSelect('checkpoint.codigo', 'codigo')
      .addSelect('checkpoint.nome', 'nome')
      .addSelect('checkpoint.ordem', 'ordem')
      .where('transformador.id IN (:...ids)', { ids })
      .orderBy('transformador.id')
      .addOrderBy('conferencia.createdAt', 'DESC')
      .addOrderBy('conferencia.id', 'DESC')
      .getRawMany<{
        transformadorId: string;
        em: Date;
        veredito: string | null;
        codigo: string | null;
        nome: string | null;
        ordem: number | null;
      }>();

    return new Map(
      linhas.map((linha) => [
        linha.transformadorId,
        {
          veredito: linha.veredito ?? null,
          // A etapa viaja COLADA ao veredito de propósito (gap 14): `conforme`
          // de gate parcial não atesta a peça inteira.
          etapa: paraEtapa(linha),
          em: paraIso(linha.em),
        },
      ]),
    );
  }
}

/**
 * Colunas do checkpoint (vindas de um LEFT JOIN) -> `EtapaResumo`. `null` em
 * `codigo` significa conferência sem etapa — a da peça inteira.
 */
function paraEtapa(linha: {
  codigo: string | null;
  nome: string | null;
  ordem: number | null;
}): EtapaResumo | null {
  if (linha.codigo === null) {
    return null;
  }

  return {
    codigo: linha.codigo,
    nome: linha.nome ?? '',
    ordem: paraNumero(linha.ordem),
  };
}

/**
 * `COUNT(*)` volta do driver do Postgres como STRING (bigint não cabe em
 * `number` com segurança). Sem esta conversão o JSON entregaria `"3"` onde o
 * contrato promete número, e o front somaria strings.
 */
function paraNumero(valor: string | number | null | undefined): number {
  return Number(valor ?? 0);
}

/**
 * Timestamp do banco -> ISO-8601 UTC. É o formato que `montarIndicadores`
 * compara textualmente para ordenar a linha, e o que o resto da API já
 * serializa.
 */
function paraIso(valor: Date | string): string {
  return valor instanceof Date
    ? valor.toISOString()
    : new Date(valor).toISOString();
}
