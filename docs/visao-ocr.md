# Visão/OCR — resultado do spike T2.1

> Medição real do Textract nas fotos da peça de demonstração, e a decisão que
> ela sustenta. Fonte: execução em 2026-07-25 na conta do time (us-east-1),
> fotos em `fotos-demo/`. Atualizar se a decisão mudar ou se novas fotos
> mudarem o quadro.

## Decisão

**Textract resolve o MVP inteiro, inclusive a série chumbada.** Bedrock deixa
de ser pré-requisito e, depois de medido (seção "Bedrock reavaliado", no fim
deste arquivo), fica **FORA do caminho de leitura numérica**: alucinou número
plausível onde o Textract admitiu não ter lido, e LLM não devolve confiança
calibrada. Sobra para ele o check qualitativo de layout (Could do SPEC). O
adapter continua no código, atrás da mesma porta — trocar é mudar
`EXTRACTOR_DRIVER` —, mas trocar para `bedrock` numa conferência de verdade é
abrir a porta do falso OK.

Isso desfaz a premissa da constraint 2 do SPEC (relevo de baixo contraste
derrubaria OCR clássico): com luz de topo e enquadramento decente, o Textract
leu o relevo com confiança alta.

## Medição por fonte física

| Foto | Fonte física | Leitura | Confiança |
| --- | --- | --- | --- |
| `placa.jpeg` | placa | **847833** (a série errada da peça) | 99,8% |
| `superior.jpeg` | chumbado (topo) | **847233** | 99,9% |
| `superior.jpeg` | serigrafia | 251328 (junto de "10 kVA") | 97,4% |
| `frente.jpeg` | serigrafia | 251328 · "energisa" | 99,3% · 99,7% |
| `lateral.jpeg` | chumbado (lateral) | 847233 | 85,8% |
| `lateral.jpeg` | placa (na mesma foto) | 847833 | 93,1% |
| `etiqueta.jpeg` | etiqueta (fonte da verdade) | 847233 · 251328 · "143091 - Energisa Rondônia" | 100% · 99,8% · 98,3% |
| `inferior.jpeg` | serigrafia parcial | "energisa" | 98,8% |
| `lateral-direita-superior.jpeg` | — | nada relevante (enquadramento) | — |

## O que isso significa para a demo

O cenário-âncora é reproduzível **com fotos reais**: `placa.jpeg` entrega
847833 e `superior.jpeg` entrega 847233 — a engine acusa `divergente` só em
`serie-placa`, exatamente como no teste. Não é simulação.

## Aprendizados operacionais

- **Enquadramento importa mais que resolução.** A foto que não rendeu nada
  (`lateral-direita-superior`) tem qualidade igual às outras; o problema é o
  que está no quadro.
- **Fotos > 2600 px no lado maior**: redimensionar antes de enviar. O envio
  inline (base64) do `detect-document-text` falhou com o arquivo original de
  1,7 MB e passou depois do downscale — além de gastar menos token/tempo.
- **O relevo lê melhor de cima** (`superior`, 99,9%) do que de lado
  (`lateral`, 85,8%): a luz ambiente do teto cria a sombra que define o
  dígito. Em produção, isso vira posicionamento de luminária no gate.
- **Uma foto pode conter duas marcações** (`lateral` traz placa, chumbado e
  etiqueta juntos). A heurística do adapter precisa dos campos alvo por foto —
  é o que o `ExtracaoService` já faz ao filtrar a checklist pela `fonteFisica`
  da foto. Este aprendizado é uma das origens da troca de eixo de
  `fonteFisica` (2026-07-25): ela passou a ser a VISTA da peça, e uma vista
  declara todos os alvos que moram nela — a ambiguidade fica explícita.
- **Ambiguidade numérica é real**: em `lateral`, o Textract juntou linhas
  ("TRANSFORMADOR 847833 ORMADOR MONOFÁSICO"). Confirma a decisão do adapter
  de devolver `null` quando não há rótulo que desambigue, em vez de chutar.

## QR da etiqueta

