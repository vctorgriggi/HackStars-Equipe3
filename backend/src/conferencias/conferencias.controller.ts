import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConferenciasService } from './conferencias.service';
import { ConferenciaConsultasService } from './consultas/conferencia-consultas.service';
import { ConferenciaExecucaoService } from './conferencia-execucao.service';
import { ConferenciaExtracaoService } from './conferencia-extracao.service';
import { ConferenciaLaudoService } from './laudo/conferencia-laudo.service';
import { ConferenciaPlanoService } from './plano/conferencia-plano.service';
import { IndicadoresService } from './consultas/indicadores.service';
import { CreateConferenciaDto } from './dto/create-conferencia.dto';
import { Indicadores } from './dto/indicadores.dto';
import { PlanoDeFotos, PlanoDeFotosQueryDto } from './dto/plano-de-fotos.dto';
import { ExecutarComFotosDto } from './dto/executar-com-fotos.dto';
import { ExecutarConferenciaDto } from './dto/executar-conferencia.dto';
import { UpdateConferenciaDto } from './dto/update-conferencia.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Conferencia } from './domain/conferencia';
import { LaudoDaConferencia } from './dto/laudo.dto';
import { ResultadoExecucao } from './dto/resultado-execucao.dto';
import { ResultadoExecucaoComExtracao } from './dto/resultado-execucao-com-extracao.dto';
import { VereditoConferencia } from './consultas/veredito-conferencia';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllConferenciasDto } from './dto/find-all-conferencias.dto';

