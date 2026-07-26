# TRAEL Conferência

> Sistema de conferência de identidade e rastreabilidade de transformadores na
> linha de produção da TRAEL (HackStars Batch #2): lê o QR da etiqueta (fonte
> da verdade), extrai por visão os identificadores físicos da peça e emite
> veredito de conformidade campo a campo, com evidência fotográfica.

Leia este arquivo no início de toda sessão — ele é o **contrato de como
escrevemos código aqui**, não documentação. Quando uma convenção for decidida
durante a implementação, registre-a aqui. Contexto detalhado mora em @SPEC.md
(o quê e por quê) e @PLAN.md (ordem de execução).

**Fase atual = Fase 3 — Fluxo de conferência ponta a ponta.** A Fase 2 fechou
(extração real plugada em `POST /conferencias/executar-com-fotos`) e o
**backend da Fase 4 já subiu na frente da UI** — scan de passagem, histórico e
última conferência da peça existem e estão no ar; o que falta na Fase 4 é tela.
ERP, câmeras fixas e perfis de usuário não pertencem a esta rodada; estão em
SPEC.md, seção "Planejado / rodadas futuras".

## Regra de ouro

**O veredito de conformidade nasce exclusivamente na API: o front nunca compara
campos, e todo dado extraído por visão/OCR entra no sistema com score de
confiança e foto-evidência anexada, nunca como fato.** Tudo abaixo é
desdobramento disso.

Na prática: o `frontend` envia QR e fotos e renderiza vereditos prontos; a engine em
`conformidade` é a única que compara; `extracao` devolve leituras com confiança
e vínculo à foto de origem, e uma leitura sem confiança ou sem evidência não
entra no banco. Um campo ilegível é `nao_conferivel` — rebaixá-lo para
`conforme` é o bug mais caro possível neste domínio (o falso OK é exatamente a
não conformidade que chega ao cliente hoje).

## Stack

| Camada  | Tecnologia                                                       |
| ------- | ---------------------------------------------------------------- |
| API     | NestJS (base brocoders/nestjs-boilerplate), TypeORM + PostgreSQL |
| Front   | Next.js 16 (React 19, Tailwind 4), mobile-first; `mobile/` (Expo) é experimento do time |
| Visão   | AWS Textract (escolhido e medido no spike T2.1); Bedrock fora do caminho de leitura: leem com recorte, mas inconsistentes e sem confiança calibrada — docs/visao-ocr.md |
| Storage | AWS S3 (fallback: disco local, se S3 ameaçar o prazo)            |
| Deploy  | ECR + App Runner (HTTPS), RDS PostgreSQL — receita em docs/deploy.md |

## Estrutura

```
backend/                  # NestJS (base brocoders/nestjs-boilerplate)
  src/
    transformadores/      # CRUD Transformador (gerado); recebe o parser do QR (T1.1)
    projetos-modelo/      # CRUD ProjetoModelo (gerado); checklist por modelo como dado
    conferencias/         # CRUD Conferencia (gerado); recebe a engine de comparação (T1.2)
    campos-conferidos/    # CRUD CampoConferido (gerado)
    fotos-evidencia/      # CRUD FotoEvidencia (gerado); recebe upload/S3 (T2.3)
    checkpoints/          # CRUD Checkpoint (gerado); seed das etapas ordenadas da linha
    passagens/            # CRUD Passagem (gerado); trânsito (T4.1)
    extracao/             # ExtractorPort + adapters textract|bedrock|mock;
                          #   driver por env EXTRACTOR_DRIVER (mock default)
    auth/, files/, i18n/  # herdados do boilerplate; não usados nesta rodada
frontend/                 # Next.js 16: leitura QR, fotos, veredito, histórico
mobile/                   # app Expo (React Native) subido pelo time; experimento
```

`mobile/` é **experimento**, não decisão: nenhuma tarefa do PLAN aponta para
ele e qual cliente vai à demo (`frontend/` Next × `mobile/` Expo) está em
aberto — ver "Decisões em aberto". Vale para os dois o mesmo contrato: cliente
não compara campo, não conhece limiar e não fala com AWS.

