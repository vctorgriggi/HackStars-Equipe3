import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { TipoDeMarcacao } from '../../extracao/ports/marcacao';
import { EtapaResumo } from './resumos-compartilhados.dto';

/**
 * Resposta de `GET /conferencias/plano-de-fotos`: QUAIS FOTOS TIRAR, por etapa
 * e por vista da peça, para que a conferência daquele gate tenha o que
 * comparar.
 *
 * Existe porque o cliente estava REIMPLEMENTANDO o recorte cumulativo da
 * checklist para montar a lista de fotos — a mesma regra em dois lugares, que
 * neste projeto já divergiu (a extração lia a checklist de um projeto e a
 * engine avaliava outro). Aqui o plano nasce das MESMAS funções que a execução
 * usa (`lerChecklist` + `filtrarChecklistPorEtapa`), então "as fotos que a tela
 * pede" e "os campos que o gate cobra" não têm como discordar.
 *
 * Classes, não interfaces, pelo motivo de sempre: interface some na compilação
 * e a rota chegaria ao front com schema de resposta vazio.
 */

/** A união literal COMPLETA de `TipoDeMarcacao` (extracao/ports/marcacao.ts). */
export const TIPOS_DE_MARCACAO: TipoDeMarcacao[] = [
  'relevo',
  'tinta',
  'qr',
  'indefinido',
];

export const DESCRICAO_TIPO_MARCACAO =
  'COMO a marcação foi gravada na peça, derivado do NOME do campo (gap 19 do ' +
  'CLAUDE.md: a checklist ainda não declara isso). Muda o que se pede do ' +
  'operador na hora da foto:\n' +
  '- `relevo`: número chumbado no metal, mesma cor do tanque ' +
  '(`serie-chumbada-*`). É o caso difícil — enquadre a marcação inteira e ' +
  'preencha o quadro; a API relê recortes para confirmar e NUNCA acusa a peça ' +
  'com uma leitura só.\n' +
  '- `tinta`: serigrafia preta sobre o tanque (`*-serigrafia-*`). Alto ' +
  'contraste, lê bem.\n' +
  '- `qr`: QR Code impresso na peça (`serie-placa-qr`, `patrimonio-placa-qr`). ' +
  'A API decodifica LOCALMENTE, sem OCR e sem custo de visão — enquadre o QR ' +
  'inteiro e reto no close da placa. Ou decodifica exato, ou não decodifica: ' +
  'não existe leitura parcial, então o campo é `conforme`/`divergente` com ' +
  'uma leitura só, e QR ilegível vira `nao_conferivel`.\n' +
  '- `indefinido`: o nome do campo não diz. Inclui de propósito os campos de ' +
  'PLACA (`serie-placa`, `patrimonio-placa`) — a placa resolve por RÓTULO ' +
  '(`N°`, `PATRIMONIO`), evidência melhor que física de pixel.';

/** Um item da checklist do projeto, com o que a tela de captura precisa. */
export class ItemDoPlano {
  @ApiProperty({
    type: String,
    example: 'serie-chumbada-topo',
    description:
      'Nome do campo na checklist. O PREFIXO é contrato (`serie-`, ' +
      '`patrimonio-`, `cliente-`): é por ele que a API acha o valor esperado ' +
      'no QR. O resto diz como foi gravado e em qual vista está.',
  })
  campo: string;

  @ApiProperty({
    type: String,
    example: 'topo',
    description:
      'VISTA da peça onde a marcação está — é a foto que precisa existir para ' +
      'este campo ser conferível. Mesmo vocabulário do `fonteFisica` do ' +
      'upload (`base`, `topo`, `frente`, `traseira`, `lateral-esquerda`, ' +
      '`lateral-direita`, `placa`, `etiqueta`, `geral`); grafia divergente ' +
      'quebra o pareamento campo ↔ evidência.',
  })
  fonteFisica: string;

  @ApiProperty({
    type: Boolean,
    example: true,
    description:
      'Campo obrigatório do projeto. Obrigatório ilegível bloqueia o ' +
      '`conforme` geral; opcional ilegível não bloqueia (critério 4 do SPEC).',
  })
  obrigatorio: boolean;

  @ApiProperty({
    enum: TIPOS_DE_MARCACAO,
    example: 'relevo',
    description: DESCRICAO_TIPO_MARCACAO,
  })
  tipoMarcacao: TipoDeMarcacao;

