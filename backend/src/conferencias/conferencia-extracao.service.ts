import {
  // common
  HttpStatus,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ExtracaoService } from '../extracao/extracao.service';
import {
  AchadoLivre,
  FonteImagem,
  LeituraExtraida,
} from '../extracao/ports/extractor.port';
import { FotoEvidencia } from '../fotos-evidencia/domain/foto-evidencia';
import { FotosEvidenciaService } from '../fotos-evidencia/fotos-evidencia.service';
import { PayloadEtiqueta } from '../transformadores/qr/payload-etiqueta';

import {
  ConferenciaExecucaoService,
  ContextoExecucao,
} from './conferencia-execucao.service';
import {
  AchadoInconsistente,
  OcorrenciaAchado,
  ResultadoExecucaoComExtracao,
} from './dto/resultado-execucao-com-extracao.dto';
import { ConferenciasService } from './conferencias.service';
import { ExecutarComFotosDto } from './dto/executar-com-fotos.dto';
import { LeituraCampoDto } from './dto/executar-conferencia.dto';
import { normalizar } from './engine/engine-conformidade';

/**
 * O contrato de resposta deste endpoint vive em
 * `dto/resultado-execucao-com-extracao.dto.ts`, como CLASSE: interface (e
 * intersecao de tipos) some na compilacao, e o Swagger devolvia o CAMINHO
 * PRINCIPAL do front com schema de resposta vazio — `incoerencias`, `extracao`
 * e `achadosInconsistentes` eram exatamente o que ninguem consegue adivinhar.
 * Re-exportado daqui para nao mudar o import de quem ja consumia.
 */
export { AchadoInconsistente, OcorrenciaAchado, ResultadoExecucaoComExtracao };
export { ResumoExtracao } from './dto/resultado-execucao-com-extracao.dto';

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
    const { leituras, achadosLivres } =
      await this.extracaoService.extrairDeFotos(fotos, contexto.checklist);

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

    // Cruzamento DEPOIS do veredito, e sem tocar nele: o alarme le o mesmo
    // payload do QR que a engine leu, mas o resultado ja esta fechado — nao ha
    // caminho de codigo daqui para `vereditoGeral` ou para CampoConferido.
    //
    // PERSISTENCIA: nenhuma nesta rodada. O alarme e efemero, so na resposta;
    // gravar exigiria entidade nova e trilha de auditoria propria, e o alerta
    // persistente ja tem dono (T4.3 do PLAN). Recarregar a conferencia por id
    // nao traz — e assim de proposito ate a decisao de modelagem.
    const achadosInconsistentes = cruzarAchados(
      achadosLivres,
      contexto.payload,
    );

    if (achadosInconsistentes.length > 0) {
      this.logger.warn(
        `achados-inconsistentes: conferencia ${resultado.conferencia.id} viu ` +
          `${achadosInconsistentes.length} texto(s) com cara de identificador ` +
          `fora do QR (${achadosInconsistentes
            .map((achado) => achado.texto)
            .join(', ')}); alarme informativo, veredito inalterado`,
      );
    }

    return {
      ...resultado,
      extracao: {
        driver: this.extracaoService.adapterAtivo,
        fotos: fotos.length,
        leiturasProduzidas: leituras.length,
        fotosForaDoRecorte: foraDoRecorte.length,
        achadosLivres: achadosLivres.length,
      },
      achadosInconsistentes,
    };
  }

  /**
   * Ids -> registros de FotoEvidencia, com id deduplicado (id repetido no
   * request pagaria a mesma foto duas vezes, constraint 4) e as duas recusas
   * baratas: foto inexistente e foto que JA pertence a outra conferencia.
   *
   * As duas derrubam o lote inteiro ANTES de qualquer chamada de visao:
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
    // Segunda evidencia da leitura em relevo (consenso de recortes, feito no
    // adapter). Sem esta linha ela se perderia aqui e TODA leitura chumbada
    // chegaria a engine como nao corroborada — divergencia real de peca nunca
    // mais seria acusada.
    corroboracao: leitura.corroboracao,
  };
}

/** Identificador: so digitos, do primeiro ao ultimo caractere. */
const PADRAO_SO_DIGITOS = /^\d+$/;

