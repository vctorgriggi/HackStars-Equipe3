# Regras de negócio — TRAEL Conferência

> Consolida as regras de negócio do sistema para o time e para a banca: o que o
> sistema decide, com que critério e onde essa decisão mora no código. A fonte
> é o código em `backend/src` (vence sempre) somada ao SPEC.md; onde os dois
> divergem, o texto descreve o comportamento real e marca a divergência.
> Atualizar quando a regra mudar no código — este doc não é aspiracional.

## 1. Identidade da peça

**R1 — O valor esperado vem exclusivamente do payload do QR.** Nenhuma outra
fonte alimenta o lado "esperado" da comparação nesta rodada: sem ERP, sem
digitação, sem constante. O mapeamento é por PREFIXO do nome do campo do
checklist, em `ORIGENS_DO_ESPERADO` de
`backend/src/conferencia/conferencia-execucao.service.ts`: `serie-*` ←
`numeroSerie`, `patrimonio-*` ← `patrimonio`, `cliente-*` ← `cliente`. Campo
com prefixo fora dessa lista fica sem valor esperado.

**R2 — `potencia-*` não tem origem, de propósito.** A potência não viaja no QR;
o esperado dela viria do projeto estruturado, que não existe nesta rodada. Como
`potencia-serigrafia` é opcional no seed, a engine simplesmente o omite do
resultado (R15). Mesmo arquivo, comentário sobre `ORIGENS_DO_ESPERADO`.

**R3 — `numeroSerie` é a chave de negócio única da peça.** Coluna `unique: true`
em `backend/src/transformadors/infrastructure/persistence/relational/entities/transformador.entity.ts`;
a busca de negócio é `TransformadorsService.findByNumeroSerie`
(`backend/src/transformadors/transformadors.service.ts`). É o número que a
fábrica crava 3× no metal, e é por isso que ele serve de chave.

**R4 — Patrimônio é numeração do cliente e nunca é chave.** A coluna é `NOT NULL`
mas **sem** `unique` (mesma entidade de R3): dois clientes podem repetir o mesmo
patrimônio. Nada no sistema busca peça por patrimônio.

**R5 — Peça entra por find-or-create pelo número de série.** `buscarOuCriarTransformador`
procura por `numeroSerie`; não achando, cria com os campos do QR. Se duas
requisições correrem juntas, a violação de unique do Postgres (`23505`) é
capturada e o fluxo relê a peça criada pela concorrente em vez de estourar —
`ehViolacaoDeUnique` no mesmo `conferencia-execucao.service.ts`.

**R6 — Etiqueta sem cliente não bloqueia o cadastro.** `cliente` é coluna
`NOT NULL`, mas o QR pode não trazer o campo; nesse caso a peça é criada com
string vazia (`payload.cliente ?? ''`). O efeito no veredito é R15: sem valor
esperado, o campo `cliente-*` obrigatório vira `nao_conferivel`.

**R7 — O vínculo peça → projeto é gravado na primeira conferência.** Se o
transformador ainda não tem `projetoModelo`, a execução resolve o projeto (R9) e
persiste o vínculo antes de conferir. Da segunda conferência em diante o vínculo
já existe e vira critério de resolução.

## 2. Checklist e projeto

**R8 — A lista de campos a conferir vem do banco, nunca de código.** A execução
lê `ProjetoModelo.checklist` (texto JSON) e a repassa como parâmetro para a
engine — `lerChecklist` em `conferencia-execucao.service.ts`. Serigrafia varia
por cliente e por modelo; lista fixa em código geraria falso `conforme` para
outros modelos.

**R9 — O projeto é resolvido em cascata, nesta ordem:** (1) `codigoProjeto` lido
do QR, se existir cadastro com esse código; (2) o `projetoModelo` já vinculado à
peça; (3) o único `ProjetoModelo` cadastrado no banco. Esgotada a cascata, a
requisição falha com 422 `projeto-modelo-indeterminado`. `resolverProjetoModelo`
no mesmo arquivo.