Não decodificou por software a partir de `etiqueta.jpeg` (ângulo/resolução);
o texto impresso ao lado do QR é legível e confirma os campos: Pedido 68202 ·
Série 847233 · Seq 86 · Patrimônio 251328 · Cliente 143091 - Energisa
Rondônia · TPD-408136. **A decisão em aberto do formato do payload continua
aberta** — resolve com uma foto do QR de perto e reto, ou lendo pelo celular
na T3.1.

## Rodada 2 — cobertura 360° contra a checklist do modelo

Segundo conjunto de fotos (volta completa na peça, 6 fotos), para responder:
o Textract acha TODAS as marcações que o desenho EPT-163-PI-676 exige, e nas
quantidades certas? Sim — inventário medido:

| Marcação do desenho | Quantas o desenho pede | Encontradas | Melhor confiança |
| --- | --- | --- | --- |
| Série chumbada (relevo) | 3 posições | **3** (topo, lateral, junto à placa) | 99,3% · 96,7% · 92,1% |
| Patrimônio serigrafado | 2 (topo e lateral) | **2** | 100% (lateral) · 98,5% (topo) |
| Potência serigrafada | 2 ("10 kVA" topo, "1H - 10 kVA" lateral) | **2** | 98,5% · 88,9% |
| Cliente ("energisa") | 1 lateral | 1 | 99,7% |
| "OPERAR SEM TENSÃO" | 1 | 1 | 99,9% |
| Marca "TRAEL G-XX/XX" | 1 | 1 (parcial: "TRAEL G") | 88,1% |
| Simbologia AL (azul) | 1 | 1 | 92,5% |
| Simbologia V / vegetal (azul) | 1 | **0** na serigrafia (só o "VEGETAL" da placa) | — |
| Série da placa | 1 | 1 — **847833**, a divergente | 98,7% |
| Etiqueta (fonte da verdade) | 1 | 1 (série, pedido, seq, patrimônio, cliente, TPD) | 97–100% |

### O que isso valida

1. **A conferência por quantidade é viável**: "o desenho pede 3 chumbados e 2
   patrimônios" é verificável — as 3 leituras de série chumbada vieram de
   fotos diferentes, e os 2 patrimônios de faces diferentes. Isso sustenta a
   checklist por modelo: outro projeto pede outras marcações/quantidades e a
   engine cobra exatamente essas.
2. **O limiar de confiança prova seu valor no caso real**: numa das fotos o
   mesmo chumbado foi lido como `347233` com **35,4%** de confiança (o 8 virou
   3 na sombra). Com o limiar (0,8 na época, 0,9 hoje) isso vira
   `nao_conferivel` — nunca um
   `divergente` falso que mandaria peça boa para retrabalho.
3. **Redundância entre fotos resolve leitura ruim**: a mesma marcação lida mal
   numa foto sai bem em outra (chumbado: 35% numa, 99,3% na de cima). O dedup
   por campo já implementado fica com a melhor leitura.
4. **Símbolos azuis (AL/V) são o limite do OCR**: "AL" saiu a 92,5%, mas o "V"
   (vegetal) não. Simbologia é forma, não texto — é caso para o check
   qualitativo de layout (Could, via visão multimodal), não para OCR.

### Refinamento sugerido para a checklist do modelo — APLICADO em 2026-07-25

O seed tinha `patrimonio-serigrafia` (um só). O desenho pede patrimônio em DUAS
faces, e "faltou o patrimônio de uma delas" é não conformidade real que passava
despercebida. Com a troca de eixo de `fonteFisica` (marcação → VISTA da peça), o
item foi desdobrado em `patrimonio-serigrafia-topo` e
`patrimonio-serigrafia-frente`, e as três séries chumbadas passaram a
`serie-chumbada-topo`, `serie-chumbada-lateral-direita` e
`serie-chumbada-traseira`. As vistas do seed saíram DESTA medição, não do
desenho — confirmar face a face com a TRAEL (decisão em aberto no SPEC).

## Custo medido

15 chamadas `detect-document-text` (dois conjuntos de fotos) ≈ USD 0,023. O OCR
não é o custo relevante do projeto.

## Rodada de validação com a peça inteira (2026-07-25, noite)

Cinco fotos reais (3 chumbados, serigrafia, placa) pela API no ar, com
`EXTRACTOR_DRIVER=textract`. É a primeira medição do fluxo COMPLETO, não do
spike isolado.