Pasta e rota vão no plural correto do português (`transformadores/`,
`campos-conferidos/`, `projetos-modelo/`) — o gerador aprendeu os plurais do
domínio, então entidade nova já nasce com a pasta e a rota certas; se um nome
novo não estiver coberto, corrija a regra no gerador, não o resultado à mão.
Nome de classe segue singular (`Transformador`, `CampoConferido`) — só a pasta
e a rota pluralizam. O mapa conceitual do PLAN: transformadores →
`transformadores/`, conformidade → `conferencias/` + `campos-conferidos/`,
evidencias → `fotos-evidencia/`, transito → `checkpoints/` + `passagens/`.
Entidade ou propriedade nova entra pelos generators (recipe em
backend/CLAUDE.md), nunca à mão.

Funcionalidade nova entra como módulo novo atrás das mesmas fronteiras
(auditoria, ERP e câmeras fixas já estão planejadas assim); nada novo entra
dentro da engine de conformidade.

## Como rodar

```bash
# 1ª vez: criar o env (APP_PORT=3001 vive só aí; sem ele a API sobe em :3000)
cd backend && sed 's/^DATABASE_HOST=postgres/DATABASE_HOST=localhost/' env-example-relational > .env
cd backend && docker compose up -d postgres && npm run migration:run && npm run seed:run:relational
cd backend && npm run start:dev   # API em :3001, swagger em /docs
cd frontend && npm run dev        # app em :3000; API derivada do host da página
cd backend && npm run test        # unit da engine e do parser (existem a partir da T1.2)
# CRUD gerado exige JWT: login com o admin seed do boilerplate
# (admin@example.com / secret) em POST /api/v1/auth/email/login
```

## Engine de conformidade

- Função pura: (valores esperados do QR) + (leituras com confiança) →
  vereditos por campo + veredito geral. Zero imports de I/O, SDK ou repositório.
- Precedência do veredito geral: `divergente` > `nao_conferivel` > `conforme`.
  `conforme` só com todos os campos conformes.
- Limiar de confiança é parâmetro da engine, não constante enterrada.
  Default do endpoint: `LIMIAR_CONFIANCA_PADRAO = 0.9` (medido com a peça
  real: leituras corretas em 98,4–99,9%, erro de dígito a 84,6%) em
  `conferencia-execucao.service.ts`, sobrescrevível por request.
- Escrita de veredito tem UM caminho: `CamposConferidosService.criarComVeredito`
  (server-side, sem rota HTTP). Nunca crie outro — é o que mantém a regra de
  ouro auditável.
- **Antes de acusar, confirme** (`conferencia/engine/corroboracao.ts`): campo cuja
  marcação é RELEVO (série chumbada) não vira `divergente` com uma leitura só —
  exige releituras de recorte concordantes e nenhuma posição irmã tendo lido
  outro valor; senão é `nao_conferivel` (`leitura-nao-corroborada`). Motivo:
  medido, a confiança do OCR no relevo mede enquadramento, não correção
  (docs/visao-ocr.md). A regra restringe ACUSAÇÃO, nunca aprovação — e a placa
  IMPRESSA continua `divergente` com uma leitura (cenário-âncora).
- CampoConferido é IMUTÁVEL via HTTP (update → 422): PATCH no lastro
  (valores/confiança/foto) de um veredito já emitido falsificaria a trilha de
  auditoria (revisão R1). Comparação usa Unicode NFC; confiança <= 0 nunca é
  lastro, mesmo com limiar 0.
- Fluxo do endpoint `POST /conferencias/executar`: `prepararExecucao()` (parse
  do QR → checkpoint → ProjetoModelo → checklist → recorte da etapa) e SÓ
  DEPOIS find-or-create por numeroSerie → engine → persistência. Toda a fase
  barata é read-only: nenhum 422 (etapa desconhecida, projeto indeterminado,
  recorte vazio) pode deixar peça órfã no banco. Com `etapaCodigo`, a checklist
  é recortada por etapa (semântica CUMULATIVA: a etapa N confere o que ela e as
  anteriores gravaram); recorte vazio → 422 `etapa-sem-campos-conferiveis`.
