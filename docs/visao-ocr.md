# Visão/OCR — resultado do spike T2.1

> Medição real do Textract nas fotos da peça de demonstração, e a decisão que
> ela sustenta. Fonte: execução em 2026-07-25 na conta do time (us-east-1),
> fotos em `fotos-demo/`. Atualizar se a decisão mudar ou se novas fotos
> mudarem o quadro.

## Decisão

**Textract resolve o MVP inteiro, inclusive a série chumbada.** Bedrock deixa
de ser pré-requisito e vira reforço opcional para foto ruim (o adapter
continua no código, atrás da mesma porta — trocar é mudar `EXTRACTOR_DRIVER`).

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
- **Uma foto pode conter duas fontes físicas** (`lateral` traz placa,
  chumbado e etiqueta juntos). A heurística do adapter precisa dos campos
  alvo por foto — é o que o `ExtracaoService` já faz ao filtrar a checklist
  pela `fonteFisica` da foto.
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
   3 na sombra). Com o limiar em 0,8 isso vira `nao_conferivel` — nunca um
   `divergente` falso que mandaria peça boa para retrabalho.
3. **Redundância entre fotos resolve leitura ruim**: a mesma marcação lida mal
   numa foto sai bem em outra (chumbado: 35% numa, 99,3% na de cima). O dedup
   por campo já implementado fica com a melhor leitura.
4. **Símbolos azuis (AL/V) são o limite do OCR**: "AL" saiu a 92,5%, mas o "V"
   (vegetal) não. Simbologia é forma, não texto — é caso para o check
   qualitativo de layout (Could, via visão multimodal), não para OCR.

### Refinamento sugerido para a checklist do modelo

O seed hoje tem `patrimonio-serigrafia` (um). O desenho pede patrimônio em
DUAS faces — vale desdobrar em `patrimonio-serigrafia-topo` e
`patrimonio-serigrafia-lateral` quando a checklist for revisada com a TRAEL,
porque "faltou o patrimônio da lateral" é uma não conformidade real que hoje
passaria despercebida.

## Custo medido

15 chamadas `detect-document-text` (dois conjuntos de fotos) ≈ USD 0,023. O OCR
não é o custo relevante do projeto.