Nomes de campo como estavam na época (`serie-chumbada-1..3`,
`patrimonio-serigrafia`); a vista medida está entre parênteses, e é dela que
saíram os nomes atuais.

| Campo | Leitura | Confiança | Veredito |
| --- | --- | --- | --- |
| serie-chumbada-1 (topo) | 847233 | 98,8% | conforme |
| serie-chumbada-2 (lateral direita) | **847833** | **84,6%** | erro de dígito |
| serie-chumbada-3 (diagonal traseira) | — | — | sem leitura |
| serie-placa | 847833 | 99,9% | divergente (defeito real) |
| patrimonio-placa | — | — | sem leitura |
| patrimonio-serigrafia (frente) | 251328 | 98,4% | conforme |
| cliente-serigrafia (frente) | energisa | 99,7% | conforme |

> CORREÇÃO (rodada do contraste, 2026-07-26): o `847833 @ 84,6%` da linha
> `serie-chumbada-2` **não era erro de dígito**. É o número da PLACA, lido
> muito bem numa foto que pegava tanque, etiqueta e placa juntos, e entregue no
> campo errado pela regra da contagem. Medição e correção no fim do arquivo.

> ATUALIZAÇÃO (rodada dos recortes, mais abaixo): o limiar sozinho **não**
> resolve o relevo — na faixa de 84% convivem leitura certa e errada. O 0.9
> continua valendo como piso; o que separa os dois casos é a corroboração por
> recorte.

### O limiar 0.9 saiu daqui

As leituras corretas ficaram entre **98,4% e 99,9%**; o único erro de dígito
(2 lido como 8, foto lateral do chumbado) veio a **84,6%** — dentro do limiar
antigo de 0,8, onde virava um `divergente` FALSO e quebrava o critério 2 do
SPEC ("o único campo divergente é a série da placa"). Com 0,9 ele vira
`nao_conferivel`. Os dois grupos se separam limpo; não há leitura correta
entre 84,6% e 98,4% em nenhuma medição até aqui.

### Troca de campo entre marcações da mesma face

Teste no celular expôs um modo de falha que as fotos de arquivo não mostravam:
fotografando só a tampa, o Textract lê o **patrimônio serigrafado** (tinta
preta, alto contraste) e NÃO lê a **série chumbada** (relevo da cor do
tanque). Sobra um número só, e a heurística "1 número livre + 1 campo
pendente" o casa com o campo pedido — acusando `divergente` numa peça
correta.

Mitigação implementada: leitura que bate exatamente com o valor esperado de
OUTRO campo vira `nao_conferivel` (`leitura-de-outro-campo`). A correção
definitiva é física e **foi feita em 2026-07-26** — ver "Rodada do contraste",
no fim deste arquivo.

## Rodada dos recortes (2026-07-25): a confiança do relevo mede enquadramento

Medição que desmonta a leitura otimista das rodadas anteriores. Nas séries
CHUMBADAS (relevo metálico da cor do tanque), **a confiança do Textract não
mede correção — mede enquadramento**:

| Evidência | Número |
| --- | --- |
| Mesma foto, mesmo valor CORRETO, só mudando a margem do recorte | confiança de **37,3% a 95,5%** (58 pontos) |
| Valor certo × valor errado, na mesma faixa | `847233 @ 84,3%` (certo) × `847833 @ 84,6%` (errado) |

**Nenhum limiar separa essa faixa.** Subir o limiar não resolve: só troca
`divergente` falso por `nao_conferivel` em massa. O que falta não é um número
melhor, é uma **segunda evidência**.

### O que o spike reprovou (não repetir)

| Tentativa | Resultado medido |
| --- | --- |
| Consenso entre MOTORES diferentes (Bedrock ao lado do Textract) | os LLMs erram com certeza alta — Nova Lite, 4 erros em 4 |
| AMPLIAR o recorte (upscale 4×) | quebrou até foto que lia a 99%: perdeu o dígito inicial e reportou 93,7% |
| Pré-processamento de pixel (grayscale, CLAHE, sharpen) | baixou tudo; grayscale puro transformou um `8` em `9` |

### O que o spike aprovou