@ApiTags('Conferências')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'conferencias',
  version: '1',
})
export class ConferenciasController {
  constructor(
    private readonly conferenciasService: ConferenciasService,
    private readonly conferenciaExecucaoService: ConferenciaExecucaoService,
    private readonly conferenciaExtracaoService: ConferenciaExtracaoService,
    private readonly conferenciaConsultasService: ConferenciaConsultasService,
    private readonly conferenciaLaudoService: ConferenciaLaudoService,
    private readonly conferenciaPlanoService: ConferenciaPlanoService,
    private readonly indicadoresService: IndicadoresService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'CRUD gerado: cria uma Conferencia crua (nao use no fluxo)',
    description:
      'Endpoint do gerador, mantido para inspecao/manutencao. Ele NAO executa ' +
      'a engine e nao grava veredito — quem confere e ' +
      '`POST /conferencias/executar-com-fotos` (ou `/executar`).',
  })
  @ApiCreatedResponse({
    type: Conferencia,
  })
  create(@Body() createConferenciaDto: CreateConferenciaDto) {
    return this.conferenciasService.create(createConferenciaDto);
  }

  @Post('executar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Executa a conferencia com leituras DIGITADAS (modo avancado)',
    description:
      'Mesma engine do caminho principal, mas as leituras (valor + confianca) ' +
      'vem no corpo em vez da visao. Use para testar sem AWS, para a tela ' +
      '/demo e para reproduzir cenarios; o fluxo do operador e ' +
      '`POST /conferencias/executar-com-fotos`. A confianca aqui e informada ' +
      'pelo cliente e portanto forjavel (gap 10 do CLAUDE.md).',
  })
  @ApiCreatedResponse({
    type: ResultadoExecucao,
    description:
      'Conferencia executada: peca (find-or-create pelo numero de serie), ' +
      'veredito geral calculado pela engine e um CampoConferido por campo ' +
      'do checklist avaliado. A resposta traz tambem `incoerencias`: grupos ' +
      'de campos irmaos (mesmo valor esperado do QR — as series chumbadas e a ' +
      'da placa, os patrimonios entre si) que leram valores DIFERENTES entre ' +
      'si, cada um com campo, valor lido, confianca e veredito. Incoerencia ' +
      'so REBAIXA: impede o `conforme` geral e nunca suaviza um `divergente`.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Codigos possiveis (em `errors`): `payload-invalido` / ' +
      '`payload-somente-codigo` (QR ilegivel ou so com codigo de lookup — o ' +
      'caso do QR da ETIQUETA, medido: 13 digitos sem campo nenhum; a ' +
      'mensagem manda digitar os campos manualmente, porque o lookup ' +
      'automatico exige ERP e e rodada futura), ' +
      '`etapa-desconhecida` (nao existe Checkpoint com esse `codigo`), ' +
      '`projeto-modelo-indeterminado` (o QR nao aponta projeto, a peca nao tem ' +
      'vinculo e ha 0 ou 2+ projetos cadastrados), ' +
      '`etapa-sem-campos-conferiveis` (nenhum item da checklist e conferivel ' +
      'ate essa etapa) e `checklist-sem-campo-avaliavel` (o recorte so tinha ' +
      'itens opcionais sem valor esperado no QR). ' +
      'Todos saem antes da primeira escrita: 422 nunca deixa peca orfa.',
  })
  executar(@Body() executarConferenciaDto: ExecutarConferenciaDto) {
    return this.conferenciaExecucaoService.executar(executarConferenciaDto);
  }

  @Post('executar-com-fotos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'CAMINHO PRINCIPAL: confere a peca a partir do QR + fotos ja enviadas',
    description:
      'O fluxo do operador: suba as fotos em `POST /fotos-evidencia/upload`, ' +
      'mande os ids aqui junto do payload do QR e da etapa da URL do ' +
      'dispositivo. A visao le as fotos, a engine compara e o veredito volta ' +
      'pronto — o front nao compara nada. Chamada de visao acontece SO neste ' +
      'disparo (creditos AWS sao finitos).',
  })
  @ApiCreatedResponse({
    type: ResultadoExecucaoComExtracao,
    description:
      'Mesma conferencia do POST /executar, mas as leituras vem da VISAO: ' +
      'so as fotos cuja fonte fisica tem campo no recorte da etapa sao lidas ' +
      'do storage e enviadas uma unica vez ao extrator ativo ' +
      '(EXTRACTOR_DRIVER). Vale tambem aqui o `incoerencias` do /executar. ' +
      'A resposta acrescenta `extracao` (driver, fotos, ' +
      'leiturasProduzidas, fotosForaDoRecorte, achadosLivres) e ' +
      '`achadosInconsistentes`: textos com cara de identificador que a visao ' +
      'leu na peca e o QR nao conhece. Esse ultimo e ALARME informativo — ' +
      'nao entra no vereditoGeral nem em campo nenhum, e nao e persistido ' +
      'nesta rodada. As fotos usadas ficam vinculadas a conferencia criada, ' +
      'e o veredito continua nascendo na engine.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Os mesmos codigos do `/executar` (`payload-invalido`, ' +
      '`payload-somente-codigo`, `etapa-desconhecida`, ' +
      '`projeto-modelo-indeterminado`, `etapa-sem-campos-conferiveis`, ' +
      '`checklist-sem-campo-avaliavel`) mais dois de evidencia: ' +
      '`foto-evidencia-inexistente` (id que nao existe) e ' +
      '`foto-evidencia-de-outra-conferencia` (foto ja presa a outra ' +
      'conferencia — evidencia emprestada falsificaria a trilha). ' +
      'Todos sao avaliados ANTES de qualquer chamada paga de visao.',
  })
  executarComFotos(@Body() executarComFotosDto: ExecutarComFotosDto) {
    return this.conferenciaExtracaoService.executarComFotos(
      executarComFotosDto,
    );
  }

  // ORDEM DE ROTA: `:id/laudo` tem dois segmentos e nao colide com os POSTs
  // estaticos de um segmento acima (`executar`, `executar-com-fotos`) — mas
  // fica depois deles de proposito, para manter a regra local "estatica antes
  // de dinamica" valendo sem que ninguem precise conferir a contagem de
  // segmentos ao acrescentar a proxima rota.
  @Post(':id/laudo')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'LAUDO POR IA: redige em prosa o veredito que a engine já emitiu',
    description:
      'Manda os FATOS JÁ DECIDIDOS de uma conferência a um Claude no Bedrock ' +
      'e devolve um laudo curto, em linguagem de chão de fábrica, para o ' +
      'operador ler ou anexar.\n\n' +
      'O LAUDO NÃO DECIDE NADA. Ele não compara campo, não reclassifica, não ' +
      'suaviza e não completa veredito — é REDAÇÃO sobre fato, e o veredito ' +
      'gravado continua sendo o que vale. O texto sempre termina dizendo ' +
      'isso, e a API carimba a frase caso o modelo a esqueça.\n\n' +
      'FONTE DOS FATOS: exatamente a mesma de `GET /conferencias/{id}/campos` ' +
      '— o que está PERSISTIDO no banco. Consequência direta do gap 22 do ' +
      'CLAUDE.md: `motivo` do campo, `incoerencias` e `achadosInconsistentes` ' +
      'não são gravados, então o laudo não fala deles. Ele relata veredito ' +
      'geral, etapa avaliada, e campo a campo o esperado, o lido e a ' +
      'confiança. Nada é recalculado na leitura: rodar a engine de novo aqui ' +
      'abriria a chance de o laudo contradizer o veredito que a tela mostra.\n\n' +
      'CUSTO E DISPARO: uma única chamada paga por requisição (~US$ 0,01), ' +
      'SÓ sob ação explícita do operador — mesma constraint 4 do SPEC que ' +
      'rege a visão. Sem retry automático e sem laço.\n\n' +
      'NÃO PERSISTE NADA: nem o laudo, nem o fato de ele ter sido pedido. ' +
      'Dois cliques geram dois textos possivelmente diferentes; o veredito, ' +
      'esse sim gravado, é sempre o mesmo. Persistir o laudo (com o modelo e ' +
      'o horário) é assunto da rodada de auditoria.\n\n' +
      'Modelo por env `LAUDO_MODEL_ID`; driver por `LAUDO_DRIVER` ' +
      '(`bedrock` default | `mock`). Com `mock`, `modelo` volta como `mock` e ' +
      'o texto se anuncia como SIMULADO — exiba isso, não esconda.',
  })
  @ApiOkResponse({
    type: LaudoDaConferencia,
    description:
      'Laudo redigido: `laudo` (texto em parágrafos, terminando no ' +
      'disclaimer obrigatório), `modelo` (qual modelo escreveu) e `geradoEm`.',
  })
  @ApiNotFoundResponse({
    description:
      '`conferencia-inexistente: <id>` — mesma checagem da releitura do ' +
      'veredito, feita ANTES de qualquer chamada paga.',
  })
  @ApiServiceUnavailableResponse({
    description:
      '`laudo-indisponivel: <detalhe>` quando o serviço de redação falha ' +
      '(sem credencial, modelo não habilitado na conta, timeout, resposta ' +
      'vazia). É erro EXPLÍCITO de propósito: devolver texto vazio ou um ' +
      '"não foi possível analisar" ao lado de uma peça divergente seria lido ' +
      'como "nada a relatar". O veredito da conferência segue intacto e ' +
      'legível pelas outras rotas.',
  })
  gerarLaudo(@Param('id') id: string): Promise<LaudoDaConferencia> {
    return this.conferenciaLaudoService.gerarLaudo(id);
  }

  // ATENCAO A ORDEM: esta rota tem de vir ANTES de `@Get(':id')`, senao o
  // parametro dinamico engole 'plano-de-fotos' e o cliente recebe 404/500 de
  // "conferencia inexistente".
  @Get('plano-de-fotos')
  @ApiOperation({
    summary: 'QUAIS FOTOS TIRAR em cada etapa, direto da checklist do projeto',
    description:
      'Devolve, por etapa da linha e por VISTA da peca, os campos que aquele ' +
      'gate confere — a lista de fotos que o operador precisa tirar antes de ' +
      'disparar `POST /conferencias/executar-com-fotos`.\n\n' +
      'POR QUE EXISTE: o cliente estava remontando o recorte da checklist por ' +
      'conta propria a partir de `GET /checkpoints` + `GET /projetos-modelo`. ' +
      'Regra duplicada e regra que diverge — aqui o plano sai das MESMAS ' +
      'funcoes que a conferencia usa, entao a foto que a tela pede e o campo ' +
      'que o gate cobra nunca discordam.\n\n' +
      'SEMANTICA CUMULATIVA: cada `etapas[]` traz o recorte da etapa E das ' +
      'anteriores (a etapa N reconfere o que ja estava gravado — e assim que ' +
      'se detecta troca de peca), entao a ultima etapa tende a pedir tudo. ' +
      'Item da checklist sem `etapa`, ou com etapa que nao existe como ' +
      'Checkpoint, aparece em TODOS os recortes com `entraNaEtapa: null`. ' +
      '`pecaInteira` e o recorte sem etapa nenhuma (checklist completa).\n\n' +
      'RESOLUCAO DO PROJETO: `?projeto=<codigo>` quando informado; senao, o ' +
      'unico ProjetoModelo cadastrado. E a mesma cascata da conferencia menos ' +
      'o elo do vinculo da peca (aqui nao ha QR). Codigo inexistente nao e ' +
      'erro: cai no fallback do unico projeto.\n\n' +
      'Somente LEITURA: nao cria peca, nao chama visao e nao gasta credito ' +
      'AWS.',
  })
  @ApiOkResponse({
    type: PlanoDeFotos,
    description:
      'Plano completo: `projeto`, a `checklist` inteira na ordem original, um ' +
      'plano por Checkpoint em `etapas` (ordenados pela `ordem` da linha) e ' +
      '`pecaInteira`. Cada campo vem com `tipoMarcacao` (`relevo` exige ' +
      'enquadramento cuidadoso) e `entraNaEtapa`.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      '`projeto-modelo-indeterminado`: nenhum `?projeto=` foi informado (ou o ' +
      'codigo nao existe) e ha 0 ou 2+ projetos cadastrados — a API se recusa ' +
      'a chutar de qual modelo e a peca. Alem dele, checklist corrompida no ' +
      'banco responde 500 `checklist-invalido: <projeto>` (JSON malformado, ' +
      'array vazio ou item fora do formato) — e dado corrompido, nao erro do ' +
      'cliente.',
  })
  planoDeFotos(@Query() query: PlanoDeFotosQueryDto): Promise<PlanoDeFotos> {
    return this.conferenciaPlanoService.planoDeFotos(query?.projeto);
  }

  // ATENCAO A ORDEM: como a rota acima, esta precisa vir ANTES de `@Get(':id')`
  // — senao o parametro dinamico engole 'indicadores'.
  @Get('indicadores')
  @ApiOperation({
    summary: 'DASHBOARD E AUDITORIA: os numeros da linha, agregados no banco',
    description:
      'Uma leitura so com as quatro perguntas do painel: quanto ja se ' +
      'conferiu (`totais`), em QUAL ETAPA a nao conformidade aparece ' +
      '(`porEtapa`), QUAIS CAMPOS mais dao problema (`porCampo`) e ONDE cada ' +
      'peca esta com QUAL veredito vigente (`linha`, o dashboard de linha).\n\n' +
      'NENHUM RECALCULO ACONTECE AQUI. Todo numero e `COUNT` sobre o veredito ' +
      'que a engine JA GRAVOU (`conferencia.vereditoGeral` e ' +
      '`campo_conferido.veredito`) — a rota agrega, nunca compara. Conferencia ' +
      'sem veredito (linha crua do CRUD) entra no total e em nenhum balde, ' +
      'entao `divergentes + naoConferiveis + conformes` pode ser menor que ' +
      '`totais.conferencias`.\n\n' +
      'ATENCAO AO GAP 14 do CLAUDE.md: a conferencia nao persiste marca de ' +
      'cobertura, entao `conforme` COM etapa preenchida atesta apenas o ' +
      'recorte daquele gate — nunca a peca inteira. Por isso a etapa viaja ' +
      'colada ao veredito em `linha[].ultimaConferencia` e os grupos de ' +
      '`porEtapa` nunca sao somados num "conforme geral da fabrica" pela API. ' +
      'Exibir veredito sem etapa produz o falso OK que a regra de ouro proibe.\n\n' +
      'SEM PAGINACAO nesta rodada (volume de demo): `linha` traz no maximo 200 ' +
      'pecas, escolhidas pelo movimento mais recente; `totais.pecas` conta ' +
      'TODAS, e a diferenca entre os dois denuncia o corte.\n\n' +
      'Somente LEITURA: nao cria peca, nao chama visao e nao gasta credito AWS.',
  })
  @ApiOkResponse({
    type: Indicadores,
    description:
      'Indicadores do banco inteiro. `porEtapa` vem na ordem da linha com o ' +
      'grupo sem etapa (peca inteira) por ultimo; `porCampo` vem por ' +
      'divergentes desc (o topo e onde investigar primeiro); `linha` vem pela ' +
      'passagem mais recente, com quem nunca passou por checkpoint no fim.',
  })
  indicadores(): Promise<Indicadores> {
    return this.indicadoresService.indicadores();
  }

  @Get()
  @ApiOperation({
    summary: 'CRUD gerado: pagina todas as conferencias do banco',
    description:
      'Sem filtro por peca (gap 4 do CLAUDE.md). Para as telas do operador ' +
      'use `GET /transformadores/{id}/conferencias`.',
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(Conferencia),
  })
  async findAll(
    @Query() query: FindAllConferenciasDto,
  ): Promise<InfinityPaginationResponseDto<Conferencia>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.conferenciasService.findAllWithPagination({
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id/campos')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'Releitura do veredito campo a campo, com as evidencias',
    description:
      'Remonta a tela de veredito SEM a resposta do POST: refresh, navegacao ' +
      'entre telas (fotos numa, veredito noutra) ou abertura pelo historico ' +
      'da peca reconstroem tudo daqui. Cada campo vem com sua foto-evidencia ' +
      '(criterio 1 do SPEC). O veredito chega como a engine gravou — o front ' +
      'nao recalcula nada.\n\n' +
      'ATENCAO 1 — `fotoEvidencia.url` sob `FILE_DRIVER=s3` e uma URL ASSINADA ' +
      'que EXPIRA EM 1 HORA. Nao persista essa URL em store de longa duracao ' +
      'no cliente: apos a expiracao ela devolve 403 e a evidencia some da ' +
      'tela. Recarregue esta rota para obter um link novo.\n\n' +
      'ATENCAO 2 — o que a releitura NAO devolve, porque nao e persistido ' +
      'nesta rodada: (a) `motivo` do campo (`sem-leitura`, ' +
      '`confianca-abaixo-do-limiar`, `leituras-conflitantes`, ' +
      '`leitura-de-outro-campo`, `leitura-nao-corroborada`) — o VEREDITO esta ' +
      'gravado, o porque dele so existe na resposta do POST; (b) ' +
      '`incoerencias` entre campos irmaos; (c) `achadosInconsistentes` da ' +
      'extracao. O efeito de (b) sobre o `vereditoGeral` esta gravado, mas o ' +
      'detalhe e efemero.\n\n' +
      '`fonteFisica` e `obrigatorio` de cada campo sao RE-RESOLVIDOS da ' +
      'checklist do ProjetoModelo da peca (CampoConferido nao os persiste) e ' +
      'vem `null` se a peca nao tiver projeto vinculado.',
  })
  @ApiOkResponse({ type: VereditoConferencia })
  @ApiNotFoundResponse({
    description:
      '`conferencia-inexistente: <id>`. E 404 de proposito, nunca lista ' +
      'vazia: `campos: []` passaria por "conferencia sem nenhuma ' +
      'divergencia" — falso OK.',
  })
  vereditoPorConferencia(@Param('id') id: string) {
    return this.conferenciaConsultasService.vereditoPorConferencia(id);
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'CRUD gerado: a linha crua da conferencia',
    description:
      'Sem os campos conferidos. Para a tela de veredito use ' +
      '`GET /conferencias/{id}/campos`.',
  })
  @ApiOkResponse({
    type: Conferencia,
  })
  findById(@Param('id') id: string) {
    return this.conferenciasService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'CRUD gerado: edita a conferencia (uso previsto: `observacao`)',
    description:
      'O caso legitimo e registrar a excecao aceita pelo time em ' +
      '`observacao`. `vereditoGeral` fica FORA do DTO: veredito so nasce na ' +
      'engine.',
  })
  @ApiOkResponse({
    type: Conferencia,
  })
  update(
    @Param('id') id: string,
    @Body() updateConferenciaDto: UpdateConferenciaDto,
  ) {
    return this.conferenciasService.update(id, updateConferenciaDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOperation({
    summary: 'CRUD gerado: apaga a conferencia (a UI nao expoe)',
    description:
      'Hard delete com FKs `NO ACTION` (gap 2 do CLAUDE.md): conferencia com ' +
      'campos conferidos estoura 500.',
  })
  remove(@Param('id') id: string) {
    return this.conferenciasService.remove(id);
  }
}
