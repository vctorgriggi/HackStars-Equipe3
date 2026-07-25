import {
  // common
  HttpStatus,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ExtracaoService } from '../extracao/extracao.service';
import { FonteImagem, LeituraExtraida } from '../extracao/ports/extractor.port';
import { FotoEvidencia } from '../fotos-evidencia/domain/foto-evidencia';
import { FotosEvidenciaService } from '../fotos-evidencia/fotos-evidencia.service';

import {
  ConferenciaExecucaoService,
  ContextoExecucao,
  ResultadoExecucao,
} from './conferencia-execucao.service';
import { ConferenciasService } from './conferencias.service';
import { ExecutarComFotosDto } from './dto/executar-com-fotos.dto';
import { LeituraCampoDto } from './dto/executar-conferencia.dto';

/** O que a visao efetivamente fez nesta execucao (transparencia de custo). */
export interface ResumoExtracao {
  /** Adapter ativo: 'mock' | 'textract' | 'bedrock'. */
  driver: string;
  /** Fotos enviadas ao extrator (teto de UMA chamada de visao por foto). */
  fotos: number;
  /** Leituras que a visao produziu, antes da engine julgar qualquer uma. */
  leiturasProduzidas: number;
  /**
   * Fotos informadas que NAO foram enviadas: nenhum campo do recorte desta
   * etapa sai da fonte fisica delas (a foto 'geral' e o caso classico, e no
   * gate da adesivacao a foto da placa tambem). Nao e erro — e o custo que
   * deixou de ser pago, explicito para quem le a resposta.
   */
  fotosForaDoRecorte: number;
}

export type ResultadoExecucaoComExtracao = ResultadoExecucao & {
  extracao: ResumoExtracao;
};

/**
 * Costura VISAO -> conferencia: ids de fotos ja enviadas viram bytes, os bytes
 * viram leituras com confianca e evidencia, e as leituras entram no MESMO
 * `executar` que o endpoint de leituras digitadas usa.
 *
 * Ordem inegociavel do metodo: TUDO que e barato e pode dar 422 acontece antes
 * do primeiro byte ir para a visao (SPEC, constraint 4) — parse do QR, etapa,
 * projeto/checklist, recorte da etapa e validacao do lote de evidencias.
 *
 * O que este servico deliberadamente NAO faz: comparar campo, calcular
 * veredito, gravar CampoConferido ou resolver ProjetoModelo por regra propria.
 * Existe UM caminho de escrita de veredito (`ConferenciaExecucaoService.
 * executar` -> engine -> `criarComVeredito`) e UMA resolucao de projeto
 * (`prepararExecucao`); duplicar qualquer um deles quebraria a regra de ouro.
 */
@Injectable()
export class ConferenciaExtracaoService {
  private readonly logger = new Logger(ConferenciaExtracaoService.name);

  constructor(
    private readonly fotosEvidenciaService: FotosEvidenciaService,

    private readonly conferenciasService: ConferenciasService,

    private readonly extracaoService: ExtracaoService,

    private readonly conferenciaExecucaoService: ConferenciaExecucaoService,
  ) {}

