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
`backend/src/conferencias/conferencia-execucao.service.ts`: `serie-*` ←
`numeroSerie`, `patrimonio-*` ← `patrimonio`, `cliente-*` ← `cliente`. Campo
com prefixo fora dessa lista fica sem valor esperado.

**R2 — `potencia-*` não tem origem, de propósito.** A potência não viaja no QR;
o esperado dela viria do projeto estruturado, que não existe nesta rodada. Como
`potencia-serigrafia` é opcional no seed, a engine simplesmente o omite do
resultado (R15). Mesmo arquivo, comentário sobre `ORIGENS_DO_ESPERADO`.

**R3 — `numeroSerie` é a chave de negócio única da peça.** Coluna `unique: true`
em `backend/src/transformadores/infrastructure/persistence/relational/entities/transformador.entity.ts`;
a busca de negócio é `TransformadoresService.findByNumeroSerie`
(`backend/src/transformadores/transformadores.service.ts`). É o número que a
fábrica crava 3× no metal, e é por isso que ele serve de chave.

**R4 — Patrimônio é numeração do cliente e nunca é chave.** A coluna é `NOT NULL`
mas **sem** `unique` (mesma entidade de R3): dois clientes podem repetir o mesmo
patrimônio. Nada no sistema busca peça por patrimônio.

**R5 — Peça entra por find-or-create pelo número de série, e a identidade tem
UM dono.** `TransformadoresService.buscarOuCriarPorPayload` procura por
`numeroSerie`; não achando, cria com os campos do QR. Se duas requisições
correrem juntas, a violação de unique do Postgres (`23505`) é capturada e o
fluxo relê a peça criada pela concorrente em vez de estourar
(`ehViolacaoDeUnique`, no mesmo arquivo). Peça JÁ existente com patrimônio,
cliente ou pedido diferentes do QR é ATUALIZADA — o QR é a fonte da verdade
(SPEC, constraint 5), e exibir o valor antigo enquanto a comparação usa o novo
seria mentira na tela. A cópia privada que vivia em
`ConferenciaExecucaoService` foi apagada: conferência e passagem consomem este
método (e `lerPayloadDoQr`, ao lado dele), nunca reimplementam.

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

**R11 — Item de checklist tem quatro chaves: `campo`, `fonteFisica`,
`obrigatorio` e `etapa`.** As três primeiras são obrigatórias; `etapa` (o
`codigo` do Checkpoint em que a marcação passa a existir na peça — R56) é
opcional, aceita `null` como "sem etapa" e, quando presente, precisa ser
string: outro tipo nunca casaria com um `codigo` e o item cairia calado no ramo
"etapa desconhecida". Validado por `ehItemChecklist`, exportado de
`conferencia-execucao.service.ts` — é a validação ÚNICA de item de checklist
(a cópia que vivia na extração não conhecia `etapa` e deixava checklist ruim
pagar visão antes de estourar). Checklist com JSON malformado,
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
`backend/src/fotos-evidencia/fonte-fisica.enum.ts` deriva dela com `satisfies`, o
que quebra a compilação se as duas listas divergirem. Grafia divergente quebra o
pareamento campo ↔ evidência.

**R14 — Checklist seedada da demo (`EPT-163-PI-676`): 8 campos, 7 obrigatórios.**
`serie-chumbada-1..3` (fontes `chumbado-1..3`, etapa `adesivacao`),
`serie-placa` e `patrimonio-placa` (fonte `placa`, etapa `fixacao-placa`),
`patrimonio-serigrafia` e `cliente-serigrafia` (fonte `serigrafia`, etapa
`serigrafia`) — todos obrigatórios; e `potencia-serigrafia` (fonte
`serigrafia`, etapa `serigrafia`), opcional. Em
`backend/src/database/seeds/relational/projeto-modelo/projeto-modelo-seed.service.ts`,
com upsert por `codigo`.

## 3. Vereditos

**R15 — Três estados, e só três: `conforme`, `divergente`, `nao_conferivel`.**
União literal `Veredito` em `backend/src/conferencias/engine/tipos.ts`.
`conforme` = o valor lido bate com o esperado e a leitura tem lastro.
`divergente` = leu, tem lastro, e não bate — a peça está errada.
`nao_conferivel` = o sistema **não sabe** — falta esperado, falta leitura ou a
confiança não sustenta a afirmação. `nao_conferivel` não é um "quase conforme":
é a recusa explícita de afirmar.