- `ConferenciaExecucaoService.prepararExecucao` é a resolução ÚNICA de
  ProjetoModelo (codigoProjeto do QR → vínculo da peça → único do banco) e do
  recorte por etapa. Quem precisar da checklist antes do veredito chama ela e
  passa o `ContextoExecucao` de volta ao `executar()` — duas resoluções
  independentes já divergiram (a extração lia a checklist de um projeto e a
  engine avaliava outro).
- `POST /conferencias/executar-com-fotos` é a variante com visão real: prepara
  primeiro (todo 422 antes de gastar), manda ao ExtractorPort só as fotos cuja
  `fonteFisica` tem campo NO RECORTE da etapa, e delega o veredito ao MESMO
  `executar()` — nunca duplique a orquestração; a extração só produz leituras,
  quem compara continua sendo a engine. As fotos efetivamente usadas ficam
  vinculadas à conferência depois que ela é criada (foto já presa a outra
  conferência → 422 `foto-evidencia-de-outra-conferencia`, antes da visão).
- A lista de campos a conferir também é parâmetro — o chamador a carrega da
  checklist do ProjetoModelo da peça (seed da demo: EPT-163-PI-676). Serigrafia
  varia por cliente/modelo; lista hardcoded geraria falso conforme para outros
  modelos, e checklist em código morreria a cada modelo novo.

## Extração e bordas AWS

- Toda borda externa entra atrás de porta mockável: `ExtractorPort` em
  `extracao`, storage em `evidencias`. Consumidores testam com mock; o adapter
  real se verifica manualmente com as fotos da demo.
- Serviços, modelos (IDs Bedrock), custos e checklist de setup AWS:
  docs/aws.md. Resultado do spike e limites medidos: docs/visao-ocr.md.
- `EXTRACTOR_DRIVER`: `mock` (default, funciona sem AWS), `textract` (a escolha
  do spike E do ambiente no ar) ou `bedrock` — este último NÃO deve ser usado
  para leitura numérica: medido em 2026-07-25, alucina número plausível onde o
  Textract admite não ter lido (docs/visao-ocr.md). Fica no código para o
  check qualitativo de layout.
- SSL do banco é condicional a `DATABASE_SSL_ENABLED` — RDS exige TLS, o
  Postgres local do docker não suporta; fixar um dos dois quebra o outro.
- Spike T2.1 executável: `npx ts-node -r tsconfig-paths/register
  scripts/spike-extracao.ts <dir-fotos>` (fotos nomeadas pela fonte, hoje a
  vista: topo.jpg, frente.jpg, lateral-direita.jpg, placa.jpg…). Sem
  credencial, falha com mensagem apontando docs/aws.md.
- Fonte única em código dos valores de `fonteFisica`: união literal
  `FonteFisica` em extracao/ports/extractor.port.ts; fotos-evidencia deriva
  dela com `satisfies` (divergência quebra a compilação).
- Nenhuma chamada de visão fora de ação explícita do operador — créditos AWS
  são finitos (SPEC, constraint 4); sem reprocessamento em loop. O teto por foto
  é **3 chamadas, fixo**: a foto inteira + 2 recortes de corroboração do relevo
  (`adapters/recorte.ts`, margens 50%/150%, resolução nativa, sem filtro de
  pixel — ampliar e pré-processar foram medidos e reprovados). Teto, não laço.
- **Discriminação tinta × relevo por contraste** (`adapters/contraste.ts`):
  quando sobra número numérico sem dono numa vista que declara 2+ marcações, o
  adapter mede a luminância DENTRO do bounding box contra a de um anel em volta
  e classifica a leitura em `tinta` | `relevo` | `claro-sobre-escuro` |
  `indeterminado` — tinta preta é escura contra o tanque, relevo tem a cor do
  fundo, placa é claro sobre preto. O número vai para o alvo cujo tipo esperado
  (`tipoDeMarcacaoDoCampo`, derivado do nome do campo) combina, e SÓ quando o
  casamento é único nos dois sentidos. Zero chamada AWS a mais: é aritmética
  sobre bytes já em memória. Limiares e a tabela de calibração com as fotos
  reais moram no próprio arquivo; `scripts/spike-contraste.ts` reexecuta.