  async executarComFotos(
    dto: ExecutarComFotosDto,
  ): Promise<ResultadoExecucaoComExtracao> {
    // Barato primeiro, e sem escrever nada: payload ilegivel, etapa
    // inexistente ('Serigrafia' com S maiusculo vindo de ?etapa=), projeto
    // indeterminado e recorte vazio saem como 422 ANTES de qualquer chamada
    // paga. O contexto volta com a MESMA checklist que a engine vai avaliar.
    const contexto = await this.conferenciaExecucaoService.prepararExecucao({
      payloadQr: dto.payloadQr,
      etapaCodigo: dto.etapaCodigo,
    });

    const registros = await this.carregarRegistros(dto.fotoEvidenciaIds);

    const { usadas, foraDoRecorte } = this.filtrarPeloRecorte(
      registros,
      contexto,
    );

    const fotos = await this.lerBytes(usadas);

    // UMA chamada de visao por foto, sem retry e sem laco: a politica mora no
    // ExtracaoService e nao se reimplementa aqui.
    const leituras = await this.extracaoService.extrairDeFotos(
      fotos,
      contexto.checklist,
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

    const resultado = await this.conferenciaExecucaoService.executar(
      {
        payloadQr: dto.payloadQr,
        etapaCodigo: dto.etapaCodigo,
        limiarConfianca: dto.limiarConfianca,
        leituras: leituras.map(paraLeituraDto),
      },
      contexto,
    );

    await this.vincularEvidencias(usadas, resultado.conferencia.id);

    return {
      ...resultado,
      extracao: {
        driver: this.extracaoService.adapterAtivo,
        fotos: fotos.length,
        leiturasProduzidas: leituras.length,
        fotosForaDoRecorte: foraDoRecorte.length,
      },
    };
  }

  /**
   * Ids -> registros de FotoEvidencia, com as duas recusas baratas: id
   * deduplicado (id repetido no request pagaria a mesma foto duas vezes,
   * constraint 4), foto inexistente e foto que JA pertence a outra
   * conferencia.
   *
   * As tres derrubam o lote inteiro ANTES de qualquer chamada de visao:
   * conferencia parcial silenciosa e pior que erro explicito, e evidencia
   * emprestada de outra conferencia falsificaria a trilha de auditoria
   * (a mesma guarda que `criarComVeredito` faz no fim da linha — aqui ela
   * chega antes de gastar dinheiro).
   */
  private async carregarRegistros(ids: string[]): Promise<FotoEvidencia[]> {
    const registros: FotoEvidencia[] = [];

    for (const id of new Set(ids)) {
      const fotoEvidencia = await this.fotosEvidenciaService.findById(id);

      if (!fotoEvidencia) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            fotoEvidenciaIds: `foto-evidencia-inexistente: ${id}`,
          },
        });
      }

      if (fotoEvidencia.conferencia) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            fotoEvidenciaIds: `foto-evidencia-de-outra-conferencia: ${id}`,
          },
        });
      }

      registros.push(fotoEvidencia);
    }

    return registros;
  }

  /**
   * Foto so vai para a visao se algum campo do RECORTE desta etapa sai da
   * fonte fisica dela. Sem isso, o gate da adesivacao (so series chumbadas)
   * pagava a leitura da placa para a engine descartar o resultado logo em
   * seguida — dinheiro queimado por definicao (SPEC, constraint 4).
   */
  private filtrarPeloRecorte(
    registros: FotoEvidencia[],
    contexto: ContextoExecucao,
  ): { usadas: FotoEvidencia[]; foraDoRecorte: FotoEvidencia[] } {
    const fontesDoRecorte = new Set(
      contexto.checklist.map((item) => item.fonteFisica),
    );

    const usadas: FotoEvidencia[] = [];
    const foraDoRecorte: FotoEvidencia[] = [];

    for (const registro of registros) {
      if (fontesDoRecorte.has(registro.fonteFisica)) {
        usadas.push(registro);
      } else {
        foraDoRecorte.push(registro);
      }
    }

    for (const ignorada of foraDoRecorte) {
      this.logger.debug(
        `foto ${ignorada.id} (fonte "${ignorada.fonteFisica}") fora do ` +
          `recorte da etapa ` +
          `"${contexto.checkpoint?.codigo ?? 'checklist-inteira'}": ` +
          `nao sera enviada a visao`,
      );
    }

    return { usadas, foraDoRecorte };
  }

  /** Registros -> bytes. Sequencial: um lote paralelo e pico sem ganho. */
  private async lerBytes(registros: FotoEvidencia[]): Promise<FonteImagem[]> {
    const fotos: FonteImagem[] = [];

    for (const registro of registros) {
      const conteudo = await this.fotosEvidenciaService.lerConteudoDe(registro);

      fotos.push({
        fotoEvidenciaId: registro.id,
        fonteFisica: conteudo.fonteFisica,
        imagem: conteudo.buffer,
        mimeType: conteudo.mimeType,
      });
    }

    return fotos;
  }

  /**
   * Amarra a conferencia recem-criada as evidencias que a lastreiam (achado 6:
   * sem isso a relacao nascia sempre vazia e a mesma foto podia lastrear
   * conferencias de pecas diferentes). So as fotos EFETIVAMENTE enviadas a
   * visao: as fora do recorte nao lastreiam campo nenhum e seguem soltas,
   * reutilizaveis no gate em que a marcacao delas passa a existir.
   *
   * Best-effort de proposito: o veredito ja esta gravado e e o produto do
   * endpoint — derrubar a resposta aqui perderia o resultado de uma visao ja
   * paga. Falha vira log de erro (mesma janela nao-transacional do gap 9).
   */
  private async vincularEvidencias(
    usadas: FotoEvidencia[],
    conferenciaId: string,
  ): Promise<void> {
    if (usadas.length === 0) {
      return;
    }

    try {
      const conferencia =
        await this.conferenciasService.findById(conferenciaId);
      if (!conferencia) {
        throw new Error(`conferencia ${conferenciaId} nao encontrada`);
      }

      await this.fotosEvidenciaService.vincularAConferencia(
        usadas.map((foto) => foto.id),
        conferencia,
      );
    } catch (erro) {
      this.logger.error(
        `falha-ao-vincular-evidencia: conferencia ${conferenciaId} ficou sem ` +
          `o vinculo de ${usadas.length} foto(s) — ` +
          `${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
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