**R10 — Código de projeto no QR sem cadastro correspondente não é erro.** É
tratado como pista que não deu em nada e a cascata segue para o critério
seguinte. Isso é o que faz a demo funcionar hoje: a etiqueta impressa traz
`TPD-408136` e o único projeto seedado é `EPT-163-PI-676` — cai no critério (3).

**R11 — Item de checklist tem exatamente três chaves: `campo`, `fonteFisica`,
`obrigatorio`.** Validado por `ehItemChecklist`. Checklist com JSON malformado,
array vazio ou item fora do formato é **dado corrompido, não erro do cliente**:
resposta 500 com mensagem apontando o código do projeto. A coluna é varchar
validada só por `@IsString` (gap conhecido 5 do CLAUDE.md); a única escrita hoje
é o seed.

**R12 — Campo obrigatório bloqueia; campo opcional não.** `obrigatorio` é
política de veredito e vive só na checklist — a extração não a enxerga
(`AlvoChecklist` em `backend/src/extracao/extracao.service.ts` tem apenas
`campo` e `fonteFisica`). O efeito está em R21 e R22.

**R13 — Valores canônicos de `fonteFisica`: `placa`, `serigrafia`, `chumbado-1`,
`chumbado-2`, `chumbado-3`, `geral`.** A fonte única em código é a união literal
`FonteFisica` em `backend/src/extracao/ports/extractor.port.ts`;
`backend/src/foto-evidencia/fonte-fisica.enum.ts` deriva dela com `satisfies`, o
que quebra a compilação se as duas listas divergirem. Grafia divergente quebra o
pareamento campo ↔ evidência.

**R14 — Checklist seedada da demo (`EPT-163-PI-676`): 8 campos, 7 obrigatórios.**
`serie-chumbada-1..3` (fontes `chumbado-1..3`), `serie-placa` e
`patrimonio-placa` (fonte `placa`), `patrimonio-serigrafia` e
`cliente-serigrafia` (fonte `serigrafia`) — todos obrigatórios; e
`potencia-serigrafia` (fonte `serigrafia`), opcional. Em
`backend/src/database/seeds/relational/projeto-modelo/projeto-modelo-seed.service.ts`,
com upsert por `codigo`.

## 3. Vereditos

**R15 — Três estados, e só três: `conforme`, `divergente`, `nao_conferivel`.**
União literal `Veredito` em `backend/src/conferencia/engine/tipos.ts`.
`conforme` = o valor lido bate com o esperado e a leitura tem lastro.
`divergente` = leu, tem lastro, e não bate — a peça está errada.
`nao_conferivel` = o sistema **não sabe** — falta esperado, falta leitura ou a
confiança não sustenta a afirmação. `nao_conferivel` não é um "quase conforme":
é a recusa explícita de afirmar.

**R16 — A engine avalia campo a campo, na ordem da checklist, e as quatro regras
abaixo são testadas nesta ordem** (`conferir` em
`backend/src/conferencia/engine/engine-conformidade.ts`). A primeira que casar
decide o campo; as seguintes nem são avaliadas.

**R17 — (a) Sem valor esperado.** Campo **opcional** some do resultado (não
aparece na resposta nem vira `CampoConferido`). Campo **obrigatório** é
registrado como `nao_conferivel` com motivo `sem-valor-esperado`. Exemplo: com o
seed da demo, `potencia-serigrafia` (opcional, sem origem no QR por R2) não
aparece na resposta do endpoint — o resultado sai com 7 campos, não 8.

**R18 — (b) Sem leitura ou leitura vazia.** `nao_conferivel`, motivo
`sem-leitura`. Vale tanto para leitura ausente quanto para `valorLido` null,
string vazia ou só espaços (`temConteudo`). O valor esperado é preservado no
resultado, para a tela mostrar o que se esperava ver.

**R19 — (c) Confiança nula ou abaixo do limiar.** `nao_conferivel`, motivo
`confianca-abaixo-do-limiar` — **mesmo que o valor lido seja idêntico ao
esperado**. É a regra mais importante do domínio: dado sem lastro nunca vira
`conforme`, porque o falso OK é exatamente a não conformidade que chega ao
cliente hoje. A comparação é `confianca < limiar`, então confiança exatamente
igual ao limiar passa.