- Medição INCONCLUSIVA (`indeterminado`, sem `sharp`, foto lisa) nunca pode
  piorar o resultado: cai-se na regra antiga, intacta. Só evidência CONTRÁRIA
  (classe decisiva que não casa com alvo nenhum) deixa o campo nulo. Essa
  distinção é `medicaoConclusiva` — sem ela, uma foto sem textura zerava
  leituras boas e quebrava a corroboração por recorte.
- `sharp` é dependência OPCIONAL em runtime: import dinâmico em try/catch, e
  `EXTRACAO_RECORTE=off` desliga recorte E medição de contraste sem deploy. Sem
  ela o adapter volta a 1 chamada por foto, leitura em relevo sai
  `nao-confirmada` (deixa de poder acusar, continua podendo confirmar
  `conforme`) e a heurística volta ao casamento por contagem.
- Bounding box do Textract vem no referencial da foto JÁ ORIENTADA pelo EXIF,
  mas `sharp(...).metadata()` reporta as dimensões CRUAS: use
  `dimensoesOrientadas` (recorte.ts) para converter. Ignorar isso faz o recorte
  cair em outro lugar da peça e falhar CALADO em toda foto de celular deitada.
- Leitura retornada pelo adapter sempre carrega: valor, confiança, vista de
  origem (`fonteFisica`: topo, frente, placa…), referência à foto e, quando
  o serviço fornecer, o bounding box da leitura (`regiaoLeitura`) — dado
  barato agora que habilita a conferência posicional futura.
- `extrair` devolve `ResultadoExtracao { leituras, achadosLivres }`: dois canais
  na MESMA resposta do serviço (zero chamada AWS a mais). Achado livre é o
  texto lido que não virou leitura de campo alvo; `cruzarAchados` (pura, em
  `conferencias/conferencia-extracao.service.ts`) o cruza contra o QR e devolve
  `achadosInconsistentes` na resposta de `executar-com-fotos`. É ALARME:
  nunca toca `vereditoGeral` nem campo, e não é persistido nesta rodada
  (alerta persistente é T4.3). Candidato é só dígito com o comprimento de um
  identificador DO PAYLOAD — comprimento hardcoded viraria spam com a próxima
  numeração de cliente.

## Contrato API ↔ Front

- O `frontend` não conhece regra de comparação nem limiar; renderiza o que a
  API responder. Se a UI precisar de um dado derivado, o dado nasce na API.
- O Next.js tem lado server (route handlers, server components), mas ele não é
  uma segunda API: regra de negócio, comparação e acesso AWS continuam no
  NestJS.
- Payload do QR é decodificado no front (leitura da câmera) mas interpretado
  na API (parser em `transformadores`) — o front não extrai campos do payload.
- **Resposta de endpoint de domínio é CLASSE com `@ApiProperty`, nunca
  interface**: o Swagger só enxerga classes, e interface some na compilação —
  a rota chega ao front com schema de resposta vazio. Regra prática: se um tipo
  aparece no retorno de um método de controller, ele é classe. As respostas dos
  endpoints do fluxo moram em `conferencias/dto/resultado-execucao*.dto.ts`,
  `conferencias/consultas/veredito-conferencia.ts`,
  `transformadores/consultas/*.ts` e `passagens/passagem-registro.service.ts`;
  as projeções repetidas (`CheckpointResumo`, `EtapaResumo`,
  `TransformadorResumo`) vivem uma única vez em
  `conferencias/dto/resumos-compartilhados.dto.ts` — nome de schema é global no
  documento OpenAPI, cópia por módulo vira schema duplicado para o front
  escolher.