  @ApiProperty({
    type: EtapaResumo,
    nullable: true,
    description:
      'Etapa em que a marcação PASSA A EXISTIR na peça — antes dela não há o ' +
      'que fotografar. `null` significa "conferível em qualquer gate": ou o ' +
      'item não declara etapa (checklist antiga), ou declara um código que ' +
      'não existe como Checkpoint — e nesse caso ele entra em TODOS os ' +
      'recortes de propósito, porque sumir com um campo obrigatório é o falso ' +
      'OK que a regra de ouro proíbe.',
  })
  entraNaEtapa: EtapaResumo | null;
}

/** Os campos de UMA vista da peça — uma foto cobre todos eles de uma vez. */
export class VistaDoPlano {
  @ApiProperty({
    type: String,
    example: 'topo',
    description: 'A vista a fotografar (o `fonteFisica` do upload).',
  })
  fonteFisica: string;

  @ApiProperty({
    type: [ItemDoPlano],
    description:
      'Campos que saem desta vista, na ordem da checklist. MAIS DE UM é ' +
      'normal e esperado (o topo tem série chumbada e patrimônio ' +
      'serigrafado): uma foto só resolve os dois, desde que as duas marcações ' +
      'estejam legíveis no quadro. Quando a vista declara 2+ alvos e a visão ' +
      'só acha um número, a ambiguidade vira `nao_conferivel` — não um chute.',
  })
  campos: ItemDoPlano[];
}

/** O plano de fotos de um gate (ou da peça inteira). */
export class PlanoDaEtapa {
  @ApiProperty({
    type: EtapaResumo,
    nullable: true,
    description:
      'A etapa deste recorte; `null` em `pecaInteira` (conferência sem ' +
      '`etapaCodigo`, que cobra a checklist toda).',
  })
  etapa: EtapaResumo | null;

  @ApiProperty({
    type: [VistaDoPlano],
    description:
      'Vistas a fotografar neste gate, na ordem de primeira aparição na ' +
      'checklist. É exatamente o conjunto de fotos que a conferência desta ' +
      'etapa usa: foto de vista fora desta lista é descartada sem custo ' +
      '(`fotosForaDoRecorte`), e vista faltando vira campo `nao_conferivel`.',
  })
  vistas: VistaDoPlano[];
}

/** O projeto cuja checklist gerou o plano. */
export class ProjetoDoPlano {
  @ApiProperty({
    type: String,
    example: 'EPT-163-PI-676',
    description:
      'Código do ProjetoModelo resolvido — o mesmo que a conferência usaria. ' +
      'Confira que é o modelo da peça em mãos: checklist de outro modelo ' +
      'pediria fotos que essa peça não tem.',
  })
  codigo: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Transformador de distribuição — peça de demo',
    description: 'Descrição livre do projeto; `null` quando não cadastrada.',
  })
  descricao: string | null;
}

export class PlanoDeFotos {
  @ApiProperty({ type: ProjetoDoPlano })
  projeto: ProjetoDoPlano;

  @ApiProperty({
    type: [ItemDoPlano],
    description:
      'TODOS os itens da checklist do projeto, na ordem original — sem ' +
      'recorte de etapa. É a visão completa do modelo (e o que alimenta o ' +
      'modo avançado, que confere a peça inteira de uma vez).',
  })
  checklist: ItemDoPlano[];

  @ApiProperty({
    type: [PlanoDaEtapa],
    description:
      'Um plano por Checkpoint cadastrado, na ordem da linha. A semântica é ' +
      'CUMULATIVA: a etapa N pede as fotos dela E as das anteriores, porque o ' +
      'gate reconfere o que já estava gravado — é assim que se detecta troca ' +
      'de peça entre etapas. Logo, a última etapa tende a pedir tudo.',
  })
  etapas: PlanoDaEtapa[];

  @ApiProperty({
    type: PlanoDaEtapa,
    description:
      'O recorte SEM etapa (`etapa: null`): a checklist inteira agrupada por ' +
      'vista. É o que uma conferência disparada sem `etapaCodigo` cobra.',
  })
  pecaInteira: PlanoDaEtapa;
}

/** Query de `GET /conferencias/plano-de-fotos`. */
export class PlanoDeFotosQueryDto {
  @ApiPropertyOptional({
    example: 'EPT-163-PI-676',
    description:
      'Código do ProjetoModelo. Omitido, a API resolve pelo ÚNICO projeto ' +
      'cadastrado; com 0 ou 2+ projetos e sem este parâmetro, responde 422 ' +
      '`projeto-modelo-indeterminado`. Código sem cadastro correspondente não ' +
      'é erro: cai no mesmo fallback do único projeto (mesma cascata da ' +
      'conferência, menos o elo do vínculo da peça — aqui não há QR).',
  })
  @IsOptional()
  @IsString()
  projeto?: string;
}
