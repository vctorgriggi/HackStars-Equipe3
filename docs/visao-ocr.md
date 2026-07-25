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

## Custo medido

9 chamadas `detect-document-text` (7 fotos + repetições) ≈ USD 0,015. O OCR
não é o custo relevante do projeto.