**R16 — A engine avalia campo a campo, na ordem da checklist, passando o campo
por SEIS portões nesta ordem** (`conferir` em
`backend/src/conferencias/engine/engine-conformidade.ts`). O primeiro que casar
decide o campo; os seguintes nem são avaliados:

1. **(a) sem valor esperado** — R17;
2. **(b) sem leitura** — R18;
3. **(b2) leituras conflitantes** — R18a;
4. **(b3) leitura de outro campo** — R18b;
5. **(c) confiança abaixo do limiar** — R19;
6. **(d) comparação** — R20, o único que pode dizer `conforme`.

Os cinco primeiros só produzem `nao_conferivel`. Isso é a regra de ouro em
forma de estrutura: qualquer dúvida sobre a leitura desvia o campo para o olho
humano ANTES de chegar ao portão que sabe aprovar. Depois do laço, um
pós-processamento compara os campos irmãos entre si (R62) — ele rebaixa o
veredito geral, nunca o de um campo.

**R17 — (a) Sem valor esperado.** Campo **opcional** some do resultado (não
aparece na resposta nem vira `CampoConferido`). Campo **obrigatório** é
registrado como `nao_conferivel` com motivo `sem-valor-esperado`. Exemplo: com o
seed da demo, `potencia-serigrafia` (opcional, sem origem no QR por R2) não
aparece na resposta do endpoint — o resultado sai com 7 campos, não 8.

**R18 — (b) Sem leitura ou leitura vazia.** `nao_conferivel`, motivo
`sem-leitura`. Vale tanto para leitura ausente quanto para `valorLido` null,
string vazia ou só espaços (`temConteudo`). O valor esperado é preservado no
resultado, para a tela mostrar o que se esperava ver.

**R18a — (b2) Leituras conflitantes.** `nao_conferivel`, motivo
`leituras-conflitantes`. O campo recebeu DUAS leituras com lastro (valor
presente e confiança >= limiar) que discordam no valor normalizado; a
reconciliação da borda (R23) manda a melhor delas para a engine já marcada
como `conflitante`. Nenhuma das duas sustenta afirmação — nem a que bate com o
esperado, porque ela pode ser a etiqueta fotografada no lugar da placa. Vem
ANTES de (b3) por decisão fixada em teste: uma leitura pode chegar
`conflitante` E `trocada` ao mesmo tempo, e "este campo tem evidências que se
contradizem" é o fato mais primário — nem dá para afirmar que a vencedora é a
marcação do vizinho. **Não fere a regra de ouro**: todo caminho daqui termina
em `nao_conferivel`; a guarda só sabe recusar, nunca aprovar.

**R18b — (b3) Leitura de outro campo.** `nao_conferivel`, motivo
`leitura-de-outro-campo`, com `campoDaLeitura` dizendo de QUAL campo o valor
era esperado. A leitura não bate com o esperado do próprio campo, mas bate
EXATAMENTE com o esperado de outro: não é peça errada, é marcação do vizinho
lida no lugar errado. Medido em campo (2026-07-25): fotografando só a tampa, o
Textract lê o patrimônio SERIGRAFADO (tinta preta, alto contraste) e não lê a
série CHUMBADA (relevo da cor do tanque); sobrava um número só, a heurística o
casava com o campo pedido e o sistema acusava `divergente` numa peça correta.
A marcação acontece em `marcarLeiturasTrocadas` (`conferencia-execucao.service.ts`)
e SÓ vale para leitura com lastro — sem lastro ela não afirma nada sobre campo
nenhum, e o motivo honesto passa a ser o do portão (c). **Não fere a regra de
ouro**, embora use o valor esperado para desconfiar da leitura: todo caminho
leva a `nao_conferivel`, nenhum a `conforme`, e o cenário-âncora continua
`divergente` porque `847833` não é o esperado de campo nenhum.
`campoDaLeitura` viaja junto porque é o que separa "reenquadre a foto" de "a
peça foi gravada errada".

