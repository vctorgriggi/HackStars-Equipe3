import {
  // common
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ExtracaoService } from '../extracao/extracao.service';
import { FonteImagem, LeituraExtraida } from '../extracao/ports/extractor.port';
import { FotosEvidenciaService } from '../fotos-evidencia/fotos-evidencia.service';
import { ProjetoModelo } from '../projetos-modelo/domain/projeto-modelo';
import { ProjetosModeloService } from '../projetos-modelo/projetos-modelo.service';

import {
  PayloadInvalidoError,
  ResultadoParse,
} from '../transformadores/qr/payload-etiqueta';
import { parsePayloadEtiqueta } from '../transformadores/qr/qr-payload.parser';

import {
  ConferenciaExecucaoService,
  ResultadoExecucao,
} from './conferencia-execucao.service';
import { ExecutarComFotosDto } from './dto/executar-com-fotos.dto';
import { LeituraCampoDto } from './dto/executar-conferencia.dto';
import { ItemChecklist } from './engine/tipos';

/** O que a visao efetivamente fez nesta execucao (transparencia de custo). */
export interface ResumoExtracao {
  /** Adapter ativo: 'mock' | 'textract' | 'bedrock'. */
  driver: string;
  /** Fotos enviadas ao extrator (teto de UMA chamada de visao por foto). */
  fotos: number;
  /** Leituras que a visao produziu, antes da engine julgar qualquer uma. */
  leiturasProduzidas: number;
}

export type ResultadoExecucaoComExtracao = ResultadoExecucao & {
  extracao: ResumoExtracao;
};

function ehItemChecklist(valor: unknown): valor is ItemChecklist {
  const item = valor as Partial<ItemChecklist> | null;

  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.campo === 'string' &&
    item.campo.length > 0 &&
    typeof item.fonteFisica === 'string' &&
    typeof item.obrigatorio === 'boolean'
  );
}

/**
 * Costura VISAO -> conferencia: ids de fotos ja enviadas viram bytes, os bytes
 * viram leituras com confianca e evidencia, e as leituras entram no MESMO
 * `executar` que o endpoint de leituras digitadas usa.
 *
 * O que este servico deliberadamente NAO faz: comparar campo, calcular
 * veredito ou gravar CampoConferido. Existe UM caminho de escrita de veredito
 * (`ConferenciaExecucaoService.executar` -> engine -> `criarComVeredito`) e
 * duplica-lo aqui quebraria a regra de ouro do projeto.
 */
@Injectable()
export class ConferenciaExtracaoService {
  private readonly logger = new Logger(ConferenciaExtracaoService.name);

  constructor(
    private readonly fotosEvidenciaService: FotosEvidenciaService,

    private readonly projetoModeloService: ProjetosModeloService,

    private readonly extracaoService: ExtracaoService,

    private readonly conferenciaExecucaoService: ConferenciaExecucaoService,
  ) {}

  async executarComFotos(
    dto: ExecutarComFotosDto,
  ): Promise<ResultadoExecucaoComExtracao> {
    // QR primeiro: payload ilegivel vira 422 ANTES de qualquer chamada paga
    // de visao (SPEC, constraint 4). O `executar` reparseia o mesmo payload —
    // barato, e mantem o parser como detalhe privado dele.
    const codigoProjeto = this.lerCodigoProjeto(dto.payloadQr);

    const projetoModelo = await this.resolverProjetoModelo(codigoProjeto);
    const checklist = this.lerChecklist(projetoModelo);

    const fotos = await this.carregarFotos(dto.fotoEvidenciaIds);

    // Checklist INTEIRA de proposito, mesmo quando o request fixa etapa: o
    // recorte por etapa e politica de veredito e mora no `executar`. Aqui ele
    // nao economizaria nada — o custo e UMA chamada por foto, nao por campo —
    // e so faria a visao ignorar marcacao que ja esta na peca.
    //
    // UMA chamada de visao por foto, sem retry e sem laco: a politica mora no
    // ExtracaoService e nao se reimplementa aqui.
    const leituras = await this.extracaoService.extrairDeFotos(
      fotos,
      checklist,
    );

    if (leituras.length === 0) {
      // Nao e erro: campo sem leitura vira `nao_conferivel` na engine, que e
      // exatamente o veredito correto para uma peca que a visao nao leu.
      // Rebaixar para erro (ou pior, para conforme) e o bug caro do dominio.
      this.logger.warn(
        `extracao sem leituras (driver "${this.extracaoService.adapterAtivo}", ` +
          `${fotos.length} foto(s)): a conferencia sai nao_conferivel`,
      );
    }

    const resultado = await this.conferenciaExecucaoService.executar({
      payloadQr: dto.payloadQr,
      etapaCodigo: dto.etapaCodigo,
      limiarConfianca: dto.limiarConfianca,
      leituras: leituras.map(paraLeituraDto),
    });

    return {
      ...resultado,
      extracao: {
        driver: this.extracaoService.adapterAtivo,
        fotos: fotos.length,
        leiturasProduzidas: leituras.length,
      },
    };
  }