**Recortar na resolução NATIVA e reler**: 41,0% → 91,4% (margem 15%) e 95,5%
(margem 150%); acertou o valor em 3/3 fotos de controle e **nunca mudou um
valor que já estava correto**. Custo: 3 leituras Textract por foto = **USD
0,0225 por conferência** (~22 mil conferências nos créditos). Custo não é
restrição.

### O que virou código

1. **Consenso de recortes** (`extracao/adapters/textract.extractor.ts` +
   `adapters/recorte.ts`): leitura de marcação em relevo é relida em dois
   recortes do buffer ORIGINAL (margens 50% e 150%, sem ampliar, sem filtro),
   ancorados no próprio bounding box. Aceita o valor só se os três textos
   coincidirem; a confiança final é a MENOR das três. Recorte que lê OUTRO
   número anula a leitura (nunca se elege vencedora); recorte que não lê nada
   ali só deixa a leitura sem corroboração.
2. **Regra "antes de acusar, confirme"** (`conferencias/engine/corroboracao.ts`):
   marcação em relevo não vira `divergente` a partir de uma leitura sozinha —
   exige recortes concordantes, confiança ≥ limiar e nenhuma posição irmã tendo
   lido valor diferente. Falhando, sai `nao_conferivel` com motivo
   `leitura-nao-corroborada`. A peça continua barrada; muda a mensagem, de
   "peça defeituosa" para "não posso afirmar, confira a foto".

**A placa segue sendo acusada**: é texto IMPRESSO, lê a 99,9% e não passa por
nenhuma das duas regras — o critério 2 do SPEC (o único campo divergente é a
série da placa) continua valendo, e está fixado em teste.

O que ainda NÃO foi medido: o efeito dos recortes contra o Textract real
dentro da API (esta rodada verificou o mecanismo com dublê do serviço e imagem
real, mais o cenário-âncora ponta a ponta pelo endpoint de leituras
digitadas). A medição com AWS é a próxima passada com as fotos da peça.

## Bedrock reavaliado (2026-07-25): reprovado para leitura numérica

A conta destravou o Bedrock, mas só os modelos **Amazon Nova** (os Claude 3
estão bloqueados como "legacy" por desuso da conta). Medição com prompt
explícito de "responda null se não conseguir ler":

| Foto | Gabarito | Nova Lite | Nova Pro | Textract |
| --- | --- | --- | --- | --- |
| Placa | série 847833 | 847833 / patrimônio **"847233"** | 847833 / null | 847833 @ 99,9% / null |
| Topo | chumbado 847233 | 847233 / patrimônio **"251328"** | **campos trocados** | 847233 @ 98,8% |
| Lateral | chumbado 847233 | "84725" / "8802" | "847253" | 847833 @ 84,6% |

O caso decisivo é o primeiro: o Nova Lite **inventou** o patrimônio como
`847233` — que é o número de série real da peça. Não é ruído aleatório, é um
número plausível e existente na peça, colocado no campo errado. Se o
patrimônio do QR fosse esse, o sistema teria emitido **`conforme` para uma
peça defeituosa** — o falso OK, o bug mais caro do domínio, produzido por
alucinação. O Textract, na mesma foto, devolveu null.

Some-se a isso o problema estrutural: **LLM não devolve confiança
calibrada**, e a regra de ouro exige confiança por leitura para aplicar
limiar.

**Conclusão**: Bedrock fica FORA do caminho de leitura numérica — não por
bloqueio de conta (que caiu), mas por medição. Onde ele continua fazendo
sentido é o check qualitativo de layout (Could do SPEC): "as marcações
esperadas estão presentes e na disposição do projeto?" — pergunta em que
alucinação pesa menos e para a qual não há concorrente OCR.

## Adendo (2026-07-26): modelos Claude leem relevo — quando recebem o recorte

A medição anterior foi **injusta com os LLMs** e o registro precisa dizer isso.
Naquela rodada as imagens foram enviadas inteiras (4096×2304), e nelas o
chumbado ocupa ~85×51 px. Modelos de visão reduzem a imagem antes de
processar, então o número virava ~30 px e sumia — as abstenções (`null`) não
mediam incapacidade de leitura, mediam resolução. O Textract não sofre disso
porque processa em resolução de OCR.

Refeito o teste com o MESMO recorte que a corroboração usa (a conta liberou os
modelos Claude atuais; antes só respondiam Nova e Pixtral):