**R19 — (c) Confiança nula ou abaixo do limiar.** `nao_conferivel`, motivo
`confianca-abaixo-do-limiar` — **mesmo que o valor lido seja idêntico ao
esperado**. É a regra mais importante do domínio: dado sem lastro nunca vira
`conforme`, porque o falso OK é exatamente a não conformidade que chega ao
cliente hoje. A comparação é `confianca < limiar`, então confiança exatamente
igual ao limiar passa.

**R20 — (d) Comparação, e só então.** `conforme` se os valores normalizados
forem iguais, `divergente` caso contrário. A normalização é NFC + `trim` +
colapso de espaços internos + caixa única
(`valor.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()`), aplicada
**apenas para a comparação** — o resultado devolve os valores originais, com
espaços e caixa como vieram. O NFC não é fuzzy: 'ô' precomposto e 'o' +
combinante são o MESMO texto por equivalência canônica Unicode (sem ele, QR
gerado em iOS/macOS divergiria do OCR), enquanto perda de acento continua
`divergente`. **Não há fuzzy match, nem similaridade, nem tolerância de
dígito**: só igualdade exata do valor normalizado vira `conforme` — a decisão
"campo parcialmente legível" foi fechada assim (rejeitar sempre, R25). A função
mora em `backend/src/conferencias/engine/normalizacao.ts`, em módulo próprio
para que a coerência entre irmãos (R62) use exatamente a mesma sem ciclo de
import; `engine-conformidade.ts` a reexporta para quem já importava de lá.

**R21 — Agregação do veredito geral: `divergente` > `nao_conferivel` > `conforme`.**
`divergente` se **qualquer** campo (obrigatório ou opcional) divergir; senão
`nao_conferivel` se ocorrer QUALQUER uma destas três: algum campo
**obrigatório** é `nao_conferivel`, há incoerência entre campos irmãos (R63),
ou **nenhum campo saiu `conforme`**; senão `conforme`. A terceira condição é a
mais recente e a menos óbvia: `conforme` é uma AFIRMAÇÃO sobre a peça, e
afirmação exige verificação — sem nenhum campo verificado não há o que afirmar.
Sem ela, um recorte só com itens opcionais e zero leitura saía `conforme` com
todos os campos `nao_conferivel`, e um recorte de opcionais sem valor esperado
saía `conforme` com `campos: []` — o falso OK perfeito. O seed de hoje não
alcança esse caso (toda etapa tem obrigatório), mas a checklist é DADO, e a
Fase 6 pretende escrevê-la com um LLM.