- `engine/tipos.ts` é a exceção e continua SEM `@nestjs/swagger`: a engine é
  pura. As classes de resposta que espelham tipos da engine (`CampoExecutado`,
  `IncoerenciaEntreCamposResposta`, `LeituraDoGrupoResposta`) declaram
  `implements` e são checadas nos DOIS sentidos por
  `EQUIVALENCIA_COM_A_ENGINE` (resultado-execucao.dto.ts) — divergir quebra o
  build, não o contrato em silêncio.
- Documentar o que não é óbvio é parte do endpoint: `@ApiOperation({ summary })`
  em toda rota de domínio, `description` nas propriedades que carregam regra
  (precedência do veredito, união completa de `motivo`, o que NÃO é persistido,
  validade de 1 h da URL assinada) e os códigos de 422/404 por rota
  (`etapa-desconhecida`, `projeto-modelo-indeterminado`,
  `foto-evidencia-de-outra-conferencia`, `conferencia-inexistente`…).

## Convenções

- TypeScript estrito nos dois lados; named exports; DTOs com class-validator
  no padrão do boilerplate.
- Domínio em português nos nomes de entidade e campo (Conferencia,
  CampoConferido, `nao_conferivel`) — vocabulário do desafio TRAEL; termos de
  infraestrutura em inglês (port, adapter, controller).
- Testes: unit (Jest) para engine e parser — rodam sem tocar borda real;
  bordas (visão, S3, UI) verificam-se manualmente com roteiro do PLAN.
- Segredos: credenciais AWS só em `backend/.env` (fora do git); nada de
  segredo em variável `NEXT_PUBLIC_*` — todo acesso AWS passa pela API.