**R20 — (d) Comparação, e só então.** `conforme` se os valores normalizados
forem iguais, `divergente` caso contrário. A normalização é `trim` + colapso de
espaços internos + caixa única (`valor.trim().replace(/\s+/g, ' ').toLowerCase()`),
aplicada **apenas para a comparação** — o resultado devolve os valores originais,
com espaços e caixa como vieram. **Não há fuzzy match, nem similaridade, nem
tolerância de dígito**: só igualdade exata do valor normalizado vira `conforme`.
A política para campo parcialmente legível está em aberto no SPEC e é o que pode
mudar isso.

**R21 — Agregação do veredito geral: `divergente` > `nao_conferivel` > `conforme`.**
`divergente` se **qualquer** campo (obrigatório ou opcional) divergir; senão
`nao_conferivel` se algum campo **obrigatório** for `nao_conferivel`; senão
`conforme`. Checklist vazia resulta `conforme` com zero campos.

**R22 — Campo opcional `nao_conferivel` não bloqueia o veredito geral.** Um
opcional ilegível mantém o geral em `conforme`; um opcional **divergente**, não —
divergência de opcional derruba o geral igual. Coberto por
`engine-conformidade.spec.ts` ("should manter conforme quando so um campo
opcional e nao_conferivel").

**R23 — A checklist manda: leitura de campo fora dela é inalcançável.** A engine
itera sobre a checklist e busca a leitura correspondente, nunca o contrário.
Adapter ou cliente que mandar um campo extra não consegue criar linha no
resultado. Para o mesmo campo lido duas vezes, a **primeira** leitura vence —
reconciliar leituras múltiplas não é responsabilidade da engine nesta rodada.

**R24 — A engine é função pura.** Zero imports de I/O, SDK, Nest ou repositório;
não muta as entradas e devolve o mesmo resultado para as mesmas entradas.
Checklist, valores esperados e limiar entram todos por argumento — nenhuma
política é constante enterrada.

## 4. Confiança e evidência

**R25 — Limiar padrão 0.8, sobrescrevível por requisição.** `LIMIAR_CONFIANCA_PADRAO`
vive na **borda** (`conferencia-execucao.service.ts`), nunca dentro da engine;
o cliente pode mandar `limiarConfianca` (0..1) no corpo do
`POST /conferencia/executar` e ele vence o padrão. `OpcoesEngine.limiarConfianca`
é parâmetro obrigatório da engine.

**R26 — Toda leitura carrega confiança, foto de evidência e, quando o serviço
fornecer, bounding box.** `LeituraCampo` (engine) e `LeituraExtraida`
(`extractor.port.ts`) trazem `confianca` (0..1, null = sem lastro),
`fotoEvidenciaId` e `regiaoLeitura`. O `ExtracaoService` carimba o
`fotoEvidenciaId` da foto de origem em toda leitura **mesmo que o adapter
esqueça** — vínculo leitura → evidência é regra de ouro, não cortesia do adapter.

**R27 — O veredito tem um único caminho de escrita: `CampoConferidosService.criarComVeredito`.**
Método server-side, sem rota HTTP e sem DTO equivalente, chamado apenas pela
execução de conferência com o resultado já calculado pela engine
(`backend/src/campo-conferidos/campo-conferidos.service.ts`).

**R28 — Veredito nunca entra pela borda HTTP.** `CreateCampoConferidoDto` e
`UpdateCampoConferidoDto` não têm `veredito`; `CreateConferenciaDto` e
`ExecutarConferenciaDto` não têm `vereditoGeral`. Os DTOs trazem comentário
explícito no lugar do campo, e o `ValidationPipe` roda com `whitelist: true`
(`backend/src/utils/validation-options.ts`), então um `veredito` enviado no
corpo é descartado antes de chegar ao service. O `create` genérico de
`Conferencia` e de `CampoConferido` grava tudo **menos** o veredito.

**R29 — Evidência é complementar ao veredito, não pré-requisito dele.**
`fotoEvidenciaId` que não existe no banco não derruba a conferência: o campo é
persistido sem foto (`criarComVeredito`). O veredito continua auditável pela
confiança; a foto reforça a auditoria.

**R30 — `valorEsperado` é coluna `NOT NULL`.** Campo obrigatório sem esperado
(R17) grava string vazia; o porquê fica no `motivo` devolvido pela engine, não
no banco. Ver `campo-conferido.entity.ts` e o comentário na chamada de
`criarComVeredito`.

## 5. Etapas e trânsito

**R31 — Checkpoint é etapa ordenada com `codigo` slug único.** `codigo` é
`unique` e `ordem` é a posição na sequência
(`backend/src/checkpoints/infrastructure/persistence/relational/entities/checkpoint.entity.ts`).
Gates e regras casam por `codigo`, nunca por nome exibido nem por `ordem` — nome
e ordem mudam, o slug não.

**R32 — Quatro etapas seedadas, na ordem da linha:** `adesivacao` (1),
`serigrafia` (2), `oleo-conferencia` (3), `fixacao-placa` (4). Upsert por
`codigo`, idempotente por linha —
`backend/src/database/seeds/relational/checkpoint/checkpoint-seed.service.ts`.

**R33 — A conferência é opcionalmente presa a uma etapa.** `etapaCodigo` é
opcional no `ExecutarConferenciaDto`; ausente, a conferência é gravada com
`checkpoint: null`. Presente, o vínculo registra em qual etapa da linha o
veredito saiu. A identidade da etapa vem do dispositivo, por isso chega como
slug e não como id (`CheckpointsService.findByCodigo`).

**R34 — O checkpoint é resolvido ANTES de qualquer escrita.** `resolverCheckpoint`
é a primeira chamada de banco da execução, logo após o parse do QR: código
desconhecido devolve 422 `etapa-desconhecida: <codigo>` sem ter criado
transformador nenhum. Etapa errada não deixa peça órfã no banco.

**R35 — A posição da peça na linha é derivada, nunca coluna.** `EventoPassagem`
registra peça × checkpoint × `createdAt`; a posição atual é o último evento. Não
existe coluna de posição em `Transformador`.

**R36 — Há dois tipos de exceção, e cada uma mora na sua entidade.**
`EventoPassagem.observacao` é **exceção de trânsito** (por que a peça parou ou
avançou naquele ponto). `Conferencia.observacao` é **exceção de conformidade**
(o aceite do time sobre uma conferência divergente, auditável). Ambas são
colunas opcionais e ambas entram por DTO normal — diferente do veredito (R28).
`Conferencia.observacao` **não** é escrita pela execução: entra depois, por
`PATCH /conferencia/:id`.

## 6. Extração

**R37 — No máximo uma chamada de visão por foto.** Regra escrita na porta
(`ExtractorPort.extrair`) e no roteamento (`ExtracaoService.extrairDeFotos`).
Sem retry automático — erro do adapter sobe, e a decisão de tentar de novo é de
quem disparou. Sequencial, não paralelo: um lote de 6 fotos de uma vez é pico de
custo e de rate limit sem ganho. É a constraint 4 do SPEC (créditos AWS finitos)
virando código.

**R38 — Foto cuja `fonteFisica` não aparece no checklist não gera chamada.** Não
se paga visão por foto que ninguém vai conferir — a foto `geral`, por exemplo,
costuma ficar de fora. Loga em debug e segue.

**R39 — Nenhuma chamada de visão acontece sem disparo explícito.** O
`ExtracaoModule` não tem controller e o `ExtracaoService` não é consumido por
nenhum caminho HTTP hoje; o único disparo existente é o script de spike
(`backend/scripts/spike-extracao.ts`). O endpoint `executar` recebe as
`leituras` já prontas no corpo — plugar a extração ao endpoint é trabalho da
Fase 2 e não muda nenhuma regra desta seção.

**R40 — Ambiguidade numérica devolve `null`; o adapter nunca chuta.** No
Textract (`backend/src/extracao/adapters/textract.extractor.ts`), série e
patrimônio são ambos numéricos e o OCR não diz qual é qual: resolve-se por
proximidade de rótulo, e sem rótulo só se aceita o caso 1-para-1 (um candidato
livre, um campo pendente). Duas famílias ambíguas, dois números na mesma linha
ou número embutido em texto que não é rótulo conhecido → `valorLido: null`,
`confianca: null`, `regiaoLeitura: null`. O raciocínio está no arquivo: a
ausência vira `nao_conferivel` (R18), enquanto um chute errado viraria
`divergente` e mandaria peça boa para retrabalho.

**R41 — O mesmo vale para o Bedrock, e está no prompt.** `montarPrompt`
(`backend/src/extracao/adapters/bedrock.extractor.ts`) instrui: não completar,
não corrigir, não deduzir de conhecimento externo; campo ilegível, cortado ou
ausente sai com `"valorLido": null` — "devolver null é o resultado CORRETO nesse
caso". Resposta que não é JSON no formato esperado, ou recusada pelo modelo,
vira leituras vazias, nunca "quase JSON" virando valor.

**R42 — A confiança do Bedrock é auto-reportada pelo modelo, não medida do
serviço.** É sinal, não garantia — e por isso a engine continua com o limiar por
parâmetro (R25). Valor fora de 0..1 ou de tipo errado não vira lastro: vira
`null` (`normalizarConfianca`). No Textract a confiança é `Confidence / 100`, e
só ele devolve bounding box (`regiaoLeitura`); no Bedrock ela sai sempre `null`.

**R43 — Adapter não inventa campo.** Leitura devolvida para campo fora dos alvos
daquela foto é descartada com warn (`ExtracaoService`), e o Bedrock remonta a
resposta pela lista de alvos: campo sem item vira leitura nula.

**R44 — O mock espelha a peça de demo.** `LEITURAS_DEMO` em
`backend/src/extracao/adapters/mock.extractor.ts` diz `847233` nas três
chumbadas e `847833` na placa — a mesma história que a demo conta com visão
real. Confiança fixa `0.99`, acima do limiar padrão. Campo ausente do mapa sai
com `valorLido: null` e `confianca: null`, o mesmo formato de uma leitura que
falhou de verdade; passando outro mapa no construtor simula-se tudo conforme ou
peça ilegível.

**R45 — Driver por variável de ambiente, com `mock` como padrão.**
`EXTRACTOR_DRIVER` ∈ `mock | textract | bedrock`, lida em
`backend/src/extracao/adapters/extractor.factory.ts`. Vazio ou inválido cai no
mock (com warn alto, no caso do inválido). O padrão é deliberado: sem credencial
AWS o sistema sobe, roda conferência ponta a ponta e passa nos testes; ligar
serviço pago é decisão explícita, nunca acidente.

## 7. Payload do QR

**R46 — Três formatos aceitos, testados nesta ordem: JSON → token único →
chave:valor.** `parsePayloadEtiqueta` em
`backend/src/transformadors/qr/qr-payload.parser.ts`. O token único vem antes de
chave:valor porque um payload como `TPD-408136` sozinho é um identificador de
lookup, não uma etiqueta incompleta.

**R47 — Só `numeroSerie` e `patrimonio` são obrigatórios.** `CAMPOS_OBRIGATORIOS`
no parser. `cliente`, `pedido`, `seq`, `descricao` e `codigoProjeto` são
opcionais e saem `null` quando ausentes.

**R48 — Chaves são reconhecidas por alias normalizado.** A chave é despida de
acento, caixa e separadores antes de casar com `ALIASES` — `Núm. Série`,
`Num. Serie`, `numero_serie` e `numSerie` chegam todas em `numeroSerie`. Valor
vazio ou só espaços é ignorado (não vira campo preenchido), e em payload com
aliases repetidos a **primeira** ocorrência vence. Números e booleanos no JSON
são convertidos para texto; chave desconhecida é ignorada em silêncio.

**R49 — QR só com código de lookup responde 422 nesta rodada.** O parser
reconhece o formato (`{ tipo: 'codigo' }`), mas a execução recusa com
`payload-somente-codigo: lookup nao suportado nesta rodada` — o fallback de
digitação manual é do front. Ver `lerPayload` em `conferencia-execucao.service.ts`.

**R50 — Três motivos de payload inválido:** `payload-vazio` (string vazia ou só
espaços), `formato-desconhecido` (texto sem estrutura reconhecível, JSON que não
é objeto, token acima de 64 caracteres ou com caracteres fora de
`[A-Za-z0-9-_./]`) e `campos-obrigatorios-ausentes: <lista>`. Todos viram 422 com
o motivo em `errors.payloadQr`.

**R51 — O formato real da etiqueta ainda não foi decodificado.** O parser cobre
os formatos prováveis; ao decodificar a etiqueta real, adicionar a fixture no
spec e ajustar o parser. Consequência prática hoje: código de projeto solto numa
linha só é reconhecido pelo padrão `TPD-\d+` (`REGEX_CODIGO_PROJETO`) — outros
formatos precisam vir com chave explícita (`projeto:`, `tpd:`, `codigoProjeto:`).

## 8. A peça de demo

**R52 — Os números da peça (desenho `EPT-163-PI-676`).** Etiqueta (QR) e série
chumbada nas 3 posições: **847233**. Placa de identificação: **847833** — a peça
carrega esse defeito de fábrica, e é ele que a demo existe para pegar.
Patrimônio, na placa e na serigrafia: **251328**. Cliente na serigrafia:
Energisa Rondônia. Fontes: SPEC.md (problema e critério 2), `LEITURAS_DEMO` no
mock e o teste-âncora em
`backend/src/conferencia/engine/engine-conformidade.spec.ts`.

**R53 — O resultado que o sistema DEVE dar.** `vereditoGeral` = **`divergente`**,
com **`serie-placa` como o único campo divergente** (esperado `847233`, lido
`847833`). As três séries chumbadas, os dois patrimônios e o cliente saem
`conforme`. É o teste-âncora da engine e o critério de aceitação 2 do SPEC.

**R54 — Nessa execução, `potencia-serigrafia` não aparece.** É opcional e não
tem valor esperado vindo do QR (R2), então a regra (a) o omite (R17): a resposta
do endpoint traz **7** campos, não os 8 da checklist. O teste-âncora da engine
injeta um esperado `10 kVA` à mão e por isso ali o campo aparece como
`nao_conferivel` — o endpoint real não faz isso.

**R55 — Em modo mock, `cliente-serigrafia` só sai `conforme` se o QR trouxer o
mesmo texto de cliente.** O esperado vem do campo `cliente` do payload (R1) e o
lido é a string fixa `143091 - Energisa Rondonia` do mock; a comparação é exata
após normalização (R20). QR com o nome completo do cliente produz um segundo
campo divergente e quebra a leitura "só a série da placa diverge" — conferir o
texto do cliente ao montar o payload de demonstração.

## Rodapé — `POST /api/v1/conferencia/executar`: erro → status

| Situação | Status | Corpo |
| --- | --- | --- |
| Sucesso | 201 | conferência + peça + campos avaliados |
| Sem token ou token inválido | 401 | guard `AuthGuard('jwt')` do controller |
| Corpo inválido (`payloadQr` vazio, `leituras` ausente/vazio, `confianca` ou `limiarConfianca` fora de 0..1) | 422 | `errors.<campo>` do `ValidationPipe` |
| Payload do QR ilegível (`payload-vazio`, `formato-desconhecido`, `campos-obrigatorios-ausentes: ...`) | 422 | `errors.payloadQr` = motivo |
| QR só com código de lookup | 422 | `errors.payloadQr` = `payload-somente-codigo: lookup nao suportado nesta rodada` |
| `etapaCodigo` sem checkpoint correspondente | 422 | `errors.etapaCodigo` = `etapa-desconhecida: <codigo>` |
| Projeto não resolvido pela cascata (R9) | 422 | `errors.projetoModelo` = `projeto-modelo-indeterminado` |
| Checklist corrompida no banco (JSON malformado, array vazio, item fora do formato) | 500 | `checklist-invalido: ... no ProjetoModelo <codigo>` |