/**
 * Cruza os achados livres da visao contra os valores do QR. Funcao PURA (sem
 * I/O, sem Nest), exportada para teste direto — mesmo padrao de
 * `dedupeLeituras` e `filtrarChecklistPorEtapa`.
 *
 * HEURISTICA ANTI-RUIDO (o ponto dificil): a placa de um transformador tem
 * dezenas de textos tecnicos — tensoes (13800), potencia, pesos, ano, normas.
 * Alarmar cada numero seria spam, e alarme que todo mundo ignora nao protege
 * ninguem. Entao:
 *
 * 1. CANDIDATO e so o texto normalizado composto exclusivamente de digitos
 *    cujo COMPRIMENTO e igual ao de algum identificador do QR (numeroSerie,
 *    patrimonio). O comprimento vem do payload, nunca de constante: hoje a
 *    TRAEL usa 6 digitos, e um cliente com 7 continuaria funcionando. Texto
 *    misto ('13.8 kV', '2024/01') nao e candidato; '13800' tem 5 digitos e cai
 *    fora sozinho quando os identificadores tem 6.
 * 2. ALARME e o candidato que nao e igual (mesma normalizacao NFC da engine) a
 *    NENHUM valor do QR — inclusive pedido, seq e codigo do projeto: numero que
 *    a etiqueta afirma nao e inconsistencia, mesmo nao sendo alvo da checklist.
 * 3. DEDUPE por texto normalizado: o mesmo 847833 lido em 3 blocos e UM alarme
 *    com 3 evidencias, nao 3 alarmes.
 *
 * FORA desta rodada, de proposito: texto NAO numerico (cliente, descricao,
 * normas, nome do fabricante). Numa placa, texto livre e ruido >> sinal — cada
 * linha de norma tecnica viraria alarme —, e a comparacao textual util
 * (cliente) ja e feita como CAMPO da checklist, com veredito de verdade. Fica
 * para quando houver posicao/rotulo confiavel para ancorar a comparacao.
 *
 * O que esta funcao NUNCA faz: emitir veredito, mexer em campo conferido ou
 * transformar ausencia de alarme em `conforme`. Consistencia nao enxerga
 * ausencia — peca lisa, sem marcacao nenhuma, sai daqui sem alarme algum.
 */
export function cruzarAchados(
  achados: AchadoLivre[],
  payload: PayloadEtiqueta,
): AchadoInconsistente[] {
  const identificadores = [payload.numeroSerie, payload.patrimonio]
    .map((valor) => (valor === null ? '' : normalizar(valor)))
    .filter((valor) => PADRAO_SO_DIGITOS.test(valor));

  const comprimentos = new Set(identificadores.map((valor) => valor.length));
  if (comprimentos.size === 0) {
    // Etiqueta sem identificador numerico (ou so com patrimonio alfanumerico):
    // sem molde de comparacao, nao ha candidato — silencio e melhor que chute.
    return [];
  }

  // Tudo que o QR afirma vira "esperado". Um numero que bate com o pedido ou
  // com o seq da etiqueta e consistente com a fonte da verdade, ainda que
  // nenhuma checklist o confira.
  const valoresDoQr = new Set(
    [
      payload.numeroSerie,
      payload.patrimonio,
      payload.pedido,
      payload.seq,
      payload.cliente,
      payload.descricao,
      payload.codigoProjeto,
    ]
      .filter(
        (valor): valor is string =>
          typeof valor === 'string' && valor.trim().length > 0,
      )
      .map(normalizar),
  );

  const porTexto = new Map<string, AchadoInconsistente>();

  for (const achado of achados) {
    const texto = normalizar(achado.texto);

    if (!PADRAO_SO_DIGITOS.test(texto) || !comprimentos.has(texto.length)) {
      continue;
    }
    if (valoresDoQr.has(texto)) {
      continue;
    }

    const atual = porTexto.get(texto);
    const ocorrencia: OcorrenciaAchado = {
      fotoEvidenciaId: achado.fotoEvidenciaId ?? null,
      confianca: achado.confianca,
      regiaoLeitura: achado.regiaoLeitura ?? null,
    };

    if (atual) {
      atual.ocorrencias.push(ocorrencia);
      continue;
    }

    // Primeiro texto CRU vence: e o que o operador vai comparar com a peca.
    porTexto.set(texto, { texto: achado.texto, ocorrencias: [ocorrencia] });
  }

  return [...porTexto.values()];
}