- **`fonteFisica` é a VISTA da peça, não a marcação** (mudança de eixo,
  2026-07-25). Valores canônicos: `base`, `topo`, `frente`, `traseira`,
  `lateral-esquerda`, `lateral-direita` (as 6 orientações do desenho), mais
  `placa` e `etiqueta` (closes: **zoom é eixo separado de orientação** — as
  duas ficam sobre uma face, mas o texto é pequeno e uma foto ampla não as lê)
  e `geral` (escape, foto de contexto sem vista definida). Por quê: é o que a
  câmera fixa enxerga em produção (uma câmera vê *a lateral direita*, nunca "o
  chumbado 2"), é como o desenho técnico se organiza, e elimina a numeração
  arbitrária `chumbado-1/2/3` — que obrigava o operador a decidir qual posição
  era a "1", sem gabarito. Efeito colateral desejado: uma vista declara MAIS DE
  UM alvo (o topo tem série chumbada e patrimônio serigrafado), então a
  ambiguidade que antes ficava escondida (foto de `chumbado-1` com um alvo só)
  agora é explícita e vira `nao_conferivel`. `serigrafia` e `chumbado-N` saíram
  do vocabulário: são PROCESSOS de marcação (tinta, relevo) que aparecem em
  vistas — eles seguem vivos no NOME do campo (`serie-chumbada-topo`,
  `patrimonio-serigrafia-frente`).
  A fonte única é a checklist do ProjetoModelo; FotoEvidencia e extração usam
  as mesmas strings (grafia divergente quebra o pareamento campo ↔ evidência).
- Nome de campo distingue posição pela VISTA, nunca por número:
  `serie-chumbada-topo`, `serie-chumbada-lateral-direita`,
  `serie-chumbada-traseira`, `patrimonio-serigrafia-topo`,
  `patrimonio-serigrafia-frente`, `cliente-serigrafia-frente`,
  `potencia-serigrafia-frente`, `serie-placa`, `patrimonio-placa`. O PREFIXO
  (`serie-`, `patrimonio-`, `cliente-`) é contrato: é por ele que
  `ORIGENS_DO_ESPERADO` acha o valor esperado no QR (`potencia-*` fica de fora
  de propósito — a potência não vem do QR).
- Identificadores estáveis: gates e regras casam por `codigo` (Checkpoint,
  ProjetoModelo), nunca por nome exibido nem por `ordem` — nome e ordem mudam.
- Boilerplate traz auth/i18n que não usamos nesta rodada: não gastar tempo
  removendo, apenas não usar.

## Nunca fazer

- Nunca calcular ou "corrigir" veredito no front — regra de ouro; o front
  exibe o que a API decidiu.
- Nunca rebaixar campo ilegível ou de baixa confiança para `conforme` — o
  falso OK é a dor central do desafio (NC chegando ao cliente).
- Nunca persistir leitura de visão sem confiança e sem referência à
  foto-evidência — sem lastro, a conferência não é auditável.
- Nunca commitar credencial AWS nem expô-la ao front (`NEXT_PUBLIC_*` ou
  bundle) — segredo vive em `backend/.env`; vazamento queima os USD 500 de
  créditos e a conta.
- Nunca chamar SDK AWS fora de `extracao`/`evidencias` — a troca
  Textract ↔ Bedrock e os testes com mock dependem dessa fronteira.
- Nunca inventar valor esperado que não veio do payload do QR — fonte da
  verdade única nesta rodada (SPEC, constraint 5).

## Gaps conhecidos

Dívidas deliberadas confirmadas na auditoria de 2026-07-25, aceitas pelo prazo
do hackathon:

1. CRUD do domínio sem RolesGuard — qualquer JWT edita/deleta; paliativo:
   ambiente de demo com admin seed único. Revisar antes de expor fora da rede
   local.
2. Hard delete com FKs `NO ACTION` — deletar pai com filhos estoura 500;
   paliativo: a UI não expõe delete. Trilha de auditoria pedirá soft delete na
   rodada de produção.
3. Eager loading em cascata nas relações geradas — payloads grandes e joins
   duplicados; aceitável no volume da demo, e os endpoints das Fases 3–4
   selecionam o que expõem.
4. Listagens sem filtro por relação — PARCIALMENTE RESOLVIDO (2026-07-25):
   `GET /transformadores?numeroSerie=&pedido=`, as duas consultas por relação
   (`GET /transformadores/:id/passagens`, `GET /transformadores/:id/conferencias`)
   e a releitura do veredito (`GET /conferencias/:id/campos`) existem e
   recortam o payload. O que segue global é a paginação das demais listagens
   geradas (conferências, campos conferidos, fotos, passagens) — sem dono na
   demo, porque as telas leem sempre pela peça.
5. `checklist` como varchar validado só por `@IsString` — vira jsonb com
   validação estruturada quando a ingestão de projeto (Fase 6) existir; até
   lá, a única escrita é o seed.
6. `Record not found` genérico vira 500 nos updates (default do boilerplate) —
   tratar quando os endpoints de domínio forem escritos (T1.3+).
7. Paginação (page/limit/teto 50) literal e duplicada nos 7 controllers —
   default do gerador; unificar só se doer.
8. `cliente` como string livre — decisão em aberto no SPEC (vira entidade na
   rodada ERP).
9. Execução da conferência não é transacional — falha no meio do loop de
   campos deixa conferência com veredito geral e campos parciais; janela
   pequena, aceito no prazo (revisão R1). Transação entra com o hardening
   pós-demo.
10. `confianca` forjável — RESOLVIDO no caminho principal (2026-07-25):
    `POST /conferencias/executar-com-fotos` carimba confiança e evidência
    server-side (extração plugada). O `/executar` com leituras digitadas
    permanece (modo avançado do /demo e testes sem AWS) e nele a confiança
    segue vindo do cliente — aceito enquanto a rota existir; some com o gap
    13 (remoção do /demo).
11. RESOLVIDO (2026-07-25): a conferência parcial por etapa existe — cada item
    da checklist diz sua `etapa`, e `POST /conferencias/executar` com
    `etapaCodigo` recorta a checklist (cumulativo). O comportamento antigo
    (checklist inteira) permanece quando a request não manda etapa.
12. Chaves AWS vivem nas variáveis do serviço App Runner porque o boilerplate
    valida `ACCESS_KEY_ID`/`SECRET_ACCESS_KEY` quando `FILE_DRIVER=s3`
    (files/config/file.config.ts). A instance role existe e já serve
    Textract/Bedrock; migrar o S3 para ela exige tornar as credenciais
    opcionais no boilerplate (4 arquivos).
13. Página `/demo` (src/demo) é ferramenta temporária de inspeção servida pela
    API, com credenciais do admin seed pré-preenchidas no HTML servido SEM
    auth — na prática, um clique dá JWT de admin a qualquer visitante da URL
    pública. Com o registro público fechado (rodada de análise), esta é a
    ÚNICA porta de entrada que resta, então ela é a fechadura principal.
    Decisão do time em 2026-07-25: manter até a demo (o fluxo de teste no
    celular depende dela) e **remover o `DemoModule` do `app.module.ts` logo
    após a apresentação** — prazo, não intenção vaga.
14. Conferência parcial persiste `vereditoGeral` sem marca de cobertura: a
    resposta diz `etapaAvaliada`/`camposAvaliados`, mas a linha gravada em
    `conferencia` não distingue "conforme na peça inteira" de "conforme no
    gate da adesivação" (3 chumbados, placa jamais conferida). Consequência:
    "última conferência conforme" NÃO é atestado de peça completa — T4.3
    (alerta) e T5.1 (dashboard) precisam ler a etapa junto do veredito.
    Persistir a cobertura (flag de conferência completa, ou contagem de campos
    do recorte × total da checklist) fica para a Fase 4.
15. `Checkpoint.ordem` sem unique e editável pelo CRUD — e a semântica
    cumulativa do recorte depende inteiramente dela: remanejar a ordem
    reescreve, retroativamente, o que cada gate confere (e duas etapas com a
    mesma ordem tornam o recorte ambíguo). Paliativo: as ordens vêm de seed
    fixo e a UI não expõe edição de checkpoint. Unique em `ordem` + política de
    reordenação (renumerar em transação, ou ordem imutável com posição
    derivada) ficam para a rodada de produção.
16. Adulteração autenticada segue possível no CRUD gerado (é o gap 1 em
    detalhe, medido na auditoria de superfície de 2026-07-25): `PATCH
    /transformadores/:id` reescreve numeroSerie/patrimônio (a identidade
    esperada) DEPOIS de a conferência existir; `PATCH /conferencias/:id`
    repõe transformador/checkpoint e sobrescreve `observacao` (o aceite de
    exceção auditável); `PATCH`/`DELETE` de `fotos-evidencia` troca ou some
    com a evidência de um veredito emitido. Não corrigido de propósito: a
    correção honesta é RolesGuard + soft delete, trabalho de pós-demo.
    Fechado o que quebrava a demo ou produzia falso OK (checklist do
    ProjetoModelo, DELETE de campo conferido, registro público). O que
    protege o resto é credencial controlada — ver gap 13.
17. Sem rate limit em `/auth/email/login` (bcrypt online sem freio) e CORS
    com origem `*` (default `cors: true` do boilerplate). Mitigado pelo
    escopo de demo: token vive em memória na `/demo` (sem cookie nem
    localStorage), então a origem permissiva não é exfiltrável. Throttler +
    origem explícita entram no hardening pós-demo.
18. RDS público com security group `0.0.0.0/0` em TODO protocolo (o
    `default` da VPC; a instância precede o projeto). A senha é a única
    proteção do banco na internet. Decisão do time em 2026-07-25: aceito
    até a demo para não arriscar a conectividade do App Runner na véspera.
    Correção definitiva: VPC connector no App Runner + SG restrito à VPC,
    e rotação da senha (ela transitou por logs de deploy). Receita e custo
    em docs/deploy.md.
19. "Esta marcação é relevo?" é DEDUZIDO do nome do campo (`chumbad*` /
    `relevo`, em `extracao/ports/marcacao.ts`) porque a checklist não declara
    tipo de marcação (é o gap 5 batendo de novo). Falha segura nos dois
    sentidos — nome fora do padrão devolve o comportamento anterior; falso
    positivo custa 2 releituras e um `nao_conferivel` a mais. Sai quando o item
    da checklist ganhar `tipoMarcacao` (jsonb validado ou Fase 6).
20. Item (iii) da regra de corroboração usa a definição de irmão da coerência
    (mesmo valor esperado), que inclui a PLACA: peça com as 3 chumbadas
    gravadas erradas e placa certa sai `nao_conferivel` nas três, não
    `divergente`. Continua barrada; perde-se só a força da mensagem. O refino
    (agrupar por tipo de marcação) depende do gap 19.
21. A corroboração por recorte ainda NÃO foi medida contra o Textract real
    dentro da API — esta rodada verificou o mecanismo com dublê do serviço +
    imagem real e o cenário-âncora ponta a ponta pelo endpoint de leituras
    digitadas. Antes da demo, rodar uma conferência com fotos reais e
    `EXTRACTOR_DRIVER=textract` e conferir no log as linhas `chamada-de-visao:
    recorte` (se o bounding box e a orientação EXIF não casarem, o efeito é
    tudo `nao-confirmada`, nunca leitura errada aceita).
22. O PORQUÊ do veredito não sobrevive à releitura: `CampoConferido` persiste
    valor, confiança, veredito, região e foto — mas NÃO o `motivo`
    (`MotivoCampo`: `sem-leitura`, `confianca-abaixo-do-limiar`,
    `leituras-conflitantes`, `leitura-de-outro-campo`,
    `leitura-nao-corroborada`), nem as `incoerencias` entre campos irmãos, nem
    os `achadosInconsistentes` da extração. Tudo isso só existe na resposta do
    POST; `GET /conferencias/:id/campos` devolve o veredito sem a explicação.
    Custa caro justamente onde mais importa: os três motivos novos distinguem
    "reenquadre a foto" de "a peça está gravada errada", e o operador que abrir
    a conferência pelo histórico vê só `nao_conferivel`. O efeito das
    incoerências sobre o `vereditoGeral` ESTÁ gravado — o detalhe é que é
    efêmero. Correção: coluna `motivo` em `campo_conferido` (pelos generators)
    e persistir incoerência como alerta na T4.3; não entrou nesta rodada para
    não inventar dado que o banco não tem.
    `fonteFisica`/`obrigatorio` também não são persistidos, mas esses a
    releitura RE-RESOLVE da checklist do ProjetoModelo da peça (e devolve
    `null` se a peça não tiver projeto ou a checklist estiver ilegível).

## Decisões em aberto

- [x] **Política para campo parcialmente legível** — resolvido: rejeitar
      sempre, com limiar 0.9 medido na peça real; nada de similaridade
      aproximada. Leitura fraca vira `nao_conferivel` e vai para o olho
      humano com a foto (rodada nomes-e-analise, 2026-07-25).
- [ ] **Formato do payload do QR** — campos embutidos ou código de lookup
      (afeta T1.1, T3.1).
- [x] **Textract vs Bedrock** — resolvido: Textract (spike T2.1 com fotos
      reais, docs/visao-ocr.md). `EXTRACTOR_DRIVER=textract`. Reavaliado na
      noite de 2026-07-25, quando a conta destravou o Bedrock: os modelos Nova
      ALUCINARAM número plausível onde o Textract devolveu null (um deles
      inventou o patrimônio como o número de série real da peça — falso OK em
      potencial) e não dão confiança calibrada. Bedrock fica FORA da leitura
      numérica por medição, não por bloqueio; segue candidato só ao check
      qualitativo de layout.
- [x] **Framework do front** — resolvido: Next.js 16; scaffold já subido pelo
      time venceu o Angular combinado na entrevista (2026-07-25).
- [ ] **Cliente da demo: `frontend/` (Next) × `mobile/` (Expo)** — o time
      subiu um app Expo em paralelo ao Next; os dois estão no repositório e
      nenhum implementa o fluxo ainda. Decidir antes da T3.1, porque é ela que
      escolhe onde a câmera e o `?etapa=` são implementados.