  /**
   * So o `codigoProjeto` interessa aqui: o resto do payload e assunto do
   * `executar`. Os 422 repetem a mensagem dele de proposito — o cliente ve o
   * mesmo erro nos dois endpoints.
   */
  private lerCodigoProjeto(payloadQr: string): string | null {
    let resultado: ResultadoParse;

    try {
      resultado = parsePayloadEtiqueta(payloadQr);
    } catch (erro) {
      if (erro instanceof PayloadInvalidoError) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            payloadQr: erro.motivo,
          },
        });
      }
      throw erro;
    }

    if (resultado.tipo === 'codigo') {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          payloadQr:
            'payload-somente-codigo: lookup nao suportado nesta rodada',
        },
      });
    }

    return resultado.dados.codigoProjeto;
  }

  /**
   * Codigo do projeto no QR -> unico projeto cadastrado. Nao consulta o
   * vinculo da peca (como o `executar` faz) porque aqui a peca ainda nem foi
   * resolvida: a checklist so precisa dizer QUAIS campos ler de QUAL fonte
   * fisica, e o `executar` refaz a resolucao completa antes de comparar.
   */
  private async resolverProjetoModelo(
    codigoProjeto: string | null,
  ): Promise<ProjetoModelo> {
    if (codigoProjeto) {
      const porCodigo =
        await this.projetoModeloService.findByCodigo(codigoProjeto);
      if (porCodigo) {
        return porCodigo;
      }
    }

    const todos = await this.projetoModeloService.findAll();
    if (todos.length === 1) {
      return todos[0];
    }

    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        projetoModelo: 'projeto-modelo-indeterminado',
      },
    });
  }

  /**
   * Mesma validacao do `executar`: checklist e texto JSON na coluna, e JSON
   * quebrado e dado corrompido (500), nao erro do cliente.
   */
  private lerChecklist(projetoModelo: ProjetoModelo): ItemChecklist[] {
    let bruto: unknown;

    try {
      bruto = JSON.parse(projetoModelo.checklist);
    } catch {
      throw new InternalServerErrorException(
        `checklist-invalido: JSON malformado no ProjetoModelo ${projetoModelo.codigo}`,
      );
    }

    if (!Array.isArray(bruto) || bruto.length === 0) {
      throw new InternalServerErrorException(
        `checklist-invalido: esperado array nao vazio no ProjetoModelo ${projetoModelo.codigo}`,
      );
    }

    if (!bruto.every(ehItemChecklist)) {
      throw new InternalServerErrorException(
        `checklist-invalido: item fora do formato { campo, fonteFisica, obrigatorio } no ProjetoModelo ${projetoModelo.codigo}`,
      );
    }

    return bruto;
  }

  /**
   * Ids -> bytes. Sequencial e com ids deduplicados: id repetido no request
   * pagaria a mesma foto duas vezes (constraint 4). Foto inexistente derruba
   * o lote inteiro ANTES de qualquer chamada de visao — conferencia parcial
   * silenciosa e pior que erro explicito.
   */
  private async carregarFotos(ids: string[]): Promise<FonteImagem[]> {
    const fotos: FonteImagem[] = [];

    for (const id of [...new Set(ids)]) {
      const conteudo = await this.fotosEvidenciaService.lerConteudo(id);

      if (!conteudo) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            fotoEvidenciaIds: `foto-evidencia-inexistente: ${id}`,
          },
        });
      }

      fotos.push({
        fotoEvidenciaId: id,
        fonteFisica: conteudo.fonteFisica,
        imagem: conteudo.buffer,
        mimeType: conteudo.mimeType,
      });
    }

    return fotos;
  }
}

/**
 * `LeituraExtraida` -> `LeituraCampoDto`. Os dois tipos ja coincidem campo a
 * campo; o mapeamento explicito e o que garante que uma mudanca na porta de
 * extracao apareca como erro de compilacao aqui, e nao como campo silenciosa-
 * mente perdido no caminho da evidencia.
 */
function paraLeituraDto(leitura: LeituraExtraida): LeituraCampoDto {
  return {
    campo: leitura.campo,
    valorLido: leitura.valorLido,
    confianca: leitura.confianca,
    regiaoLeitura: leitura.regiaoLeitura,
    fotoEvidenciaId: leitura.fotoEvidenciaId,
  };
}