| Foto | Textract + recorte | Haiku 4.5 | Sonnet 4.5 | Opus 4.5 |
| --- | --- | --- | --- | --- |
| TOPO-2 (fácil) | **847233 @ 98,8%** | `847283` ✗ | `847288` ✗ | **847233** ✓ |
| LATERAL-DIREITA-2 (difícil) | **847233 @ 94,5%** | **847233** ✓ | `847293` ✗ | `null` |

**Conclusão revista.** Não é que "Bedrock não lê": os modelos Claude leem
relevo quando enxergam o recorte — o Haiku acertou justamente a foto difícil,
a mesma que na imagem inteira dava 41% no Textract. O que os desqualifica para
o caminho de leitura é outra coisa:

1. **Inconsistência** — cada modelo acertou uma foto e errou a outra; nenhum
   foi confiável nas duas.
2. **Formato do erro** — todos os erros são de um dígito (`847283`, `847288`,
   `847293`): plausíveis, indistinguíveis de leitura boa sem gabarito.
3. **Ausência de confiança calibrada** — a engine precisa de um score para
   aplicar limiar, e LLM não fornece.
4. **O recorte é que consertou a leitura**, não a troca de motor: o Textract
   com recorte acertou as duas.

Fica registrado o que seria a próxima investigação, se houvesse tempo: os
erros dos modelos são **descorrelacionados** (Haiku acertou onde o Opus
falhou e vice-versa), que é justamente a propriedade que faria uma votação
funcionar. Com duas fotos de amostra não dá para afirmar nada — é pesquisa,
não decisão de rodada.

## Rodada do contraste (2026-07-26): discriminar tinta de relevo por pixel

A rodada anterior deixou uma dívida nomeada — "discriminar tinta de relevo pelo
contraste dentro do `regiaoLeitura` que já persistimos". Foi feita, e resolveu
mais do que o previsto.

### O gargalo

A vista `topo` declara DUAS marcações: `serie-chumbada-topo` (relevo) e
`patrimonio-serigrafia-topo` (tinta preta). Quando o Textract achava um número
só, a heurística se recusava a adivinhar e devolvia os **dois** campos nulos.
A recusa é correta — antes dela o patrimônio em tinta era casado com o campo da
série chumbada e acusava peça correta —, mas custava um dos 3 irmãos da série e
um dos 2 patrimônios: exatamente o que a demo precisa mostrar.

### A métrica

Recorta-se a região do bounding box (que o Textract já devolve) e mede-se a
luminância dela contra a de um **anel** de 1,0 altura da caixa em cada lado:

- `escuridao = (anel.p50 − dentro.p10) / 255` — quanto o traço mais escuro está
  abaixo do fundo imediato. Tinta preta sobre o tanque dispara;
- `claridade = (dentro.p90 − anel.p50) / 255` — quanto o traço mais claro está
  acima do fundo. Texto branco sobre placa preta dispara;
- `desvio` da região — textura. Separa relevo (tem sombra) de região chapada.

O anel é o que torna a medida invariante à iluminação: luminância absoluta não
diz nada, a mesma tinta sai a 40 na sombra e a 120 no sol.

### Calibração com as fotos reais (`fotos-demo/`)

`npx ts-node -r tsconfig-paths/register scripts/spike-contraste.ts <dir-fotos>`
reexecuta e reimprime esta tabela.

| Foto | Marcação | escuridão | claridade | desvio | px |
| --- | --- | --- | --- | --- | --- |
| TOPO-2 | 847233 chumbado (**relevo**) | 0,114 | 0,122 | 23,1 | 28560 |
| DIAGONAL-TRAS-DIR-2 | 847233 chumbado (**relevo**) | 0,059 | 0,047 | 11,3 | 6930 |
| LATERAL-DIREITA-2 | 847233 chumbado (**relevo**) | 0,031 | 0,075 | 12,6 | 4698 |
| FRENTE-2 | 251328 serigrafia (**tinta**) | 0,608 | 0,008 | 68,0 | 135339 |
| ETIQUETA-1 | 847233 etiqueta (**tinta**) | 0,600 | 0,047 | 57,0 | 64293 |
| TOPO-2 | "10 kVA 251328" (**tinta**) | 0,588 | 0,035 | 55,8 | 445047 |
| LATERAL-DIREITA-2 | 847233 etiqueta (**tinta**) | 0,502 | 0,055 | 55,7 | 533 |
| PLACA-4 | 847833 placa (**claro/escuro**) | 0,051 | 0,722 | 79,5 | 10800 |
| DIAGONAL-TRAS-DIR-2 | 847833 placa (**claro/escuro**) | 0,035 | 0,510 | 53,8 | 594 |
| LATERAL-DIREITA-2 | 847833 placa (**claro/escuro**) | 0,043 | 0,290 | 32,2 | 851 |

