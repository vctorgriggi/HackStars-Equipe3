import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjetoModeloEntity } from '../../../../projetos-modelo/infrastructure/persistence/relational/entities/projeto-modelo.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProjetoModeloSeedService {
  constructor(
    @InjectRepository(ProjetoModeloEntity)
    private repository: Repository<ProjetoModeloEntity>,
  ) {}

  async run() {
    // Checklist transcrita do desenho EPT-163-PI-676 (peça de demo), cobrindo
    // os campos do critério de aceitação 1 do SPEC. A chave `campo` de cada
    // item vira CampoConferido.nomeCampo; `fonteFisica` casa com
    // FotoEvidencia.fonteFisica. Ajustar itens com a TRAEL.
    //
    // `etapa` é o `codigo` do Checkpoint em que a marcação passa a EXISTIR
    // fisicamente na peça — ou seja, o ponto do fluxo a partir do qual ela é
    // conferível. A conferência por etapa é cumulativa: o gate cobra os itens
    // dessa etapa e de todas as anteriores (o gate da placa reconfere o
    // chumbado, que é como se detecta troca de peça entre etapas). Sem isso,
    // o gate da adesivação cobraria a placa que ainda nem foi fixada e
    // devolveria `nao_conferivel` por marcação inexistente.
    //
    // `fonteFisica` é a VISTA da peça onde a marcação aparece (eixo novo de
    // 2026-07-25 — o porquê está na união literal `FonteFisica`, em
    // extracao/ports/extractor.port.ts). O NOME do campo continua dizendo como
    // a marcação foi gravada (`-chumbada-` = relevo, `-serigrafia-` = tinta) e
    // em qual vista ela está — nunca por número de posição.
    //
    // MAPA MEDIDO em 2026-07-25 com as fotos reais da peça (docs/visao-ocr.md,
    // rodada 360°: `fotos-demo/`), A CONFIRMAR contra o desenho com a TRAEL:
    //
    // | campo                          | vista            | obrig. | etapa         |
    // |--------------------------------|------------------|--------|---------------|
    // | serie-chumbada-topo            | topo             | sim    | adesivacao    |
    // | serie-chumbada-lateral-direita | lateral-direita  | sim    | adesivacao    |
    // | serie-chumbada-traseira        | traseira         | sim    | adesivacao    |
    // | patrimonio-serigrafia-topo     | topo             | sim    | serigrafia    |
    // | patrimonio-serigrafia-frente   | frente           | sim    | serigrafia    |
    // | cliente-serigrafia-frente      | frente           | sim    | serigrafia    |
    // | potencia-serigrafia-frente     | frente           | NAO    | serigrafia    |
    // |   ^ esperado do PROJETO: '1H - 10 kVA' (esperadoFixo — ver o item)      |
    // | serie-placa                    | placa (close)    | sim    | fixacao-placa |
    // | patrimonio-placa               | placa (close)    | NAO    | fixacao-placa |
    // |   ^ nunca leu em medição real — ver o item (2026-07-26)                 |
    // | serie-placa-qr                 | placa (close)    | sim    | fixacao-placa |
    // | patrimonio-placa-qr            | placa (close)    | sim    | fixacao-placa |
    //
    // PATRIMÔNIO EM DUAS FACES: o desenho pede a marcação no topo E na frente
    // (medido: 2 patrimônios em faces diferentes, 100% e 98,5%). A checklist
    // antiga tinha UM `patrimonio-serigrafia`, então "faltou o patrimônio de
    // uma das faces" era uma não conformidade real que passava despercebida.
    //
    // NENHUM ITEM EM `base`: a vista existe no vocabulário (decisão do time —
    // a base será conferida quando houver captura para ela), mas não há foto de
    // base disponível hoje. Declarar campo obrigatório nessa vista tornaria o
    // critério 3 do SPEC ("conjunto de fotos conforme → veredito conforme")
    // inalcançável: o campo sairia sempre `nao_conferivel` por falta de foto.
    const checklist = [
      {
        campo: 'serie-chumbada-topo',
        fonteFisica: 'topo',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        campo: 'serie-chumbada-lateral-direita',
        fonteFisica: 'lateral-direita',
        obrigatorio: true,
        etapa: 'adesivacao',
      },
      {
        // OPCIONAL até a TRAEL confirmar a posição (decisão de 2026-07-26): a
        // vista "traseira" foi medida numa foto DIAGONAL que enxerga duas
        // faces — a marcação pode ser a da lateral vista de ângulo. Opcional
        // não trava peça correta se a posição não existir; quando legível,
        // segue conferida e coerida com as irmãs. Volta a obrigatória (ou
        // muda de vista) com a resposta da TRAEL.
        campo: 'serie-chumbada-traseira',
        fonteFisica: 'traseira',
        obrigatorio: false,
        etapa: 'adesivacao',
      },
      {
        campo: 'patrimonio-serigrafia-topo',
        fonteFisica: 'topo',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'patrimonio-serigrafia-frente',
        fonteFisica: 'frente',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'cliente-serigrafia-frente',
        fonteFisica: 'frente',
        obrigatorio: true,
        etapa: 'serigrafia',
      },
      {
        campo: 'potencia-serigrafia-frente',
        fonteFisica: 'frente',
        obrigatorio: false,
        etapa: 'serigrafia',
        // A MARCAÇÃO DE POTÊNCIA PASSOU A ACUSAR (2026-07-26). Até aqui este
        // item não tinha valor esperado — a potência não é campo do QR — e a
        // engine OMITE do resultado o item opcional sem esperado: potência
        // gravada errada saía em silêncio, no mesmo lugar onde o sistema deveria
        // gritar (e é a primeira coisa que um avaliador erra de propósito).
        //
        // O texto é o do desenho EPT-163-PI-676, confirmado no crop pelo time
        // hoje: a frente traz `1H - 10 kVA` COMPLETO. O `1H` não existe em
        // payload nenhum (a descrição da etiqueta diz `1F`, que é outra coisa —
        // mapear 1F -> 1H seria inventar regra), então a fonte honesta é o
        // PROJETO, que é o que este registro é. A identidade da peça (série,
        // patrimônio, cliente) continua vindo SÓ do QR: nenhum desses itens
        // declara `esperadoFixo`, e é isso que mantém a constraint 5 do SPEC.
        //
        // Comparado em modo `esperado-contido` (o prefixo `potencia-` escolhe o
        // modo, em ORIGENS_DO_ESPERADO): o esperado inteiro tem de aparecer no
        // lido, porque a face é lida numa tirada só e vem com companhia
        // (`... 15 kV`). Logo `2H - 10 kVA` e `1H - 20 kVA` são `divergente`.
        //
        // Segue OPCIONAL de propósito: sem foto da frente, o campo fica
        // `nao_conferivel` e não trava o `conforme` (critério 4 do SPEC). COM
        // leitura divergente, acusa — campo opcional divergente conta no
        // veredito geral, e é esse o ponto.
        esperadoFixo: '1H - 10 kVA',
      },
      {
        campo: 'serie-placa',
        fonteFisica: 'placa',
        obrigatorio: true,
        etapa: 'fixacao-placa',
      },
      {
        // OPCIONAL desde 2026-07-26 (decisão do dono, mesmo precedente da
        // traseira): este campo NUNCA LEU em nenhuma medição real — duas
        // rodadas de gala hoje com fotos da placa e o spike de
        // docs/visao-ocr.md, todas com `sem-leitura`. A suspeita é que a placa
        // simplesmente NÃO IMPRIME o patrimônio (o número que aparece nela é a
        // série); a pergunta está registrada para a TRAEL no SPEC.
        //
        // Por que rebaixar em vez de remover: se a placa imprimir patrimônio em
        // outro modelo, o item continua conferindo e coerindo com as irmãs
        // normalmente. Obrigatório em marcação que talvez não exista torna o
        // `conforme` inalcançável para peça CORRETA (critério 3 do SPEC) e
        // enche a tela de âmbar que não é defeito nenhum.
        //
        // O que NÃO se perde: o patrimônio da placa segue coberto com folga por
        // `patrimonio-placa-qr` — OBRIGATÓRIO, lido do QR da própria placa por
        // decode local, a 1.0 de confiança e sem custo de visão. Volta a
        // obrigatório com a resposta da TRAEL.
        campo: 'patrimonio-placa',
        fonteFisica: 'placa',
        obrigatorio: false,
        etapa: 'fixacao-placa',
      },
      // O QR DA PLACA É UMA MARCAÇÃO DA PLACA, e passou a ser conferido em
      // 2026-07-26. A placa de identificação não traz só números impressos:
      // traz um QR próprio, e na peça de demo ele carrega a série CORRETA
      // (847233) enquanto o número IMPRESSO ao lado dele diz 847833. Até aqui
      // o sistema conferia o texto e ignorava a evidência que estava a dois
      // centímetros — a mesma placa se contradizendo.
      //
      // POR QUE ISTO É BARATO: QR não é OCR. O adapter decodifica a imagem
      // LOCALMENTE (`extracao/adapters/qr-imagem.ts`, sharp + jsqr), sem
      // chamada de visão, sem custo e sem tocar no teto de 3 chamadas por foto
      // (SPEC, constraint 4). A vista é a mesma `placa`: a foto que já se tira
      // do close resolve os quatro campos de uma vez.
      //
      // POR QUE NÃO PRECISOU DE REGRA NOVA em lugar nenhum:
      // - o PREFIXO continua sendo o contrato — `serie-`/`patrimonio-` é como
      //   `ORIGENS_DO_ESPERADO` acha o valor esperado no QR da etiqueta;
      // - o segmento `qr` no nome é o que diz ao adapter que a marcação se lê
      //   por decode (`extracao/ports/marcacao.ts`), do mesmo jeito que
      //   `-chumbada-` diz relevo e `-serigrafia-` diz tinta;
      // - a COERÊNCIA entre irmãos agrupa por VALOR ESPERADO, então estes dois
      //   entram sozinhos no grupo da série e do patrimônio. Placa com
      //   impressão errada e QR certo vira incoerência DENTRO da própria placa
      //   — o caso real da peça de demo, que antes não tinha como aparecer.
      //
      // LIMITE CONHECIDO, para não parecer garantia que não é: se o operador
      // escanear o PRÓPRIO QR da placa como payload da etiqueta, este campo
      // compara o QR consigo mesmo e sai trivialmente `conforme`. A fonte da
      // verdade continua sendo a ETIQUETA adesiva (SPEC, constraint 5); é o
      // cruzamento entre as duas fontes que dá valor a estes dois itens.
      {
        campo: 'serie-placa-qr',
        fonteFisica: 'placa',
        obrigatorio: true,
        etapa: 'fixacao-placa',
      },
      {
        campo: 'patrimonio-placa-qr',
        fonteFisica: 'placa',
        obrigatorio: true,
        etapa: 'fixacao-placa',
      },
    ];
    const dados = {
      codigo: 'EPT-163-PI-676',
      descricao:
        'Transformador monofásico 10 kVA — modelo serigrafia (peça de demo)',
      checklist: JSON.stringify(checklist),
    };
    // Upsert por codigo (unique): idempotente e atualizável em banco semeado.
    const existente = await this.repository.findOne({
      where: { codigo: dados.codigo },
    });
    if (existente) {
      await this.repository.update(existente.id, dados);
    } else {
      await this.repository.save(this.repository.create(dados));
    }
  }
}
