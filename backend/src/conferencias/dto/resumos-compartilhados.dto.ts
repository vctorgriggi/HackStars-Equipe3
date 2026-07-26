import { ApiProperty } from '@nestjs/swagger';

import { TransformUrlEvidencia } from '../../fotos-evidencia/domain/url-evidencia.transform';

/**
 * Projeções de LEITURA que aparecem em mais de uma resposta de domínio
 * (conferência, passagem, histórico). Existem como CLASSE porque o Swagger só
 * documenta classes — interface some na compilação e o front receberia rota
 * sem schema de resposta.
 *
 * Ficam num arquivo só, e não uma cópia por módulo, porque nome de schema é
 * global no documento OpenAPI: três `TransformadorResumo` diferentes virariam
 * três schemas quase iguais para o front escolher. O arquivo importa apenas o
 * Swagger e o `@Transform` da URL de evidência (uma função de serialização,
 * não um módulo de domínio) — segue folha, sem risco de ciclo com quem o
 * consome.
 */

export class CheckpointResumo {
  @ApiProperty({
    type: String,
    example: 'fixacao-placa',
    description:
      'Identificador ESTÁVEL da etapa (slug). É por ele que gates e regras ' +
      'casam — nunca pelo nome exibido nem pela ordem, que mudam.',
  })
  codigo: string;

  @ApiProperty({
    type: String,
    example: 'Fixação da placa de identificação',
    description: 'Nome exibível da etapa; só para a tela.',
  })
  nome: string;
}

export class EtapaResumo extends CheckpointResumo {
  @ApiProperty({
    type: Number,
    example: 4,
    description:
      'Posição da etapa na linha (1 = adesivação … 4 = fixação da placa). ' +
      'Define o recorte CUMULATIVO da checklist: a etapa N confere o que ela ' +
      'e as anteriores gravaram na peça.',
  })
  ordem: number;
}

/**
 * A foto que lastreia uma leitura, do jeito que a tela precisa dela: id, URL
 * pronta e a vista que ela mostra.
 *
 * É CLASSE, não interface, por DOIS motivos independentes. (1) O Swagger só
 * documenta classe. (2) `@TransformUrlEvidencia()` só roda quando o
 * class-transformer encontra uma INSTÂNCIA na resposta — objeto plano não
 * carrega metadado de decorator. Sem a instância, sob `FILE_DRIVER=s3` o front
 * receberia a key crua do bucket em vez da URL assinada: a foto não abriria e o
 * critério 1 do SPEC ("cada valor lido com link para sua foto-evidência")
 * cairia justamente no ambiente da demo. Quem monta a resposta faz
 * `new FotoDaEvidenciaResposta()` e atribui campo a campo; copiar a
 * propriedade para um objeto literal NÃO dispara o transform.
 *
 * A cadeia que entrega a URL pronta é global (main.ts):
 * `ClassSerializerInterceptor` aplica o transform (que sob s3 devolve uma
 * PROMISE) e o `ResolvePromisesInterceptor`, registrado por fora dele, resolve
 * a promise antes de serializar o JSON.
 */
export class FotoDaEvidenciaResposta {
  @ApiProperty({
    type: String,
    example: 'c0ffee00-1111-2222-3333-444455556666',
    description:
      'Id da FotoEvidencia. Estável: serve de chave de lista e de âncora para ' +
      'agrupar na tela os campos que saíram da MESMA foto.',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: 'https://trael.s3.us-east-1.amazonaws.com/1e0f2c9d.jpg?X-Amz-...',
    description:
      'URL pronta para uso: driver local → absoluta; driver s3 → ASSINADA E ' +
      'COM VALIDADE DE 1 HORA. Por isso ela não pode ser persistida em store ' +
      'de longa duração no cliente — depois de 1h o link devolve 403 e a ' +
      'evidência some da tela. Recarregue a conferência para obter uma nova.',
  })
  @TransformUrlEvidencia()
  url: string;

  @ApiProperty({
    type: String,
    example: 'placa',
    description:
      'Vista da peça que a foto mostra (`topo`, `frente`, `traseira`, ' +
      '`lateral-esquerda`, `lateral-direita`, `base`, `placa`, `etiqueta`, ' +
      '`geral`). É PERSISTIDO junto da foto — é a procedência real da ' +
      'evidência, não uma dedução da tela.',
  })
  fonteFisica: string;
}

/**
 * Registro de FotoEvidencia → `FotoDaEvidenciaResposta`, como INSTÂNCIA. É o
 * único jeito de a `url` chegar pronta ao front (ver o comentário da classe),
 * e mora aqui — junto da classe — para que os três montadores de resposta
 * (execução, extração e releitura do veredito) não repitam a armadilha do
 * objeto literal cada um por conta própria.
 *
 * `null`/`undefined` entra e sai como `null`: leitura sem foto (digitada no
 * modo avançado) é caso normal, não erro.
 */
export function paraFotoDaEvidencia(
  foto: { id: string; url: string; fonteFisica: string } | null | undefined,
): FotoDaEvidenciaResposta | null {
  if (!foto) {
    return null;
  }

  const resposta = new FotoDaEvidenciaResposta();
  resposta.id = foto.id;
  resposta.url = foto.url;
  resposta.fonteFisica = foto.fonteFisica;

  return resposta;
}

export class TransformadorResumo {
  @ApiProperty({
    type: String,
    example: '3f6d1b2e-9c4a-4f5b-8a7d-2e1c0b9a8f7e',
  })
  id: string;

  @ApiProperty({
    type: String,
    example: '847233',
    description:
      'Chave de negócio da peça (série do fabricante, chumbada 3× no metal). ' +
      'É por ela que o find-or-create resolve a peça a partir do QR.',
  })
  numeroSerie: string;

  @ApiProperty({
    type: String,
    example: '251328',
    description:
      'Numeração do CLIENTE: única por cliente, não globalmente — nunca serve ' +
      'de chave para localizar a peça.',
  })
  patrimonio: string;

  @ApiProperty({
    type: String,
    example: 'ENERGISA',
    description:
      'Cliente como texto do QR (string livre nesta rodada; vira entidade na ' +
      'rodada de ERP). String vazia quando a etiqueta não traz o dado.',
  })
  cliente: string;
}
