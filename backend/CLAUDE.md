# Project instructions

NestJS boilerplate using relational persistence (TypeORM/PostgreSQL). The document (Mongoose/MongoDB) variant was removed from this repo — only the `*:relational` generators exist.

## When adding entities, schemas, or properties

Use the `generate` skill (auto-loaded from [.claude/skills/generate/SKILL.md](.claude/skills/generate/SKILL.md)). It documents the project's CLI generators (`npm run generate:resource:*`, `npm run add:property:to-*`) which keep both database variants, DTOs, modules, and migrations in sync. Do not hand-write entity files.

## Pluralização em português (leia antes de gerar entidade nova)

O hygen deriva **pasta, nome de arquivo, rota HTTP e as classes
Service/Controller/Module** do plural do nome da entidade, e o inflector que
ele injeta (`h.inflection`) pluraliza em **inglês**. Com domínio em português
isso gerava `transformadors`, `evento-passagems`, `campo-conferidos` —
corrigido em massa na varredura de renomeação.

O ponto de extensão é `helpers` em [.hygen.js](.hygen.js): o hygen mescla esse
objeto em `h` (`node_modules/hygen/dist/context.js`), então sobrescrever
`h.inflection` ali vale para os ~200 usos de `transform` nos templates de uma
vez — nenhum template `.ejs.t` precisou ser tocado.

**Ao criar uma entidade de domínio nova, acrescente o par
`[Singular, Plural]` em `PLURAIS_IRREGULARES` (.hygen.js) ANTES de rodar
`npm run generate:resource:relational`.** Se esquecer, o generator cria a pasta
com o plural inglês e a correção vira renomeação manual de novo.

Regra de nomes que a renomeação fixou (o generator já produz exatamente isso):

| Artefato                                   | Forma      | Exemplo (`CampoConferido`)                |
| ------------------------------------------ | ---------- | ----------------------------------------- |
| pasta, arquivo do módulo, rota, `@ApiTags`  | **plural** | `src/campos-conferidos/`, `campos-conferidos` |
| Service, Controller, Module, `FindAll*Dto`  | **plural** | `CamposConferidosService`                 |
| domain, entity, mapper, repository, Create/Update/…Dto | **singular** | `CampoConferido`, `CampoConferidoEntity` |
| tabela do Postgres                          | **singular**, snake_case | `campo_conferido`           |

O `@ApiTags` gerado sai sem acento e sem espaço (`Camposconferidos`); os
controllers atuais usam a forma legível (`Campos conferidos`) — ajuste à mão
depois de gerar, é só cosmético do Swagger.

Não renomeie por causa disso: códigos de erro da API
(`campo-conferido-imutavel`, `foto-evidencia-inexistente`,
`projeto-modelo-indeterminado`, …), valores de `fonteFisica` — hoje as VISTAS
da peça: `base`, `topo`, `frente`, `traseira`, `lateral-esquerda`,
`lateral-direita`, mais os closes `placa` e `etiqueta` e o escape `geral` — e
códigos de Checkpoint (`adesivacao`, `serigrafia`, `oleo-conferencia`,
`fixacao-placa`) são contrato consumido por docs, collection e front.

Atenção: `serigrafia` é código de Checkpoint E aparece dentro de nome de campo
(`patrimonio-serigrafia-frente`), mas NÃO é mais valor de `fonteFisica` —
serigrafia é processo de marcação, não vista. Rename cego pelo texto
`serigrafia` quebra uma das três coisas.

## Migrations

Histórico de migration é imutável: renomear tabela ou coluna entra como
migration NOVA com `down` que reverte (ver
`RenomeiaEventoPassagemParaPassagem`), nunca editando a migration antiga.