**As classes não se tocam.** Escuridão: relevo até 0,114, tinta a partir de
0,502 (4,4×). Claridade: relevo até 0,122, claro a partir de 0,290 (2,4×).
Textura: região chapada 1,3, relevo a partir de 11,3 (8,7×).

Limiares escolhidos, dentro dos vazios e com faixa morta declarada:
`escuridao ≥ 0,30` → tinta; `claridade ≥ 0,22` → claro-sobre-escuro; ambos
abaixo de 0,20/0,18 **e** desvio ≥ 5,0 → relevo; qualquer outra coisa →
`indeterminado`.

**A PLACA é um terceiro caso, não "tinta".** Texto claro sobre fundo preto tem
claridade alta e escuridão baixa. Sem classe própria para ela, o `847833` da
placa que aparece de relance numa foto de vista seria confundido com serigrafia
sobre metal — e é justamente ele que a peça de demo tem errado.

### O que mudou nas leituras (Textract real, 5 vistas)

| Campo | Antes | Depois |
| --- | --- | --- |
| serie-chumbada-topo | sem leitura | **847233** @ 98,4% · confirmada |
| serie-chumbada-lateral-direita | **847833** @ 84,6% (número da PLACA) | **847233** @ 58,3% · confirmada |
| serie-chumbada-traseira | sem leitura | **847233** @ 97,7% · confirmada |
| patrimonio-serigrafia-topo | sem leitura | **251328** @ 98,5% |
| serie-placa | 847833 @ 99,9% | 847833 @ 99,9% (cenário-âncora intacto) |
| patrimonio-serigrafia-frente | 251328 @ 98,4% | 251328 @ 98,4% |
| patrimonio-placa | sem leitura | sem leitura |

As **3 séries chumbadas** passam a ler, todas com o valor certo e corroboradas
por recorte. A linha da lateral é a mais importante: ela não estava "sem
leitura", estava **com a leitura errada** — o `847833` da placa entregue como
série chumbada da lateral, uma acusação falsa em peça correta. A confiança de
84,6% que a rodada anterior atribuiu a "erro de dígito no relevo" era, na
verdade, o Textract lendo a placa muito bem.

### Dois achados de tabela

1. **O Textract junta marcações vizinhas numa linha só.** Em TOPO-2 a
   serigrafia saiu como `"10 kVA 251328"`. A regra antiga ("ou a linha é só o
   número, ou tem rótulo conhecido") descartava a linha inteira, e o patrimônio
   do topo era invisível. Agora um número que é **token inteiro** dentro de
   texto entra como candidato FRACO — reivindicável só por contraste, nunca
   pela contagem. `TPD-408136` continua fora: ali o número está *dentro* de um
   código, não é um número por si.
2. **Bug de coordenada EXIF, silencioso, que já custava a corroboração.**
   `sharp(buf, { autoOrient: true }).metadata()` devolve as dimensões CRUAS, não
   as de depois da rotação (sharp 0.35.3). Em `PLACA-4.jpg` (orientation 6) a
   metadata dizia 4096×2304 enquanto o pipeline recortava 2304×4096 — o
   `extract` estourava ou caía numa região vazia. O Textract, esse, **respeita
   o EXIF**: verificado recortando o bounding box de `847833` nos dois
   referenciais (no cru sai um borrão, no orientado sai o número legível).
   Corrigido em `recorte.ts` (`dimensoesOrientadas`).

### Custo

Zero chamada AWS a mais: a classificação é aritmética sobre bytes que já estão
na memória, e o teto de 3 chamadas de visão por foto (constraint 4 do SPEC)
não mudou.