**R22 — Campo opcional `nao_conferivel` não bloqueia o veredito geral.** Um
opcional ilegível mantém o geral em `conforme`; um opcional **divergente**, não —
divergência de opcional derruba o geral igual. Coberto por
`engine-conformidade.spec.ts` ("should manter conforme quando so um campo
opcional e nao_conferivel").

**R23 — A checklist manda, e leituras repetidas são reconciliadas ANTES da
engine.** A engine itera sobre a checklist e busca a leitura correspondente,
nunca o contrário: adapter ou cliente que mandar um campo extra não cria linha
no resultado. Para o mesmo campo lido duas vezes, quem decide é `dedupeLeituras`
na borda (`conferencia-execucao.service.ts`), não a engine: vence a **melhor**
leitura — valor presente ganha de leitura nula, e no empate ganha a maior
confiança —, o que faz a refoto legítima funcionar (foto ruim + foto boa da
mesma fonte). Se duas leituras COM LASTRO discordarem no valor normalizado, a
vencedora vai marcada como `conflitante` e o campo cai em `nao_conferivel`
(R18a): escolher calado dependeria da ordem do array e poderia rebaixar o
cenário-âncora a `conforme`. A engine, internamente, ainda toma a primeira
leitura de cada campo — mas nunca recebe duplicatas pelos endpoints.

**R24 — A engine é função pura.** Zero imports de I/O, SDK, Nest ou repositório;
não muta as entradas e devolve o mesmo resultado para as mesmas entradas.
Checklist, valores esperados e limiar entram todos por argumento — nenhuma
política é constante enterrada.

## 4. Confiança e evidência

**R25 — Limiar padrão 0.9, MEDIDO, sobrescrevível por requisição.**
`LIMIAR_CONFIANCA_PADRAO` vive na **borda**
(`conferencia-execucao.service.ts`), nunca dentro da engine; o cliente pode
mandar `limiarConfianca` (0..1) no corpo do `POST /conferencias/executar` (ou
do `executar-com-fotos`) e ele vence o padrão. `OpcoesEngine.limiarConfianca` é
parâmetro obrigatório da engine. O 0.9 não é arbítrio: na medição da peça real
com Textract (docs/visao-ocr.md) as leituras corretas ficaram entre **98,4% e
99,9%** e o único erro de dígito (2 lido como 8 numa foto lateral do chumbado)
veio a **84,6%** — com o 0.8 antigo esse erro passava e virava um `divergente`
FALSO, quebrando o critério 2 do SPEC; com 0.9 ele vira `nao_conferivel`, que é
a resposta honesta. Os dois grupos se separam limpo: nenhuma leitura correta
apareceu entre 84,6% e 98,4% em medição nenhuma.

**R26 — Toda leitura carrega confiança, foto de evidência e, quando o serviço
fornecer, bounding box.** `LeituraCampo` (engine) e `LeituraExtraida`
(`extractor.port.ts`) trazem `confianca` (0..1, null = sem lastro),
`fotoEvidenciaId` e `regiaoLeitura`. O `ExtracaoService` carimba o
`fotoEvidenciaId` da foto de origem em toda leitura **mesmo que o adapter
esqueça** — vínculo leitura → evidência é regra de ouro, não cortesia do adapter.

**R27 — O veredito tem um único caminho de escrita: `CamposConferidosService.criarComVeredito`.**
Método server-side, sem rota HTTP e sem DTO equivalente, chamado apenas pela
execução de conferência com o resultado já calculado pela engine
(`backend/src/campos-conferidos/campos-conferidos.service.ts`).

**R28 — Veredito nunca entra pela borda HTTP.** `CreateCampoConferidoDto` e
`UpdateCampoConferidoDto` não têm `veredito`; `CreateConferenciaDto` e
`ExecutarConferenciaDto` não têm `vereditoGeral`. Os DTOs trazem comentário
explícito no lugar do campo, e o `ValidationPipe` roda com `whitelist: true`
(`backend/src/utils/validation-options.ts`), então um `veredito` enviado no
corpo é descartado antes de chegar ao service. O `create` genérico de
`Conferencia` e de `CampoConferido` grava tudo **menos** o veredito.

**R29 — Evidência é complementar ao veredito, mas evidência EMPRESTADA é 422.**
`fotoEvidenciaId` que não existe no banco não derruba a conferência: o campo é
persistido sem foto (`criarComVeredito`) — o veredito continua auditável pela
confiança. Já uma foto **presa a OUTRA conferência** derruba o request inteiro
com 422 `foto-evidencia-de-outra-conferencia`: lastro emprestado falsificaria a
trilha de auditoria. A recusa acontece em dois pontos de propósito —
`validarEvidenciasDisponiveis` roda ANTES da primeira escrita (senão o 422
estourava no meio do laço de campos e deixava conferência órfã com campos
parciais, que o scan de passagem ainda leria como "última conferência" da
peça), e `criarComVeredito` a repete como última linha de defesa.

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

**R35 — A posição da peça na linha é derivada, nunca coluna.** `Passagem`
registra peça × checkpoint × `createdAt`; a posição atual é a última
passagem. Não existe coluna de posição em `Transformador`.

**R36 — Há dois tipos de exceção, e cada uma mora na sua entidade.**
`Passagem.observacao` é **exceção de trânsito** (por que a peça parou ou
avançou naquele ponto). `Conferencia.observacao` é **exceção de conformidade**
(o aceite do time sobre uma conferência divergente, auditável). Ambas são
colunas opcionais e ambas entram por DTO normal — diferente do veredito (R28).
`Conferencia.observacao` **não** é escrita pela execução: entra depois, por
`PATCH /conferencias/:id`.

## 6. Extração

**R37 — No máximo uma chamada de visão por foto, e falha de uma foto não
derruba o lote.** Regra escrita na porta (`ExtractorPort.extrair`) e no
roteamento (`ExtracaoService.extrairDeFotos`). Sem retry automático — o loop de
reprocessamento é o risco de custo que a constraint 4 do SPEC proíbe. O erro do
adapter (arquivo corrompido, formato recusado, throttle) é CAPTURADO por foto,
logado como erro e a foto segue sem leituras: os campos dela viram
`nao_conferivel` na engine, que é a filosofia do domínio (foto ruim é revisão
humana, não 500) e preserva as chamadas já pagas das outras fotos. Sequencial,
não paralelo: um lote de 6 fotos de uma vez é pico de custo e de rate limit sem
ganho.

**R38 — Foto cuja `fonteFisica` não aparece no checklist não gera chamada.** Não
se paga visão por foto que ninguém vai conferir — a foto `geral`, por exemplo,
costuma ficar de fora. Loga em debug e segue.

**R39 — Nenhuma chamada de visão acontece sem disparo explícito do operador.**
O `ExtracaoModule` continua sem controller — nenhuma rota fala com o adapter
direto —, mas o `ExtracaoService` HOJE tem caminho HTTP, e ele é o principal:
`POST /conferencias/executar-com-fotos` (via `ConferenciaExtracaoService`). O
disparo continua sendo um ato do operador, uma vez por conferência, com teto de
fotos (R64), uma chamada por foto (R37) e nenhum reprocessamento em laço; o
script de spike (`backend/scripts/spike-extracao.ts`) segue existindo para
medição fora do fluxo. O `POST /conferencias/executar` (leituras prontas no
corpo) continua disponível para teste e para o modo avançado da `/demo` — nele
não há chamada de visão nenhuma.

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
`backend/src/transformadores/qr/qr-payload.parser.ts`. O token único vem antes de
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
`backend/src/conferencias/engine/engine-conformidade.spec.ts`.

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
lido é a string fixa do mock, que é
`143091 - Energisa Rondônia Distribuidora de Energia S.A` (`LEITURAS_DEMO`);
a comparação é exata após normalização (R20). QR com um texto de cliente
diferente produz um segundo campo divergente e quebra a leitura "só a série da
placa diverge" — conferir o texto do cliente ao montar o payload de
demonstração.

## 9. Conferência parcial por etapa

**R56 — O recorte da checklist por etapa é CUMULATIVO.** Cada item traz a
`etapa` em que a marcação passa a existir fisicamente na peça (R11); com
`etapaCodigo` no request, entram os itens cuja etapa tem `ordem` **menor ou
igual** à do gate. Cumulativo de propósito: o gate da placa reconfere o
chumbado e a serigrafia, e é assim que se detecta troca de peça entre etapas.
Sem o recorte, o gate da adesivação cobrava a placa que ainda nem foi fixada e
devolvia `nao_conferivel` por marcação inexistente — ruído que soma o veredito
real. A regra é pura (`filtrarChecklistPorEtapa`, testada direto) e recebe um
mapa `codigo -> ordem`; não toca banco.

**R57 — Sem etapa, tudo entra.** Request sem `etapaCodigo` avalia a checklist
INTEIRA (o comportamento histórico do endpoint), e item sem `etapa` é sempre
incluído, qualquer que seja o gate — checklist antiga continua valendo sem
migração.

**R58 — Etapa desconhecida no item INCLUI o item e loga.** Se a `etapa` de um
item não existe como `Checkpoint`, o item entra assim mesmo e o código volta em
`etapasDesconhecidas` para o serviço logar
(`checklist-etapa-desconhecida: ...`). Checklist inconsistente não pode derrubar
a conferência, e silenciar o item seria pior: campo obrigatório sumindo do gate
é exatamente o falso OK que a regra de ouro proíbe.

**R59 — Recorte que não confere nada é 422, nunca `conforme`.** Duas guardas
diferentes: recorte com zero itens →
`etapa-sem-campos-conferiveis: nenhum item ... e conferivel ate a etapa 'X'`
(antes de qualquer escrita); recorte NÃO vazio cujo resultado da engine saiu com
zero campos (todos opcionais sem valor esperado, omitidos por R17) →
`checklist-sem-campo-avaliavel`. Gravar seria pior que errar: ficaria uma
conferência sem campo nenhum, isto é, "esta peça está conforme?" respondido sem
olhar a peça.

## 10. Segunda camada: achados livres e coerência entre irmãos

**R60 — Achado livre é o texto que a visão leu e não virou leitura de campo.**
`ExtractorPort.extrair` devolve `ResultadoExtracao { leituras, achadosLivres }`
— dois canais na MESMA resposta do serviço, custo AWS zero (nenhuma chamada a
mais). O achado sai com o mesmo carimbo de evidência das leituras
(`fotoEvidenciaId`, confiança, `regiaoLeitura`) e sem filtro por campo: achado
livre não pertence a checklist nenhuma.

**R61 — `achadosInconsistentes` é ALARME, nunca veredito.** `cruzarAchados`
(função pura em `conferencia-extracao.service.ts`) compara os achados com os
valores do QR: (1) candidato é só o texto de dígitos cujo COMPRIMENTO bate com
o de um identificador do payload — o comprimento vem do payload, nunca de
constante, senão a próxima numeração de cliente viraria spam; (2) alarme é o
candidato que não é igual a NENHUM valor do QR, incluindo pedido, seq e código
do projeto — número que a etiqueta afirma não é inconsistência; (3) dedupe por
texto normalizado: o mesmo `847833` lido em 3 blocos é UM alarme com 3
evidências. O resultado não toca `vereditoGeral` nem campo nenhum e **não é
persistido** nesta rodada (o alerta persistente é a T4.3 do PLAN). Consistência
não enxerga ausência — peça lisa, sem marcação, sai daqui sem alarme —, então
promover `conforme` a partir daqui seria o falso OK. Texto não numérico
(normas, descrição) fica fora de propósito: em placa de transformador, ruído
supera sinal.

**R62 — Coerência entre irmãos: grupo descoberto por VALOR ESPERADO idêntico.**
Depois do laço por campo, `detectarIncoerencias` (`engine/coerencia.ts`, pura)
agrupa os campos que o QR mandou carregar o mesmo valor (normalizado) e reporta
os grupos que leram coisas diferentes entre si — as 3 séries chumbadas mais a
da placa, os dois patrimônios. Agrupar pelo esperado, e não por prefixo de nome
nem por declaração na checklist, faz modelo com 2 ou 4 chumbados funcionar sem
tocar código. Ficam FORA da comparação: campo sem leitura (ausência nunca é
discordância), leitura `conflitante` e leitura `trocada` — nenhuma das duas
afirma algo sobre aquela posição, e usá-las produziria alarme não determinista
ou discordância fantasma sobre peça correta. Confiança baixa NÃO exclui: uma
leitura fraca ainda é uma afirmação sobre a posição, e é justamente o caso
medido (84,6% lendo `847833` onde as irmãs liam `847233` a 98,8%).

**R63 — Incoerência REBAIXA e nunca promove.** Ela só pode transformar
`conforme` geral em `nao_conferivel` (R21); `divergente` continua vencendo, para
que defeito real da peça jamais vire "ruído de OCR". Não existe voto
majoritário: duas posições concordando NÃO aprovam a terceira — as duas podem
estar gravadas erradas juntas. Nenhum veredito de campo é reescrito por aqui; a
incoerência viaja na resposta (`incoerencias`, com campos, valores lidos e
confiança) para o humano decidir qual posição re-inspecionar.

## 11. `POST /conferencias/executar-com-fotos`

**R64 — Teto de 10 fotos por conferência, ids deduplicados.**
`MAX_FOTOS_POR_CONFERENCIA = 10` vive no DTO (contrato explícito, não escondido
no service) porque cada foto é UMA chamada paga de visão: 10 cobre a peça de
demo (placa + serigrafia + 3 chumbados) com folga para refoto. Id repetido no
mesmo request é colapsado antes de qualquer leitura — pagar duas vezes pela
mesma foto é queimar crédito por engano de digitação.

**R65 — Foto cuja fonte física não tem campo no RECORTE não vai para a visão.**
A filtragem usa o recorte da etapa (R56), não a checklist inteira: no gate da
adesivação, a foto da placa é tão inútil quanto a foto `geral`. As descartadas
voltam contadas em `extracao.fotosForaDoRecorte` — não é erro, é o custo que
deixou de ser pago, explícito na resposta. Também não lastreiam campo nenhum, e
por isso seguem soltas, reutilizáveis no gate em que a marcação delas existir.

**R66 — Ordem inegociável: tudo que é barato e pode dar 422 acontece antes do
primeiro byte ir para a visão.** Parse do QR, etapa, projeto, recorte
(`prepararExecucao` — a resolução ÚNICA de ProjetoModelo, R9) e a validação do
lote de evidências vêm primeiro; só então bytes, extração, engine e escrita. O
mesmo `ContextoExecucao` é repassado ao `executar()`, o que garante que a visão
leu exatamente a checklist que a engine vai avaliar. O vínculo foto →
conferência é gravado DEPOIS do veredito e é best-effort: falhar ali vira log
de erro, nunca resposta perdida — o veredito já está gravado e é o produto de
uma visão já paga.

## Rodapé — `POST /api/v1/conferencias/executar`: erro → status

| Situação | Status | Corpo |
| --- | --- | --- |
| Sucesso | 201 | conferência + peça + campos avaliados |
| Sem token ou token inválido | 401 | guard `AuthGuard('jwt')` do controller |
| Corpo inválido (`payloadQr` vazio, `leituras` ausente/vazio, `confianca` ou `limiarConfianca` fora de 0..1) | 422 | `errors.<campo>` do `ValidationPipe` |
| Payload do QR ilegível (`payload-vazio`, `formato-desconhecido`, `campos-obrigatorios-ausentes: ...`) | 422 | `errors.payloadQr` = motivo |
| QR só com código de lookup | 422 | `errors.payloadQr` = `payload-somente-codigo: lookup nao suportado nesta rodada` |
| `etapaCodigo` sem checkpoint correspondente | 422 | `errors.etapaCodigo` = `etapa-desconhecida: <codigo>` |
| Projeto não resolvido pela cascata (R9) | 422 | `errors.projetoModelo` = `projeto-modelo-indeterminado` |
| Nenhum item da checklist é conferível até a etapa pedida (R59) | 422 | `errors.etapaCodigo` = `etapa-sem-campos-conferiveis: ...` |
| Recorte não vazio que não produziu campo avaliável (R59) | 422 | `errors.checklist` = `checklist-sem-campo-avaliavel: ...` |
| Alguma leitura aponta foto já presa a outra conferência (R29) | 422 | `errors.fotoEvidenciaId` = `foto-evidencia-de-outra-conferencia: <id>` |
| Checklist corrompida no banco (JSON malformado, array vazio, item fora do formato) | 500 | `checklist-invalido: ... no ProjetoModelo <codigo>` |

Todos os 422 acima saem **antes da primeira escrita**: erro de request nunca
deixa transformador órfão nem conferência parcial no banco.

## Rodapé — `POST /api/v1/conferencias/executar-com-fotos`: erro → status

Mesmo contrato do `executar` (as linhas acima valem todas, exceto as que falam
de `leituras`, que este endpoint não aceita — quem produz leitura aqui é a
visão), mais o que é próprio do lote de fotos. Todos são avaliados ANTES de
qualquer chamada paga (R66).

| Situação | Status | Corpo |
| --- | --- | --- |
| Sucesso | 201 | resposta do `executar` + `extracao` (driver, fotos, leiturasProduzidas, fotosForaDoRecorte, achadosLivres) + `achadosInconsistentes` |
| `fotoEvidenciaIds` ausente, vazio, acima de 10 ou com id que não é uuid | 422 | `errors.fotoEvidenciaIds` do `ValidationPipe` (R64) |
| Id de foto que não existe no banco | 422 | `errors.fotoEvidenciaIds` = `foto-evidencia-inexistente: <id>` |
| Foto já vinculada a outra conferência | 422 | `errors.fotoEvidenciaIds` = `foto-evidencia-de-outra-conferencia: <id>` |
| Nenhuma foto do lote está no recorte da etapa (R65) | 201 | conferência sai `nao_conferivel`: sem leitura, não há o que afirmar — não é erro |
| Adapter de visão falha em uma foto (R37) | 201 | a foto segue sem leituras; os campos dela viram `nao_conferivel` |
