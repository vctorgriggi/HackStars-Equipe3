/**
 * PÁGINA DE DEMONSTRAÇÃO TEMPORÁRIA — ver demo.controller.ts.
 *
 * Uma única template string: HTML + CSS + JS inline, zero dependência externa
 * (nenhum CDN — a página tem de abrir no celular do time dentro da rede da
 * fábrica). Todo fetch usa caminho relativo, então a página funciona em
 * qualquer host/porta onde a API estiver servindo.
 *
 * Formato: FLUXO GUIADO numerado (passos 0 a 5) com o caminho de produção em
 * destaque — leitura real por Textract. O que não vai existir em produção
 * (leituras digitadas à mão) fica recolhido no "modo avançado" para não
 * parecer um passo do fluxo.
 *
 * O recorte "quais fotos esta etapa pede" NÃO é calculado aqui: vem pronto de
 * GET /conferencias/plano-de-fotos, que devolve as vistas de cada etapa (com o
 * recorte cumulativo JÁ aplicado pela API), o tipo de marcação de cada campo e
 * a checklist inteira. A página só CONSULTA pertencimento a esse plano — a
 * regra mora num lugar só, o servidor. Sem o plano ela mostra todas as vistas
 * sem destaque e ANUNCIA que não sabe — nunca bloqueia.
 *
 * Três decisões de tela que valem mais que o CSS:
 *
 * 1. O passo 3 abre com PROGRESSO ("faltam 2 de 3 vistas desta etapa") e as
 *    vistas sem campo na checklist ficam recolhidas em "outras vistas" — o
 *    time se perdia entre nove cartões de peso igual. Vista com estado (foto,
 *    envio em voo, falha) nunca é recolhida.
 * 2. REPETIR o teste é o uso real: a página guarda o File de cada upload e o
 *    botão do passo 4 vira "reenviar as mesmas fotos". Evidência não se
 *    reaproveita (cada FotoEvidencia pertence a UMA conferência — 422
 *    foto-evidencia-de-outra-conferencia), mas os bytes sobem de novo sem
 *    ninguém voltar à peça.
 * 3. O veredito abre com as DUAS PERGUNTAS do produto (serigrafia × etiqueta;
 *    séries irmãs entre si) e os campos vêm agrupados por resultado, não pela
 *    ordem da checklist. Isso é AGRUPAMENTO E ROTULAGEM do que a API mandou:
 *    nenhuma comparação, nenhum limiar e nenhum veredito nascem aqui — a
 *    página conta vereditos prontos (regra de ouro do CLAUDE.md).
 */
export const PAGINA_DEMO = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>TRAEL — demonstração de conferência</title>
<style>
  :root {
    --fundo: #f2f3f5;
    --papel: #ffffff;
    --borda: #cfd4da;
    --tinta: #16191d;
    --tinta-fraca: #5c6570;
    --aco: #263341;
    --acento: #1f5f8b;
    --vermelho: #b3261e;
    --vermelho-fundo: #fdecea;
    --ambar: #8a5a00;
    --ambar-fundo: #fff5e0;
    --verde: #1e6b41;
    --verde-fundo: #e8f5ed;
    /* Coerência entre marcações: cor PRÓPRIA, para não ser lida como veredito
       (vermelho = divergente) nem como achado livre (âmbar). */
    --violeta: #553091;
    --violeta-fundo: #f1ecfb;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--fundo);
    color: var(--tinta);
    font: 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    overflow-x: hidden;
  }
  header {
    background: var(--aco);
    color: #fff;
    padding: 14px 16px calc(14px + env(safe-area-inset-bottom, 0px));
  }
  header h1 { margin: 0; font-size: 18px; letter-spacing: .04em; text-transform: uppercase; }
  header p { margin: 4px 0 0; font-size: 13px; color: #b9c3cd; }
  main { padding: 16px; max-width: 720px; margin: 0 auto; }
  section {
    background: var(--papel);
    border: 1px solid var(--borda);
    border-radius: 6px;
    padding: 14px;
    margin-bottom: 14px;
  }
  /* ASSISTENTE: um passo aberto por vez. O concluído vira uma linha de resumo
     clicável e o futuro fica inerte — empilhar seis formulários abertos é o
     que fazia o time se perder no celular. */
  section.passo { padding: 0; overflow: hidden; margin-bottom: 12px; }
  section.passo.atual { border-color: var(--aco); }
  section.passo.futuro { opacity: .5; }
  .cabecalho {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 62px;
    padding: 11px 14px;
    text-align: left;
    font: inherit;
    color: var(--tinta);
    background: #fff;
    border: 0;
    border-radius: 0;
    cursor: pointer;
  }
  section.passo.atual > .cabecalho { background: var(--aco); color: #fff; }
  section.passo.futuro > .cabecalho { cursor: default; }
  .cabecalho .num {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px; height: 30px;
    border-radius: 50%;
    background: var(--aco);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
  }
  section.passo.atual > .cabecalho .num { background: #fff; color: var(--aco); }
  section.passo.concluido > .cabecalho .num { background: var(--verde); color: #fff; }
  .cabecalho .rotulo { flex: none; font-size: 15px; font-weight: 700; letter-spacing: .02em; }
  .cabecalho .resumo {
    flex: 1 1 auto; min-width: 0; text-align: right;
    font-size: 14px; color: var(--tinta-fraca); word-break: break-word;
  }
  section.passo.atual > .cabecalho .resumo { color: #c6d2dd; }
  .cabecalho .acao {
    flex: none; font-size: 12px; letter-spacing: .06em; text-transform: uppercase;
    color: var(--acento); font-weight: 700;
  }
  section.passo.atual > .cabecalho .acao,
  section.passo.futuro > .cabecalho .acao,
  section.passo.pendente > .cabecalho .acao { visibility: hidden; }
  section.passo .corpo { padding: 12px 14px 14px; border-top: 1px solid var(--borda); }
  section.passo:not(.atual) > .corpo { display: none; }
  [data-bloqueado="1"] { opacity: .45; pointer-events: none; }
  .contexto {
    margin: 0 0 12px;
    padding: 9px 11px;
    border-left: 4px solid var(--acento);
    background: #eef3f7;
    border-radius: 0 4px 4px 0;
    font-size: 13px;
    color: var(--tinta-fraca);
  }
  .contexto b { color: var(--acento); }
  label.rotulo { display: block; font-size: 14px; color: var(--tinta-fraca); margin: 10px 0 4px; }
  input[type=text], input[type=email], input[type=password], input[type=number], textarea, select {
    width: 100%;
    min-height: 46px;
    padding: 10px 12px;
    font-size: 16px;
    font-family: inherit;
    color: var(--tinta);
    background: #fff;
    border: 1px solid var(--borda);
    border-radius: 4px;
  }
  textarea { min-height: 132px; resize: vertical; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 15px; }
  button {
    font: inherit;
    font-size: 16px;
    min-height: 46px;
    padding: 12px 16px;
    border-radius: 4px;
    border: 1px solid var(--aco);
    background: var(--aco);
    color: #fff;
    cursor: pointer;
  }
  button.secundario { background: #fff; color: var(--aco); }
  button:disabled { opacity: .5; cursor: default; }
  button.largo { width: 100%; }
  button.compacto { min-height: 40px; padding: 8px 12px; font-size: 14px; }
  button.principal {
    background: var(--acento);
    border-color: var(--acento);
    font-size: 19px;
    min-height: 60px;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  button.principal.alternativa { background: var(--aco); border-color: var(--aco); font-size: 17px; }
  #login-corpo[hidden] { display: none; }
  .faixa-extracao {
    font-size: 14px; padding: 10px 12px; margin-bottom: 10px;
    border: 1px solid var(--borda); border-radius: 4px;
    background: #eef1f4; color: var(--tinta-fraca);
  }
  .faixa-extracao.vazia {
    background: var(--ambar-fundo); border-color: var(--ambar); color: var(--ambar); font-weight: 600;
  }
  .bloco-bruto { margin-top: 10px; }
  .bloco-bruto .titulo-bruto { font-size: 13px; color: var(--tinta-fraca); margin-bottom: 4px; }
  .bloco-bruto pre {
    white-space: pre-wrap; word-break: break-word; user-select: all;
    border-radius: 4px; font-size: 13px;
  }
  .bloco-bruto[hidden] { display: none; }
  .linha-botoes { display: flex; flex-wrap: wrap; gap: 8px; }
  .linha-botoes > * { flex: 1 1 160px; }
  .grade-etapas { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grade-etapas button {
    min-height: 76px; line-height: 1.2; padding: 10px 12px; text-align: left;
  }
  .grade-etapas button[aria-pressed="true"] {
    background: var(--acento);
    border-color: var(--acento);
    color: #fff;
    box-shadow: inset 0 0 0 2px #fff, 0 0 0 2px var(--acento);
  }
  .grade-etapas .nome-etapa { display: block; font-size: 15px; font-weight: 700; }
  .grade-etapas .sub-etapa { display: block; font-size: 12px; margin-top: 4px; opacity: .85; }
  .grade-etapas button.sem-etapa { grid-column: 1 / -1; min-height: 62px; }
  .aviso { font-size: 14px; padding: 10px 12px; border-radius: 4px; margin-top: 10px; }
  .aviso.erro { background: var(--vermelho-fundo); color: var(--vermelho); border: 1px solid var(--vermelho); }
  .aviso.ok { background: var(--verde-fundo); color: var(--verde); border: 1px solid var(--verde); }
  .aviso.neutro { background: #eef1f4; color: var(--tinta-fraca); border: 1px solid var(--borda); }
  .aviso[hidden] { display: none; }
  /* Progresso do passo 3: a pergunta "o que falta AGORA" tem de caber num
     relance, antes de qualquer cartão. */
  .progresso {
    margin: 0 0 10px;
    padding: 11px 12px;
    border: 1px solid var(--borda);
    border-radius: 4px;
    background: #eef1f4;
  }
  .progresso[hidden] { display: none; }
  .progresso .texto { font-size: 16px; font-weight: 700; color: var(--tinta); }
  .progresso .barra {
    height: 10px; margin-top: 8px; border-radius: 5px;
    background: #dbe0e6; overflow: hidden;
  }
  .progresso .cheio { height: 100%; background: var(--acento); }
  .progresso .faltando {
    font-size: 13px; margin-top: 6px; color: var(--tinta-fraca);
    word-break: break-word;
  }
  .progresso .faltando b { font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--tinta); }
  .progresso.completo { background: var(--verde-fundo); border-color: var(--verde); }
  .progresso.completo .texto { color: var(--verde); }
  .progresso.completo .cheio { background: var(--verde); }
  #outras-vistas { margin-top: 10px; }
  #outras-vistas[hidden] { display: none; }
  #outras-vistas .corpo-outras { padding: 0 10px 10px; }
  .item-foto {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px;
    margin-bottom: 6px;
    border: 1px solid var(--borda);
    border-left: 6px solid var(--borda);
    border-radius: 4px;
    background: #fff;
  }
  .item-foto.desta-etapa { border-color: var(--acento); background: #f4f8fb; }
  .item-foto.fora-etapa { opacity: .62; background: #f7f8f9; }
  .item-foto.tem-foto { border-left-color: var(--verde); }
  .item-foto .nome { flex: 1 1 150px; min-width: 0; font-size: 15px; font-family: ui-monospace, Menlo, Consolas, monospace; }
  /* Duas portas para a mesma vista: a câmera (produção) e a galeria (repetir o
     teste com as fotos que já estão no celular, sem refotografar a peça). */
  .acoes-vista { display: flex; gap: 6px; flex: 0 0 auto; margin-left: auto; }
  .item-foto .estado { display: block; font-size: 13px; color: var(--tinta-fraca); font-family: inherit; }
  .item-foto .estado.falhou { color: var(--vermelho); }
  .item-foto .marca-etapa {
    display: block; font-size: 12px; font-family: inherit; margin-top: 2px;
    text-transform: uppercase; letter-spacing: .05em; font-weight: 700;
  }
  .item-foto.desta-etapa .marca-etapa { color: var(--acento); }
  .item-foto.fora-etapa .marca-etapa { color: var(--tinta-fraca); }
  .botao-foto {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    min-width: 118px;
    padding: 10px 14px;
    border: 1px solid var(--aco);
    border-radius: 4px;
    background: #fff;
    color: var(--aco);
    font-size: 15px;
    cursor: pointer;
  }
  .botao-foto.grande { min-height: 60px; min-width: 118px; font-size: 16px; font-weight: 600; }
  .botao-foto.galeria { min-height: 60px; min-width: 78px; font-size: 14px; color: var(--tinta-fraca); }
  /* Vista que a etapa NÃO pede: o botão existe (escape), mas não pode ter cara
     de pedido — botão grande se lê como ordem de serviço. */
  .botao-foto.discreto {
    min-height: 44px; min-width: 92px; font-size: 13px; font-weight: 400;
    color: var(--tinta-fraca); border-color: var(--borda); border-style: dashed;
  }
  .miniatura {
    width: 46px; height: 46px; object-fit: cover;
    border: 1px solid var(--borda); border-radius: 4px; background: #e6e9ec;
  }
  /* Vista com mais de uma marcação: o aviso precisa saltar do resto do cartão,
     mas sem cor de veredito (não é alarme — é instrução de enquadramento). */
  .item-foto .multi {
    display: block; font-size: 12px; font-family: inherit; margin-top: 2px;
    color: var(--tinta); font-weight: 600;
  }
  /* Dica de enquadramento (relevo de cima, close encostado): medição do
     projeto, não opinião — discreta, porque não é o pedido, é o COMO. */
  .item-foto .dica-captura {
    display: block; font-size: 12px; font-family: inherit; margin-top: 2px;
    color: var(--acento); font-style: italic;
  }
  /* O que o sistema vai procurar NESTA foto, item a item. Fica abaixo do nome
     da vista porque é a resposta de "o que eles querem daqui". */
  .item-foto .alvos { display: block; margin-top: 3px; }
  /* A pilha de fontes vai repetida aqui de propósito: o cartão inteiro herda a
     monoespaçada de .item-foto .nome, e o nome LEGÍVEL do campo só se separa do
     nome canônico (que fica logo abaixo, monoespaçado) se as duas famílias
     forem diferentes. */
  .item-foto .alvo {
    display: block; font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    padding: 3px 0 3px 8px; margin-top: 3px;
    border-left: 2px solid var(--borda); color: var(--tinta);
  }
  .item-foto.desta-etapa .alvo { border-left-color: var(--acento); }
  .item-foto .alvo-nome { font-weight: 600; }
  .item-foto .alvo-obrig { color: var(--tinta-fraca); margin-left: 4px; }
  .item-foto .alvo-cru {
    display: block; font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 11px; color: var(--tinta-fraca); word-break: break-all;
  }
  /* Como a marcação foi GRAVADA: relevo (metal) × tinta (serigrafia). Duas
     cores neutras próprias — nenhuma das do veredito, porque isto não julga
     nada, só ajuda a achar o número na peça. */
  .chip {
    display: inline-block; margin-left: 6px; padding: 1px 6px;
    border: 1px solid; border-radius: 3px;
    font-family: inherit; font-size: 11px; font-weight: 700;
    letter-spacing: .04em; text-transform: uppercase; white-space: nowrap;
  }
  .chip-relevo { color: var(--aco); border-color: var(--aco); background: #e7ebef; }
  .chip-tinta { color: var(--violeta); border-color: var(--violeta); background: var(--violeta-fundo); }
  .item-leitura { padding: 10px 0; border-bottom: 1px solid var(--borda); }
  .item-leitura:last-child { border-bottom: 0; }
  .item-leitura .cabeca { display: flex; align-items: center; gap: 10px; min-height: 44px; }
  .item-leitura .cabeca label { display: flex; align-items: center; gap: 10px; flex: 1 1 auto; cursor: pointer; }
  .item-leitura input[type=checkbox] { width: 24px; height: 24px; margin: 0; flex: none; }
  .item-leitura .campo { font-size: 15px; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .item-leitura .fonte { font-size: 13px; color: var(--tinta-fraca); }
  .item-leitura .campos { display: flex; gap: 8px; margin-top: 8px; }
  .item-leitura .campos .valor { flex: 3 1 auto; min-width: 0; }
  .item-leitura .campos .conf { flex: 1 1 92px; max-width: 120px; }
  .veredito-geral {
    border-radius: 6px; padding: 18px 16px; margin-bottom: 14px;
    border: 2px solid; text-align: center;
  }
  .veredito-geral .titulo { font-size: 22px; font-weight: 700; letter-spacing: .04em; line-height: 1.25; }
  .veredito-geral .sub { font-size: 14px; margin-top: 6px; }
  .veredito-geral .sub.forte { font-size: 17px; font-weight: 700; letter-spacing: .02em; }
  .v-divergente { background: var(--vermelho-fundo); border-color: var(--vermelho); color: var(--vermelho); }
  .v-nao_conferivel { background: var(--ambar-fundo); border-color: var(--ambar); color: var(--ambar); }
  .v-conforme { background: var(--verde-fundo); border-color: var(--verde); color: var(--verde); }
  .v-incoerente { background: var(--violeta-fundo); border-color: var(--violeta); color: var(--violeta); }
  .v-ausente { background: #eef1f4; border-color: var(--borda); color: var(--tinta-fraca); }
  /* AS DUAS PERGUNTAS: no topo do veredito porque são o que o time realmente
     pergunta na frente da peça. Só agrupa e rotula vereditos que a API emitiu —
     nenhuma comparação acontece aqui (regra de ouro). */
  .cartao-foco {
    border: 2px solid; border-radius: 6px; padding: 12px 14px; margin-bottom: 10px;
  }
  .cartao-foco .pergunta { font-size: 15px; font-weight: 700; line-height: 1.3; }
  .cartao-foco .resposta {
    font-size: 20px; font-weight: 700; letter-spacing: .03em; margin-top: 6px; line-height: 1.2;
  }
  .cartao-foco .detalhe-foco { font-size: 14px; margin-top: 4px; color: var(--tinta); }
  .cartao-foco .campos-foco {
    font-size: 12px; margin-top: 6px; color: var(--tinta-fraca);
    font-family: ui-monospace, Menlo, Consolas, monospace; word-break: break-word;
  }
  .nota-foco { font-size: 12px; color: var(--tinta-fraca); margin: -4px 0 14px; }
  /* Campos agrupados por RESULTADO (divergente → não conferível → conforme):
     na ordem da checklist, o que impede o conforme se perdia no meio. */
  .grupo-campos { margin-bottom: 12px; }
  .grupo-campos .titulo-grupo {
    font-size: 14px; font-weight: 700; letter-spacing: .05em;
    text-transform: uppercase; margin: 0 0 6px;
  }
  .grupo-campos.g-divergente .titulo-grupo { color: var(--vermelho); }
  .grupo-campos.g-nao_conferivel .titulo-grupo { color: var(--ambar); }
  .grupo-campos.g-conforme > summary { color: var(--verde); font-weight: 700; }
  details.grupo-campos { background: transparent; border: 0; }
  details.grupo-campos > summary {
    padding: 10px 0; font-size: 14px; letter-spacing: .05em; text-transform: uppercase;
  }
  .bloco-coerencia {
    border: 2px solid var(--violeta); background: var(--violeta-fundo);
    border-radius: 6px; padding: 14px; margin-bottom: 14px;
  }
  .bloco-coerencia .titulo-coerencia {
    font-size: 17px; font-weight: 700; line-height: 1.3; color: var(--violeta);
  }
  .bloco-coerencia .explica { font-size: 13px; margin: 6px 0 0; color: var(--tinta-fraca); }
  .bloco-coerencia .explica b { color: var(--violeta); }
  .bloco-coerencia .grupo-coerencia {
    background: #fff; border: 1px solid var(--violeta); border-radius: 4px;
    padding: 10px 12px; margin-top: 10px;
  }
  .bloco-coerencia .esperado { font-size: 14px; color: var(--tinta-fraca); }
  .bloco-coerencia .valores { font-size: 13px; color: var(--tinta-fraca); margin-top: 2px; }
  .bloco-coerencia .mono {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    color: var(--tinta); font-weight: 700;
  }
  .bloco-coerencia ul { list-style: none; margin: 10px 0 0; padding: 0; }
  .bloco-coerencia li {
    border-top: 1px solid var(--borda); padding: 10px 0 4px;
  }
  .bloco-coerencia li:first-child { border-top: 0; }
  .bloco-coerencia .topo-leitura {
    display: flex; justify-content: space-between; align-items: baseline; gap: 10px;
  }
  .bloco-coerencia .campo-legivel { font-size: 15px; color: var(--tinta); }
  .bloco-coerencia .campo-cru {
    display: block; font-size: 12px; color: var(--tinta-fraca);
    font-family: ui-monospace, Menlo, Consolas, monospace;
  }
  .bloco-coerencia .selo {
    flex: none; font-size: 12px; font-weight: 700; letter-spacing: .05em;
    text-transform: uppercase; padding: 3px 8px; border-radius: 3px; border: 1px solid;
  }
  .bloco-coerencia .detalhe { font-size: 14px; color: var(--tinta); margin-top: 4px; }
  .bloco-coerencia a { color: var(--acento); font-size: 14px; display: inline-block; min-height: 24px; margin-top: 4px; }
  .alarme-consistencia {
    border: 2px solid var(--ambar); background: var(--ambar-fundo);
    border-radius: 6px; padding: 14px; margin-bottom: 14px;
  }
  .alarme-consistencia .titulo-alarme {
    font-size: 17px; font-weight: 700; line-height: 1.3; color: var(--ambar);
  }
  .alarme-consistencia .explica { font-size: 13px; margin: 6px 0 0; color: var(--tinta-fraca); }
  .alarme-consistencia .explica b { color: var(--ambar); }
  .alarme-consistencia .achado {
    background: #fff; border: 1px solid var(--ambar); border-radius: 4px;
    padding: 10px 12px; margin-top: 10px;
  }
  .alarme-consistencia .texto-achado {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 22px; font-weight: 700; letter-spacing: .04em; color: var(--tinta);
    word-break: break-word;
  }
  .alarme-consistencia .quantas { font-size: 13px; color: var(--tinta-fraca); margin-top: 2px; }
  .alarme-consistencia ul { margin: 8px 0 0; padding-left: 18px; font-size: 14px; color: var(--tinta); }
  .alarme-consistencia li { margin-bottom: 6px; }
  .alarme-consistencia a { color: var(--acento); display: inline-block; min-height: 24px; }
  .cartao-campo {
    border: 1px solid var(--borda); border-left: 6px solid var(--borda);
    border-radius: 4px; padding: 10px 12px; margin-bottom: 8px; background: #fff;
  }
  .cartao-campo.v-divergente { border-color: var(--vermelho); background: var(--vermelho-fundo); }
  .cartao-campo.v-nao_conferivel { border-color: var(--ambar); background: var(--ambar-fundo); }
  .cartao-campo.v-conforme { border-color: var(--verde); background: var(--verde-fundo); }
  .cartao-campo .topo { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .cartao-campo .nome-campo { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 15px; color: var(--tinta); }
  .cartao-campo .marca { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .cartao-campo dl { margin: 8px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; font-size: 14px; }
  .cartao-campo dt { color: var(--tinta-fraca); }
  .cartao-campo dd { margin: 0; word-break: break-word; color: var(--tinta); }
  .cartao-campo dd.mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .cartao-campo a { color: var(--acento); font-size: 14px; display: inline-block; margin-top: 8px; min-height: 24px; }
  /* EVIDÊNCIA VISUAL: a foto que lastreou a leitura com a região marcada por
     cima. As coordenadas chegam normalizadas (0..1) sobre a foto JÁ orientada
     pelo EXIF — que é como o navegador também a desenha —, então o
     posicionamento é porcentagem pura: a moldura tem exatamente o tamanho da
     imagem (sem altura fixa, senão as % cairiam noutro lugar). */
  a.evidencia { display: block; margin-top: 8px; text-decoration: none; color: var(--acento); }
  a.evidencia .moldura {
    display: block; position: relative; overflow: hidden;
    width: 100%; max-width: 340px;
    border: 1px solid var(--borda); border-radius: 4px; background: #e6e9ec;
  }
  a.evidencia img { display: block; width: 100%; height: auto; }
  a.evidencia .realce {
    position: absolute;
    border: 3px solid var(--vermelho);
    border-radius: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, .85);
  }
  a.evidencia .legenda-evidencia {
    display: block; margin-top: 4px; font-size: 12px; color: var(--tinta-fraca);
  }
  details { border: 1px solid var(--borda); border-radius: 4px; background: #fff; }
  summary { padding: 12px; font-size: 14px; color: var(--tinta-fraca); cursor: pointer; min-height: 44px; }
  #sec-avancado { background: #eceef1; border-style: dashed; }
  #sec-avancado summary { font-weight: 700; color: var(--tinta); }
  .corpo-avancado { padding: 0 12px 12px; }
  pre {
    margin: 0; padding: 12px; background: #1c2430; color: #dde6ef;
    font-size: 12px; overflow-x: auto; border-radius: 0 0 4px 4px;
  }
  video { width: 100%; max-height: 300px; background: #000; border-radius: 4px; margin-top: 10px; }
  #camera-area[hidden] { display: none; }
  .dica { font-size: 13px; color: var(--tinta-fraca); margin: 8px 0 0; }
  .rodape { font-size: 12px; color: var(--tinta-fraca); text-align: center; padding: 4px 0 24px; }
</style>
</head>
<body>
<header>
  <h1>TRAEL — conferência de peça</h1>
  <p>Um passo por vez. Cada passo diz o que a linha fará sozinha em produção.</p>
</header>
<main>

  <section class="passo" id="sec-login" data-passo="login">
    <button type="button" class="cabecalho" id="cab-login">
      <span class="num">0</span>
      <span class="rotulo">Entrar</span>
      <span class="resumo" id="resumo-login">não conectado</span>
      <span class="acao">trocar</span>
    </button>
    <div class="corpo">
      <p class="contexto">Entre com o usuário de demonstração (já vem preenchido) e toque em ENTRAR. Em produção o aparelho de cada ponto da linha já vem liberado de fábrica — ninguém digita senha no chão de fábrica.</p>
      <div id="login-corpo">
        <label class="rotulo" for="email">E-mail</label>
        <input type="email" id="email" value="admin@example.com" autocomplete="username" autocapitalize="none" spellcheck="false">
        <label class="rotulo" for="senha">Senha</label>
        <input type="password" id="senha" value="secret" autocomplete="current-password">
        <div class="linha-botoes" style="margin-top:12px">
          <button id="btn-login" class="principal largo">ENTRAR</button>
        </div>
      </div>
      <div class="linha-botoes" style="margin-top:10px">
        <button id="btn-trocar-login" class="secundario compacto" hidden>Sair desta sessão</button>
      </div>
      <div id="login-aviso" class="aviso neutro" hidden></div>
    </div>
  </section>

  <section class="passo" id="sec-etapa" data-passo="etapa" data-bloqueado="1">
    <button type="button" class="cabecalho" id="cab-etapa">
      <span class="num">1</span>
      <span class="rotulo">Etapa</span>
      <span class="resumo" id="resumo-etapa">a escolher</span>
      <span class="acao">trocar</span>
    </button>
    <div class="corpo">
      <p class="contexto">Em que ponto da linha este celular está? Em produção cada câmera fica fixa em <b>um</b> ponto; aqui o celular faz esse papel. A resposta fica guardada neste aparelho — na próxima vez já vem escolhida.</p>
      <p class="contexto">Isso muda <b>quais fotos</b> serão pedidas: cada ponto da linha só confere as marcações que já foram gravadas na peça até ali. A placa de identificação, por exemplo, é rebitada na última etapa — antes dela, não há placa para fotografar.</p>
      <div class="grade-etapas" id="grade-etapas"></div>
      <p class="dica" id="etapa-dica">Buscando as etapas da linha...</p>
    </div>
  </section>

  <section class="passo" id="sec-qr" data-passo="etiqueta" data-bloqueado="1">
    <button type="button" class="cabecalho" id="cab-etiqueta">
      <span class="num">2</span>
      <span class="rotulo">Etiqueta</span>
      <span class="resumo" id="resumo-etiqueta">a ler</span>
      <span class="acao">trocar</span>
    </button>
    <div class="corpo">
      <p class="contexto">Aponte para o QR da etiqueta adesiva da peça. A etiqueta é a <b>referência</b>: é dela que saem os números que o sistema espera encontrar na peça, e o sistema nunca inventa um número que não esteja aqui. Em produção a câmera lê esse QR sozinha quando a peça chega.</p>
      <div class="linha-botoes">
        <button id="btn-camera" class="principal alternativa largo">LER O QR COM A CÂMERA</button>
      </div>
      <div id="qr-aviso" class="aviso neutro" hidden></div>
      <div id="camera-area" hidden>
        <video id="video" playsinline muted></video>
        <div class="linha-botoes" style="margin-top:8px">
          <button id="btn-parar-camera" class="secundario">Parar câmera</button>
        </div>
      </div>
      <div class="linha-botoes" style="margin-top:10px">
        <button id="btn-etiqueta-demo" class="secundario">Atalho de teste: etiqueta da peça de demonstração</button>
      </div>
      <p class="dica">O atalho já escreve a etiqueta da peça de demonstração (série 847233, patrimônio 251328, cliente Energisa), para repetir o teste sem ter que escanear de novo. <b>Ele existe só nesta página de teste</b> — o caminho de verdade é ler o QR.</p>
      <label class="rotulo" for="payload">Texto da etiqueta (é isso que o sistema vai ler)</label>
      <textarea id="payload" spellcheck="false" autocapitalize="none">Pedido: 68202\nNúm. Série: 847233\nSeq: 86\nPatrimônio: 251328\nCliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A\nTPD-408136</textarea>
      <div class="linha-botoes" style="margin-top:8px">
        <button id="btn-usar-etiqueta" class="secundario">Usar este texto e seguir</button>
      </div>
      <div id="qr-bruto" class="bloco-bruto" hidden>
        <p class="titulo-bruto">Texto exato que veio do QR, sem nenhuma alteração</p>
        <pre id="qr-bruto-texto"></pre>
        <div class="linha-botoes" style="margin-top:8px">
          <button id="btn-copiar-qr" class="secundario">Copiar</button>
        </div>
      </div>
      <p class="dica">Se o sistema disser que não entendeu o texto da etiqueta, <b>copie o texto e mande para o time</b>: o formato do QR da TRAEL ainda está sendo definido. Não é defeito da peça nem erro seu.</p>
    </div>
  </section>

  <section class="passo" id="sec-fotos" data-passo="fotos" data-bloqueado="1">
    <button type="button" class="cabecalho" id="cab-fotos">
      <span class="num">3</span>
      <span class="rotulo">Fotos</span>
      <span class="resumo" id="resumo-fotos">nenhuma vista</span>
      <span class="acao">trocar</span>
    </button>
    <div class="corpo">
      <p class="contexto">Em produção a câmera desta etapa fotografa sozinha quando a peça chega. Aqui quem fotografa é você: <b>uma foto por lado da peça</b>. A lista abaixo mostra só os lados que <b>esta</b> etapa precisa — os outros ficam recolhidos no fim.</p>
      <div id="fotos-estado" class="aviso neutro" hidden></div>
      <div id="fotos-progresso" class="progresso" hidden></div>
      <p class="dica" id="fotos-recorte">Escolha a etapa no passo 1 para a página saber quais fotos pedir.</p>
      <div id="lista-fotos"></div>
      <details id="outras-vistas" hidden>
        <summary id="outras-vistas-titulo">Ver as outras vistas da peça</summary>
        <div class="corpo-outras" id="lista-outras"></div>
      </details>
      <p class="dica">Quando o cartão diz que a foto <b>tem de mostrar 2 marcações</b> (o topo tem o número de série chumbado e o patrimônio pintado), enquadre as duas na mesma foto. Se o sistema conseguir ler só um número, ele responde <b>não conferível</b> em vez de adivinhar de qual dos dois se trata.</p>
      <div id="fotos-aviso" class="aviso neutro" hidden></div>
    </div>
  </section>

  <section class="passo" id="sec-conferir" data-passo="conferir" data-bloqueado="1">
    <button type="button" class="cabecalho" id="cab-conferir">
      <span class="num">4</span>
      <span class="rotulo">Conferir</span>
      <span class="resumo" id="resumo-conferir">aguardando fotos</span>
      <span class="acao">trocar</span>
    </button>
    <div class="corpo">
      <p class="contexto">Agora o sistema lê os números nas fotos e compara com a etiqueta. <b>Quem decide o resultado é o servidor</b> — este celular só mostra a resposta.</p>
      <p class="contexto">É um toque, e de propósito: cada leitura de foto é paga. Nada fica rodando sozinho em segundo plano. Em produção, quem dá esse toque é a passagem da peça pela câmera.</p>
      <div class="linha-botoes">
        <button id="btn-extrair" class="principal largo" disabled>EXTRAIR COM TEXTRACT</button>
      </div>
      <p class="dica" id="extrair-dica">Envie ao menos uma foto no passo 3 para poder conferir.</p>
      <div id="conferir-aviso" class="aviso neutro" hidden></div>
    </div>
  </section>

  <section class="passo" id="sec-veredito" data-passo="veredito" data-bloqueado="1">
    <button type="button" class="cabecalho" id="cab-veredito">
      <span class="num">5</span>
      <span class="rotulo">Veredito</span>
      <span class="resumo" id="resumo-veredito">ainda não</span>
      <span class="acao">abrir</span>
    </button>
    <div class="corpo">
      <p class="dica" id="veredito-vazio">Ainda sem resultado: toque em EXTRAIR no passo 4.</p>
      <div id="resultado"></div>
      <div class="linha-botoes" id="acoes-fim" style="margin-top:14px" hidden>
        <button id="btn-de-novo" class="principal largo">CONFERIR DE NOVO</button>
      </div>
      <div class="linha-botoes" id="acoes-fim-2" style="margin-top:8px" hidden>
        <button id="btn-trocar-etapa" class="secundario">Conferir em outro ponto da linha</button>
        <button id="btn-zerar" class="secundario">Próxima peça</button>
      </div>
      <p class="dica" id="dica-fim" hidden><b>Conferir de novo</b> repete o teste com esta mesma peça e estas mesmas fotos, sem você voltar até ela. <b>Próxima peça</b> descarta as fotos e volta para a etiqueta, mantendo o ponto da linha deste celular.</p>
      <p class="contexto">Este resultado é exatamente o que o app final vai mostrar. Quem comparou os números foi o servidor — este celular não decide nada, só exibe.</p>
    </div>
  </section>

  <section id="sec-avancado" data-bloqueado="1" style="padding:0">
    <details id="modo-avancado">
      <summary>Modo avançado — testar a engine sem gastar AWS (não existe em produção)</summary>
      <div class="corpo-avancado">
        <p class="dica">Leituras digitadas à mão, sem chamar a visão: serve para exercitar a engine de conformidade. Em produção nenhum operador digita valor lido — quem lê a peça é a câmera. Os presets usam as confianças medidas pelo Textract nas fotos reais.</p>
        <div class="linha-botoes" style="margin:10px 0">
          <button class="secundario" id="preset-demo">Peça de demo (defeito real)</button>
          <button class="secundario" id="preset-correta">Peça correta</button>
          <button class="secundario" id="preset-ruim">Foto ruim (baixa confiança)</button>
        </div>
        <div class="linha-botoes" style="margin:0 0 10px">
          <button class="secundario" id="btn-campos-etapa">Só os campos desta etapa</button>
        </div>
        <div id="lista-leituras"></div>
        <div class="linha-botoes" style="margin-top:12px">
          <button id="btn-conferir" class="principal alternativa largo">CONFERIR AGORA</button>
        </div>
        <div class="linha-botoes" style="margin-top:10px">
          <button id="btn-limpar-fotos" class="secundario compacto" disabled>Descartar as fotos desta sessão</button>
        </div>
        <div id="avancado-aviso" class="aviso neutro" hidden></div>
      </div>
    </details>
  </section>

  <p class="rodape">Página temporária de demonstração — remover antes de produção.</p>
</main>

<script>
(function () {
  'use strict';

  var API = '/api/v1';

  // fonteFisica = QUAL VISTA da peça a foto mostra (não "qual marcação"). As
  // seis primeiras são orientações; 'placa' e 'etiqueta' são CLOSES (ficam
  // sobre uma face, mas o texto é pequeno demais para a foto de vista inteira);
  // 'geral' é escape. Fonte única: src/extracao/ports/extractor.port.ts.
  var FONTES = [
    'topo', 'frente', 'traseira', 'lateral-esquerda', 'lateral-direita',
    'base', 'placa', 'etiqueta', 'geral'
  ];

  // FALLBACK do modo avançado: a lista real de campos sai da checklist do
  // ProjetoModelo (ver camposDoFormulario) — esta tabela só cobre o intervalo
  // entre abrir a página e a checklist chegar da API.
  var CAMPOS_FALLBACK = [
    { campo: 'serie-chumbada-topo', fonte: 'topo' },
    { campo: 'serie-chumbada-lateral-direita', fonte: 'lateral-direita' },
    { campo: 'serie-chumbada-traseira', fonte: 'traseira' },
    { campo: 'patrimonio-serigrafia-topo', fonte: 'topo' },
    { campo: 'patrimonio-serigrafia-frente', fonte: 'frente' },
    { campo: 'cliente-serigrafia-frente', fonte: 'frente' },
    { campo: 'potencia-serigrafia-frente', fonte: 'frente' },
    { campo: 'serie-placa', fonte: 'placa' },
    { campo: 'patrimonio-placa', fonte: 'placa' }
  ];

  var CLIENTE = '143091 - Energisa Rondônia Distribuidora de Energia S.A';

  // Atalho de TESTE: o mesmo texto que a etiqueta da peça de demonstração
  // carrega. Existe porque repetir o teste é o uso real desta página e
  // reescanear o QR a cada rodada é a fricção que mais custa tempo — o caminho
  // de verdade (e o único que existirá em produção) continua sendo a câmera.
  var ETIQUETA_DEMO = [
    'Pedido: 68202',
    'Núm. Série: 847233',
    'Seq: 86',
    'Patrimônio: 251328',
    'Cliente: ' + CLIENTE,
    'TPD-408136'
  ].join('\\n');

  // Confianças medidas pelo Textract nas fotos reais (docs/visao-ocr.md): o
  // relevo lê melhor de cima (98,8%) do que de lado (85,8%).
  var PRESET_DEMO = {
    'serie-chumbada-topo': ['847233', 0.988],
    'serie-chumbada-lateral-direita': ['847233', 0.858],
    'serie-chumbada-traseira': ['847233', 0.967],
    'serie-placa': ['847833', 0.999],
    'patrimonio-placa': ['251328', 0.98],
    'patrimonio-serigrafia-topo': ['251328', 0.985],
    'patrimonio-serigrafia-frente': ['251328', 0.984],
    'cliente-serigrafia-frente': [CLIENTE, 0.972],
    'potencia-serigrafia-frente': ['10 kVA', 0.985]
  };

  var PRESET_CORRETA = Object.assign({}, PRESET_DEMO, {
    'serie-placa': ['847233', 0.995]
  });

  // Erro de dígito medido de verdade: o 8 virou 3 numa foto lateral, a 35,4%.
  var PRESET_RUIM = Object.assign({}, PRESET_DEMO, {
    'serie-chumbada-topo': ['347233', 0.354]
  });

  // FALLBACK do recorte por etapa, pelo mesmo motivo do CAMPOS_FALLBACK. O
  // recorte de verdade é derivado dos dados (ver carregarRecorte/camposDaEtapa)
  // — esta tabela é a última escolha, nunca a primeira.
  var CHUMBADAS = ['serie-chumbada-topo', 'serie-chumbada-lateral-direita', 'serie-chumbada-traseira'];
  var SERIGRAFADAS = CHUMBADAS.concat([
    'patrimonio-serigrafia-topo', 'patrimonio-serigrafia-frente',
    'cliente-serigrafia-frente', 'potencia-serigrafia-frente'
  ]);
  var CAMPOS_POR_ETAPA = {
    'adesivacao': CHUMBADAS,
    'serigrafia': SERIGRAFADAS,
    'oleo-conferencia': SERIGRAFADAS,
    'fixacao-placa': CAMPOS_FALLBACK.map(function (item) { return item.campo; })
  };

  // Código de erro da API -> o que fazer, em português de chão de fábrica.
  // A mensagem crua continua aparecendo junto (é ela que o time cola no chat
  // quando pede ajuda); isto é tradução, não substituição.
  var EXPLICACOES = [
    ['foto-evidencia-de-outra-conferencia',
      'Estas fotos já lastreiam uma conferência anterior. Cada evidência pertence a UMA conferência só — é o que mantém a trilha de auditoria honesta, e por isso a API recusa reaproveitar. Caminho: toque em "REENVIAR AS MESMAS FOTOS E CONFERIR", que sobe as mesmas imagens como evidências novas, sem refotografar a peça.'],
    ['foto-evidencia-inexistente',
      'A API não achou uma das fotos enviadas (o banco pode ter sido reiniciado). Caminho: "Descartar as fotos e recomeçar" no passo 4 e fotografar de novo.'],
    ['etapa-desconhecida',
      'A etapa escolhida no passo 1 (ou vinda do ?etapa= da URL) não existe como checkpoint no banco. Confira o código da etapa; rodar o seed recria as quatro etapas da linha.'],
    ['etapa-sem-campos-conferiveis',
      'Nenhuma marcação da checklist deste projeto já existe na peça até esta etapa — não há o que conferir aqui. Escolha uma etapa posterior.'],
    ['checklist-sem-campo-avaliavel',
      'A checklist até esta etapa só tem itens opcionais sem valor esperado na etiqueta. Nada a comparar.'],
    ['projeto-modelo-indeterminado',
      'A API não conseguiu decidir QUAL projeto/modelo vale para esta peça — e se recusa a escolher no chute. É preciso haver exatamente um ProjetoModelo cadastrado, ou o QR trazer o código do projeto. Sem isso a página não sabe quais fotos pedir.'],
    ['checklist-invalido',
      'A checklist do modelo está ilegível no banco (texto que não é uma lista válida de campos). Ninguém consegue conferir nada assim: avise o time — rodar o seed recria a checklist do modelo da demo.'],
    ['payload-somente-codigo',
      'O QR trouxe apenas um código de lookup, sem os campos da peça. Nesta rodada a etiqueta é a única fonte da verdade: use o atalho da peça de demonstração no passo 2 ou digite os campos.'],
    ['formato-desconhecido',
      'A API não reconheceu o formato do conteúdo da etiqueta. Copie o conteúdo bruto (passo 2) e mande para o time: o formato do QR da TRAEL ainda está sendo fechado.'],
    ['campos-obrigatorios-ausentes',
      'Faltam número de série e/ou patrimônio no conteúdo da etiqueta — sem eles não existe valor esperado para comparar.'],
    ['payload-vazio',
      'O conteúdo da etiqueta (passo 2) está vazio.'],
    ['campo-conferido-imutavel',
      'Veredito já emitido não pode ser editado — é assim de propósito.']
  ];

  function explicacaoDoErro(texto) {
    var achada = '';
    EXPLICACOES.forEach(function (par) {
      if (!achada && texto.indexOf(par[0]) !== -1) { achada = par[1]; }
    });
    return achada;
  }

  var TEXTO_VEREDITO = {
    divergente: ['DIVERGENTE — peça não pode seguir', 'Corrija a peça antes de liberar a etapa seguinte.'],
    nao_conferivel: ['NÃO CONFERÍVEL — exige conferência humana', 'Algum campo ficou ilegível ou abaixo do limiar de confiança.'],
    conforme: ['CONFORME — peça liberada', 'Todos os campos conferidos batem com a etiqueta.']
  };

  var estado = {
    token: null,
    // Quem está logado (só para o resumo do passo 0).
    usuario: null,
    // Passo aberto do assistente: 'login' | 'etapa' | 'etiqueta' | 'fotos' |
    // 'conferir' | 'veredito'.
    passo: 'login',
    // 'nao-carregada' | 'carregando' | 'pronta' | 'falhou'. Enquanto não é
    // 'pronta' a página NÃO SABE quais vistas a etapa exige, e o passo 3 diz
    // isso em vez de pedir todas — ver carregarRecorte.
    checklistEstado: 'nao-carregada',
    motivoDaFalha: '',
    etapa: null,
    // Escolha EXPLÍCITA de etapa já foi feita? "Sem etapa" é uma escolha
    // válida (checklist inteira) e precisa ser distinguível de "ainda não
    // decidiu" — por isso não dá para inferir de 'etapa === null'.
    etapaDefinida: false,
    // Etiqueta confirmada pelo operador (QR lido, atalho de teste ou texto
    // aceito). A página nunca lê os CAMPOS do payload — só sabe que existe.
    etiquetaPronta: false,
    origemEtiqueta: '',
    temVeredito: false,
    vereditoTexto: '',
    // Trava do avanço automático do passo 3: o assistente empurra para o
    // passo 4 UMA vez por lote de fotos, nunca a cada foto reenviada.
    avancouDasFotos: false,
    // Uma chamada de conferência (ou o reenvio que a precede) em voo: segura o
    // botão do passo 4 enquanto isso, para dois toques não gastarem visão duas
    // vezes (SPEC, constraint 4).
    ocupado: false,
    // fonte -> { id, url, arquivo, usadaEm }: 'arquivo' é o File original (é
    // ele que permite repetir sem refotografar) e 'usadaEm' é o id da
    // conferência que já se lastreou nesta foto.
    fotos: {},
    // Slot reservado enquanto o upload está em voo: garante que duas capturas
    // seguidas não disputem a mesma fonte canônica.
    enviando: {},
    falhas: {},
    camera: null,
    // Último preset aplicado no modo avançado: quando a checklist chega da API
    // o formulário é remontado com os campos reais, e ele volta preenchido.
    preset: null,
    // Vindos da API depois do login (null = ainda não carregados/falharam).
    // TUDO abaixo sai de UMA chamada: GET /conferencias/plano-de-fotos. Os
    // índices são só atalhos de consulta — nenhuma regra de recorte mora
    // neles, porque o recorte já veio aplicado pela API.
    plano: null,          // resposta crua do plano (projeto, checklist, etapas, pecaInteira)
    checklist: null,      // plano.checklist: TODOS os itens do ProjetoModelo
    ordemPorCodigo: null, // codigo do Checkpoint -> ordem
    nomePorCodigo: null,  // codigo do Checkpoint -> nome exibido
    vistasDaPeca: null,   // fonteFisica -> [item] (recorte da peça inteira)
    vistasPorEtapa: null  // codigo do Checkpoint -> { fonteFisica: [item] }
  };

  function el(id) { return document.getElementById(id); }

  function esc(valor) {
    return String(valor === null || valor === undefined ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function aviso(id, texto, tipo) {
    var caixa = el(id);
    if (!texto) {
      caixa.hidden = true;
      caixa.textContent = '';
      return;
    }
    caixa.hidden = false;
    caixa.className = 'aviso ' + (tipo || 'neutro');
    caixa.textContent = texto;
  }

  function liberar(liberado) {
    ['sec-etapa', 'sec-qr', 'sec-fotos', 'sec-conferir', 'sec-veredito', 'sec-avancado'].forEach(function (id) {
      if (liberado) {
        el(id).removeAttribute('data-bloqueado');
      } else {
        el(id).setAttribute('data-bloqueado', '1');
      }
    });
  }

  // --- A0. Assistente: um passo aberto por vez -----------------------------

  // 'concluido' NÃO é um checkbox que alguém marca: é DERIVADO do estado real
  // (tem token? etapa definida? etiqueta pronta? foto enviada?). Voltar a um
  // passo e desfazer a escolha reabre o caminho sozinho, sem nenhum
  // "passo.feito = false" espalhado pelos handlers.
  var PASSOS = [
    {
      nome: 'login',
      secao: 'sec-login',
      concluido: function () { return !!estado.token; },
      texto: function () { return estado.usuario || 'não conectado'; }
    },
    {
      nome: 'etapa',
      secao: 'sec-etapa',
      concluido: function () { return estado.etapaDefinida; },
      texto: function () {
        if (!estado.etapaDefinida) { return 'a escolher'; }
        if (!estado.etapa) { return 'sem etapa — checklist inteira'; }
        return nomeDaEtapa(estado.etapa);
      }
    },
    {
      nome: 'etiqueta',
      secao: 'sec-qr',
      concluido: function () { return !!estado.etiquetaPronta; },
      // O resumo diz DE ONDE veio a etiqueta e o tamanho do texto — nunca um
      // campo dela. Quem interpreta o payload do QR é a API (contrato do
      // CLAUDE.md); a página exibiria um "peça 847233" que ela mesma teria
      // extraído, e aí o front passaria a ter opinião sobre a fonte da verdade.
      texto: function () {
        if (!estado.etiquetaPronta) { return 'a ler'; }
        return estado.origemEtiqueta + ' · ' +
          el('payload').value.trim().length + ' caracteres';
      }
    },
    {
      nome: 'fotos',
      secao: 'sec-fotos',
      concluido: function () { return fotosEnviadas().length > 0; },
      texto: function () {
        var enviadas = fotosEnviadas();
        if (estado.checklistEstado === 'carregando' || estado.checklistEstado === 'nao-carregada') {
          return enviadas.length ? enviadas.length + ' foto(s)' : 'aguardando a checklist';
        }
        var alvo = fontesAlvo();
        if (!alvo.length) {
          return enviadas.length ? enviadas.length + ' foto(s)' : 'nenhuma foto';
        }
        var feitas = alvo.filter(function (fonte) { return !!estado.fotos[fonte]; });
        return feitas.length + ' de ' + alvo.length + ' fotos';
      }
    },
    {
      nome: 'conferir',
      secao: 'sec-conferir',
      concluido: function () { return !!estado.temVeredito; },
      texto: function () {
        if (estado.temVeredito) { return 'conferência feita'; }
        var enviadas = fotosEnviadas();
        return enviadas.length ? enviadas.length + ' foto(s) prontas' : 'aguardando fotos';
      }
    },
    {
      nome: 'veredito',
      secao: 'sec-veredito',
      concluido: function () { return !!estado.temVeredito; },
      texto: function () { return estado.vereditoTexto || 'ainda não'; }
    }
  ];

  function indiceDoPasso(nome) {
    for (var i = 0; i < PASSOS.length; i += 1) {
      if (PASSOS[i].nome === nome) { return i; }
    }
    return 0;
  }

  function atualizarPassos() {
    var atual = indiceDoPasso(estado.passo);
    PASSOS.forEach(function (passo, indice) {
      var classe = 'passo';
      if (passo.nome === estado.passo) {
        classe += ' atual';
      } else if (passo.concluido()) {
        classe += ' concluido';
      } else if (indice < atual) {
        // Passo pulado (etapa opcional, por exemplo): continua clicável, mas
        // não finge estar resolvido.
        classe += ' pendente';
      } else {
        classe += ' futuro';
      }
      el(passo.secao).className = classe;
      el('resumo-' + passo.nome).textContent = passo.texto();
    });
  }

  function irPara(nome) {
    estado.passo = nome;
    atualizarPassos();
    var secao = el(PASSOS[indiceDoPasso(nome)].secao);
    if (secao.scrollIntoView) {
      secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // AVANÇO AUTOMÁTICO, e só onde não há ambiguidade: o próximo passo é o
  // primeiro ainda não concluído. Se tudo adiante já estiver resolvido, para
  // no passo 4 — que é onde mora a única ação que gasta crédito AWS, e essa
  // ninguém dispara pelo operador.
  function avancarDe(nome) {
    for (var i = indiceDoPasso(nome) + 1; i < PASSOS.length; i += 1) {
      if (!PASSOS[i].concluido()) {
        irPara(PASSOS[i].nome);
        return;
      }
    }
    irPara('conferir');
  }

  PASSOS.forEach(function (passo) {
    el('cab-' + passo.nome).addEventListener('click', function () {
      // Passo futuro é indicado, não navegável: pular a etiqueta e cair nas
      // fotos produziria um 422 que o time leria como defeito da peça.
      if (el(passo.secao).className.indexOf('futuro') !== -1) { return; }
      irPara(passo.nome);
    });
  });

  // Erro cru da API + tradução. O cru vem primeiro porque é o que se cola no
  // chat do time; a explicação vem logo atrás porque é o que destrava quem
  // está com o celular na mão.
  function mensagemDeErro(corpo, status) {
    var cru = 'HTTP ' + status + ' — falha na chamada da API.';

    if (corpo && corpo.errors && typeof corpo.errors === 'object') {
      var partes = Object.keys(corpo.errors).map(function (chave) {
        var valor = corpo.errors[chave];
        return chave + ': ' + (typeof valor === 'string' ? valor : JSON.stringify(valor));
      });
      if (partes.length) {
        cru = 'HTTP ' + status + ' — ' + partes.join(' | ');
      }
    } else if (corpo && typeof corpo.message === 'string') {
      cru = 'HTTP ' + status + ' — ' + corpo.message;
    }

    var explicacao = explicacaoDoErro(cru);
    return explicacao ? explicacao + ' [' + cru + ']' : cru;
  }

  function pedir(caminho, opcoes) {
    var config = opcoes || {};
    var cabecalhos = config.headers || {};
    if (estado.token) {
      cabecalhos.Authorization = 'Bearer ' + estado.token;
    }
    config.headers = cabecalhos;
    return fetch(caminho, config).then(function (resposta) {
      return resposta.text().then(function (texto) {
        var corpo = null;
        if (texto) {
          try { corpo = JSON.parse(texto); } catch (e) { corpo = { message: texto }; }
        }
        return { ok: resposta.ok, status: resposta.status, corpo: corpo };
      });
    });
  }

  // --- A. Passo 0: login --------------------------------------------------

  function mostrarLoginCompacto(usuario) {
    estado.usuario = usuario;
    el('login-corpo').hidden = true;
    el('btn-trocar-login').hidden = false;
    aviso('login-aviso', '');
    atualizarPassos();
  }

  function mostrarLoginAberto() {
    estado.usuario = null;
    el('login-corpo').hidden = false;
    el('btn-trocar-login').hidden = true;
    atualizarPassos();
  }

  el('btn-trocar-login').addEventListener('click', function () {
    estado.token = null;
    liberar(false);
    mostrarLoginAberto();
    irPara('login');
    aviso('login-aviso', 'Sessão encerrada nesta página — entre de novo.', 'neutro');
  });

  el('btn-login').addEventListener('click', function () {
    var botao = el('btn-login');
    botao.disabled = true;
    aviso('login-aviso', 'Conectando...', 'neutro');

    pedir(API + '/auth/email/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: el('email').value, password: el('senha').value })
    }).then(function (resposta) {
      if (!resposta.ok || !resposta.corpo || !resposta.corpo.token) {
        liberar(false);
        mostrarLoginAberto();
        aviso('login-aviso', mensagemDeErro(resposta.corpo, resposta.status), 'erro');
        return;
      }
      estado.token = resposta.corpo.token;
      liberar(true);
      var usuario = resposta.corpo.user && resposta.corpo.user.email ? resposta.corpo.user.email : el('email').value;
      mostrarLoginCompacto(usuario);
      aviso('login-aviso', 'Conectado. Buscando as etapas da linha e a checklist do modelo desta peça...', 'neutro');
      // O assistente SÓ avança com os dados na mão. Abrir os passos antes da
      // checklist chegar era a janela em que a tela pedia foto de vista que a
      // etapa não confere (a placa no gate da adesivação, relatado no celular).
      // O custo é uma espera de uma requisição; o benefício é nunca instruir
      // errado.
      carregarRecorte().then(function () {
        aviso('login-aviso', '');
        // A etapa deste aparelho já pode ter vindo da URL ou da memória local:
        // nesse caso o assistente pula o passo 1 sozinho.
        avancarDe('login');
      });
    }).catch(function (erro) {
      liberar(false);
      mostrarLoginAberto();
      aviso('login-aviso', 'Falha de rede: ' + erro.message, 'erro');
    }).then(function () {
      botao.disabled = false;
    });
  });

  // --- B. Recorte por etapa: PRONTO da API ---------------------------------

  // O que cada etapa confere não é calculado aqui e nem é constante desta
  // página: vem de GET /conferencias/plano-de-fotos já recortado por etapa
  // (semântica cumulativa aplicada no servidor — a etapa N confere o que ela e
  // as anteriores gravaram). A página faz CONSULTA DE PERTENCIMENTO: "esta
  // vista está nas vistas desta etapa?". Antes existiam três cópias da regra
  // aqui dentro; duas telas discordando sobre o recorte é exatamente o tipo de
  // divergência que o CLAUDE.md manda matar na origem.
  //
  // ESTADOS, e por que eles existem separados: enquanto a checklist não chega,
  // a página NÃO SABE quais vistas a etapa exige — e "não sei" nunca pode ser
  // renderizado como "preciso de todas". Era o bug do celular: no gate da
  // adesivação a tela pedia a placa, que só é fixada na última etapa. É o mesmo
  // erro que a engine evita no backend ("não sei" vira nao_conferivel, nunca
  // conforme), aqui na forma de instrução ao operador.
  //
  // Falhou a busca? O fallback permissivo continua (todas as vistas visíveis,
  // upload liberado), mas ele se ANUNCIA na tela — fallback disfarçado de
  // instrução é o que confundiu quem estava com o celular na mão.
  // Enquanto a checklist não chegou, os passos que DEPENDEM dela ficam
  // intocáveis. O aviso de estado já explicava a espera, mas a grade de etapas
  // continuava clicável — e escolher a etapa nessa janela mostrava um passo 3
  // sem nada a fazer. Bloquear é mais honesto que explicar.
  function bloquearPelaChecklist(bloquear) {
    ['sec-etapa', 'sec-fotos', 'sec-conferir'].forEach(function (id) {
      if (bloquear) {
        el(id).setAttribute('data-bloqueado', '1');
      } else if (estado.token) {
        el(id).removeAttribute('data-bloqueado');
      }
    });
  }

  // vistas[] do plano -> { fonteFisica: [item] }. Índice de consulta, não
  // transformação: o conteúdo de cada vista é o que a API mandou, intacto.
  function indexarVistas(vistas) {
    var mapa = {};
    (vistas || []).forEach(function (vista) {
      if (!vista || typeof vista.fonteFisica !== 'string') { return; }
      mapa[vista.fonteFisica] = (vista.campos || []).slice();
    });
    return mapa;
  }

  function carregarRecorte() {
    estado.checklistEstado = 'carregando';
    bloquearPelaChecklist(true);
    montarFotos();
    atualizarPassos();
    return pedir(API + '/conferencias/plano-de-fotos').then(function (resposta) {
      if (!resposta.ok || !resposta.corpo) {
        // A tradução de chão de fábrica (projeto-modelo-indeterminado,
        // checklist-invalido) já sai daqui pronta para a tela.
        throw new Error(mensagemDeErro(resposta.corpo, resposta.status));
      }

      var plano = resposta.corpo;
      if (!plano.pecaInteira || !plano.checklist || !plano.checklist.length) {
        throw new Error('a API respondeu um plano de fotos sem checklist');
      }

      var ordens = {};
      var nomes = {};
      var porEtapa = {};
      (plano.etapas || []).forEach(function (gate) {
        if (!gate || !gate.etapa || typeof gate.etapa.codigo !== 'string') { return; }
        ordens[gate.etapa.codigo] = gate.etapa.ordem;
        nomes[gate.etapa.codigo] = gate.etapa.nome || gate.etapa.codigo;
        porEtapa[gate.etapa.codigo] = indexarVistas(gate.vistas);
      });

      estado.plano = plano;
      estado.checklist = plano.checklist;
      estado.ordemPorCodigo = ordens;
      estado.nomePorCodigo = nomes;
      estado.vistasPorEtapa = porEtapa;
      estado.vistasDaPeca = indexarVistas(plano.pecaInteira.vistas);
      estado.checklistEstado = 'pronta';
      estado.motivoDaFalha = '';
      bloquearPelaChecklist(false);
      // atualizarTextoEtapa remonta a lista de fotos com o recorte no lugar.
      atualizarTextoEtapa();
      // O modo avançado nasceu com a tabela de fallback: refaz o formulário
      // com os campos reais do projeto e devolve o preset preenchido.
      montarLeituras();
      aplicarPreset(estado.preset || PRESET_DEMO);
    }).catch(function (erro) {
      estado.plano = null;
      estado.vistasDaPeca = null;
      estado.vistasPorEtapa = null;
      estado.checklistEstado = 'falhou';
      estado.motivoDaFalha = erro.message;
      // Falha NÃO bloqueia: o fallback permissivo continua liberado, só que
      // anunciado (ver estadoDoPasso3). Travar a página por causa de uma busca
      // que falhou tiraria do time a única ferramenta de teste que ele tem.
      bloquearPelaChecklist(false);
      atualizarTextoEtapa();
    });
  }

  function ordemDaEtapaAtual() {
    if (!estado.etapa || !estado.ordemPorCodigo) { return undefined; }
    return estado.ordemPorCodigo[estado.etapa];
  }

  // As vistas que a etapa ATUAL pede, como a API as recortou. null = não há
  // etapa escolhida, ou o código escolhido não é um gate que a API conhece.
  function vistasDoGateAtual() {
    if (!estado.etapa || !estado.vistasPorEtapa) { return null; }
    return estado.vistasPorEtapa[estado.etapa] || null;
  }

  // Este aparelho está apontado para uma etapa que NÃO EXISTE na linha
  // (?etapa= com erro de digitação, ou gate que ninguém seedou). Caso distinto
  // de "sem etapa": lá o operador escolheu conferir a peça inteira e a página
  // sabe o que pedir; aqui ela não sabe nada, e "não sei" nunca pode ser
  // renderizado como "preciso de todas" (o invariante do topo desta seção).
  // Sem esta pergunta os dois caíam no mesmo null de vistasDoGateAtual().
  function etapaDesconhecida() {
    if (!estado.etapa || estado.checklistEstado !== 'pronta') { return false; }
    return !estado.vistasPorEtapa || !estado.vistasPorEtapa[estado.etapa];
  }

  function nomesDosCampos(itens) {
    return (itens || []).map(function (item) { return item.campo; });
  }

  // Em que etapa a marcação desta vista passa a existir na peça — para o cartão
  // dizer "só é marcada na etapa 4". EXIBIÇÃO, não regra: quem decidiu que a
  // vista está fora deste gate foi a API; aqui só se lê o menor 'entraNaEtapa'
  // dos campos dela para nomear a espera.
  function entradaNaLinha(itens) {
    var achada = null;
    (itens || []).forEach(function (item) {
      var entra = item ? item.entraNaEtapa : null;
      if (!entra || typeof entra.ordem !== 'number') { return; }
      if (!achada || entra.ordem < achada.ordem) {
        achada = { ordem: entra.ordem, nome: entra.nome || entra.codigo };
      }
    });
    return achada;
  }

  // Situação de uma fonte física: 'desta-etapa' | 'fora-etapa' | 'sem-etapa'
  // (etapa não escolhida ou desconhecida) | 'fora-da-checklist' | 'indefinido'
  // (o plano da API ainda não chegou).
  //
  // É CONSULTA ao plano, nunca recálculo: "esta vista está na lista de vistas
  // que a API mandou para esta etapa?". Os campos exibidos também são os do
  // gate — no gate da adesivação o topo tem só a série chumbada, porque o
  // patrimônio ainda não foi serigrafado.
  function situacaoDaFonte(fonte) {
    if (!estado.vistasDaPeca) { return { situacao: 'indefinido', campos: [], itens: [] }; }
    var daPeca = estado.vistasDaPeca[fonte];
    if (!daPeca) { return { situacao: 'fora-da-checklist', campos: [], itens: [] }; }

    var doGate = vistasDoGateAtual();
    if (!doGate) {
      // Etapa que a linha não conhece: a página não tem recorte nenhum para
      // consultar, e listar os campos da PEÇA aqui viraria "fotografe tudo" —
      // instrução infundada que termina em 422 etapa-desconhecida. 'indefinido'
      // já é o estado de "não sei": fica fora de fontesAlvo(), não pede foto e
      // deixa o upload como escape discreto, igual ao fallback de falha.
      if (etapaDesconhecida()) { return { situacao: 'indefinido', campos: [], itens: [] }; }
      return { situacao: 'sem-etapa', campos: nomesDosCampos(daPeca), itens: daPeca };
    }
    if (doGate[fonte]) {
      return { situacao: 'desta-etapa', campos: nomesDosCampos(doGate[fonte]), itens: doGate[fonte] };
    }

    // O NÚMERO da etapa em que a marcação nasce entra junto: "é gravada na
    // etapa 4" localiza o operador na linha melhor que só o nome dela.
    var entrada = entradaNaLinha(daPeca);
    return {
      situacao: 'fora-etapa',
      campos: nomesDosCampos(daPeca),
      itens: daPeca,
      entraEm: entrada ? entrada.nome : null,
      ordemQueGrava: entrada ? entrada.ordem : null
    };
  }

  var PESO_SITUACAO = {
    'desta-etapa': 0,
    'sem-etapa': 1,
    'indefinido': 1,
    'fora-etapa': 2,
    'fora-da-checklist': 3
  };

  function fontesDesta(situacaoAlvo) {
    return fontesOrdenadas().filter(function (fonte) {
      return situacaoDaFonte(fonte).situacao === situacaoAlvo;
    });
  }

  // A vista tem algo acontecendo (foto, envio em voo, falha)? Estado NUNCA se
  // esconde atrás do recolhido: uma foto enviada por engano na vista errada
  // precisa continuar visível para ser vista e corrigida.
  function temEstado(fonte) {
    return !!estado.fotos[fonte] || !!estado.enviando[fonte] || !!estado.falhas[fonte];
  }

  // As fotos que ESTA etapa pede. É a base do progresso do passo 3 — a
  // pergunta "o que falta agora" tem resposta contável, não 9 cartões iguais.
  //
  // 'indefinido' (a checklist ainda não chegou) NÃO é alvo, de propósito: sem
  // a checklist a página não sabe o que a etapa exige, e pedir tudo "por
  // garantia" é transformar ausência de informação em afirmação — foi o que
  // fez o gate da adesivação pedir a foto da placa, que nem existe na peça
  // naquele ponto do fluxo.
  function fontesAlvo() {
    if (estado.checklistEstado !== 'pronta') { return []; }
    return fontesOrdenadas().filter(function (fonte) {
      var situacao = situacaoDaFonte(fonte).situacao;
      return situacao === 'desta-etapa' || situacao === 'sem-etapa';
    });
  }

  // Vistas em destaque = as que a etapa pede + as que já têm estado. O resto
  // vai para "outras vistas" (recolhido): a base e a lateral esquerda não têm
  // marcação na checklist da demo, e listá-las com o mesmo peso é o que fazia
  // o time se perder no passo 3.
  //
  // Sem checklist não há destaque nenhum: com 'carregando' a lista fica VAZIA
  // (o passo 3 mostra só o estado de carregamento) e com 'falhou' todas
  // aparecem, mas embaixo de um aviso que diz que a página não sabe qual a
  // etapa exige.
  function fontesPrincipais() {
    if (estado.checklistEstado === 'carregando' || estado.checklistEstado === 'nao-carregada') {
      return fontesOrdenadas().filter(temEstado);
    }
    if (estado.checklistEstado === 'falhou') {
      return fontesOrdenadas();
    }
    var alvo = fontesAlvo();
    return fontesOrdenadas().filter(function (fonte) {
      return alvo.indexOf(fonte) !== -1 || temEstado(fonte);
    });
  }

  // Sem checklist não existe "outras vistas": rotular 9 cartões de
  // "nenhuma precisa de foto agora" seria afirmar o que a página não sabe — o
  // mesmo erro do bug, só mais discreto. Enquanto carrega, quem fala é o aviso
  // de estado, e a lista fica vazia.
  function fontesRecolhidas() {
    if (estado.checklistEstado !== 'pronta') { return []; }
    var principais = fontesPrincipais();
    return fontesOrdenadas().filter(function (fonte) {
      return principais.indexOf(fonte) === -1;
    });
  }

  // Uma vista = um cartão = uma foto. Não existe mais agrupamento nem
  // numeração: o eixo de fonteFisica é a VISTA da peça, e "qual é o chumbado
  // 2" — a pergunta sem gabarito que o agrupamento resolvia — deixou de
  // existir junto com o eixo antigo.
  function resumoDeFontes(lista) {
    return lista.join(', ');
  }

  // Ordem de exibição: primeiro as vistas que a etapa confere.
  function fontesOrdenadas() {
    var lista = FONTES.slice();
    if (estado.vistasDaPeca) {
      Object.keys(estado.vistasDaPeca).forEach(function (fonte) {
        if (lista.indexOf(fonte) === -1) { lista.push(fonte); }
      });
    }
    return lista.map(function (fonte, indice) {
      return { fonte: fonte, indice: indice, peso: PESO_SITUACAO[situacaoDaFonte(fonte).situacao] };
    }).sort(function (a, b) {
      return a.peso === b.peso ? a.indice - b.indice : a.peso - b.peso;
    }).map(function (item) { return item.fonte; });
  }

  // Qual modelo mandou este plano de fotos. Aparece porque a lista de fotos só
  // faz sentido presa a um projeto: modelo diferente, fotos diferentes.
  function prefixoDoProjeto() {
    var projeto = estado.plano ? estado.plano.projeto : null;
    return projeto && projeto.codigo ? 'Projeto ' + projeto.codigo + ' · ' : '';
  }

  function atualizarTextoRecorte() {
    var alvo = el('fotos-recorte');
    // Sem checklist, quem fala é o aviso de estado (estadoDoPasso3): esta linha
    // não pode inventar recorte nenhum.
    if (estado.checklistEstado !== 'pronta') {
      alvo.textContent = '';
      return;
    }
    if (!estado.etapaDefinida) {
      alvo.textContent = 'Escolha a etapa no passo 1 para a página saber quais fotos pedir.';
      return;
    }
    if (!estado.etapa) {
      alvo.textContent = prefixoDoProjeto() +
        'Sem etapa escolhida: a conferência cobra a peça inteira, então a página pede as ' +
        fontesAlvo().length + ' fotos da checklist do modelo.';
      return;
    }
    if (ordemDaEtapaAtual() === undefined) {
      alvo.textContent = 'A etapa "' + estado.etapa + '" não está cadastrada na linha, então a página não sabe ' +
        'quais fotos ela pede e não pede nenhuma. Confira o ?etapa= da URL com o time ou escolha uma ' +
        'etapa acima.';
      return;
    }
    var doGate = fontesDesta('desta-etapa');
    alvo.textContent = prefixoDoProjeto() +
      'Esta etapa fecha com ' + doGate.length + ' foto(s): ' + resumoDeFontes(doGate) +
      '. Ela confere as marcações desta etapa e das anteriores — as marcações das etapas seguintes ' +
      'ainda não existem na peça, e por isso não são pedidas aqui.';
  }

  // --- C. Passo 1: etapa --------------------------------------------------

  // Só entra em cena antes de a API responder: os nomes de verdade (e a ordem)
  // vêm dos Checkpoints do banco.
  var ETAPAS_FALLBACK = [
    { codigo: 'adesivacao', nome: 'Adesivação' },
    { codigo: 'serigrafia', nome: 'Serigrafia' },
    { codigo: 'oleo-conferencia', nome: 'Óleo e conferência' },
    { codigo: 'fixacao-placa', nome: 'Fixação da placa' }
  ];

  function nomeDaEtapa(codigo) {
    if (estado.nomePorCodigo && estado.nomePorCodigo[codigo]) {
      return estado.nomePorCodigo[codigo];
    }
    var achada = null;
    ETAPAS_FALLBACK.forEach(function (etapa) {
      if (etapa.codigo === codigo) { achada = etapa.nome; }
    });
    return achada || codigo;
  }

  function etapasConhecidas() {
    if (!estado.ordemPorCodigo) { return ETAPAS_FALLBACK; }
    return Object.keys(estado.ordemPorCodigo).map(function (codigo) {
      return { codigo: codigo, nome: nomeDaEtapa(codigo), ordem: estado.ordemPorCodigo[codigo] };
    }).sort(function (a, b) { return a.ordem - b.ordem; });
  }

  // Quantas vistas a etapa X cobra — lido direto do plano da API, para uma
  // etapa que ainda não é a atual: é o que faz o botão dizer "pede 3 fotos"
  // ANTES de ser tocado.
  function vistasDaEtapa(codigo) {
    var doGate = estado.vistasPorEtapa ? estado.vistasPorEtapa[codigo] : null;
    return doGate ? Object.keys(doGate) : [];
  }

  // A grade nasce dos dados, não do HTML: etapa nova no seed aparece aqui sem
  // tocar esta página, e cada botão já diz o que aquele gate confere.
  function montarEtapas() {
    var html = etapasConhecidas().map(function (etapa) {
      var vistas = vistasDaEtapa(etapa.codigo);
      var sub = etapa.codigo;
      if (vistas.length) {
        sub = 'pede ' + vistas.length + ' foto(s)' +
          (vistas.length <= 3 ? ': ' + resumoDeFontes(vistas) : '');
      }
      return '<button type="button" class="secundario etapa" data-codigo="' + esc(etapa.codigo) +
        '" aria-pressed="' + (estado.etapaDefinida && estado.etapa === etapa.codigo ? 'true' : 'false') + '">' +
        '<span class="nome-etapa">' + esc(etapa.nome) + '</span>' +
        '<span class="sub-etapa">' + esc(sub) + '</span></button>';
    }).join('');

    html += '<button type="button" class="secundario etapa sem-etapa" data-codigo=""' +
      ' aria-pressed="' + (estado.etapaDefinida && !estado.etapa ? 'true' : 'false') + '">' +
      '<span class="nome-etapa">Nenhuma etapa: conferir a peça inteira</span>' +
      '<span class="sub-etapa">pede todas as fotos do modelo de uma vez — para testar a peça pronta, não um ponto da linha</span></button>';

    el('grade-etapas').innerHTML = html;
  }

  function atualizarTextoEtapa() {
    var dica = el('etapa-dica');
    if (estado.checklistEstado === 'falhou') {
      dica.textContent = 'Não consegui carregar o plano de fotos do modelo, então não sei quantas ' +
        'fotos cada etapa pede — os botões abaixo são as etapas conhecidas da linha, sem essa conta. ' +
        'Motivo: ' + estado.motivoDaFalha;
    } else if (estado.checklistEstado === 'carregando') {
      dica.textContent = 'Buscando na API as etapas da linha e o plano de fotos deste modelo...';
    } else if (!estado.etapaDefinida) {
      dica.textContent = 'Escolha em que ponto da linha este celular está. Cada botão diz quantas fotos aquele ponto pede.';
    } else if (!estado.etapa) {
      dica.textContent = 'Conferindo a peça inteira: a página vai pedir todas as fotos do modelo, não só as de um ponto da linha.';
    } else if (etapaDesconhecida()) {
      dica.textContent = 'A etapa "' + estado.etapa + '" não existe na linha — confira o ?etapa= da URL ou ' +
        'escolha abaixo em que ponto este celular está. Até lá a página não pede foto nenhuma, e a ' +
        'conferência seria recusada pela API (etapa-desconhecida).';
    } else {
      dica.textContent = 'Este celular está fazendo o papel da câmera de ' + nomeDaEtapa(estado.etapa) +
        '. A conferência fica registrada nesse ponto da linha e confere as marcações que já existem na peça aqui — ' +
        'as das etapas seguintes ainda não foram gravadas.';
    }
    atualizarTextoRecorte();
    montarEtapas();
    montarFotos();
    atualizarBotaoExtrair();
    atualizarPassos();
  }

  function selecionarEtapa(codigo) {
    estado.etapa = codigo;
    atualizarTextoEtapa();
  }

  // Memória do APARELHO: cada celular simula uma câmera fixa, e a etapa é
  // praticamente constante para ele. Repetir essa escolha a cada teste é a
  // decisão mais repetida da página — e a mais fácil de eliminar.
  var CHAVE_ETAPA = 'trael-demo-etapa';

  function guardarEtapa() {
    try {
      window.localStorage.setItem(CHAVE_ETAPA, estado.etapa || '');
    } catch (erro) {
      estado.semMemoria = String(erro);
    }
  }

  function etapaGuardada() {
    try {
      return window.localStorage.getItem(CHAVE_ETAPA);
    } catch (erro) {
      estado.semMemoria = String(erro);
      return null;
    }
  }

  function escolherEtapa(codigo) {
    var limpo = typeof codigo === 'string' ? codigo.trim() : '';
    estado.etapa = limpo === '' ? null : limpo;
    estado.etapaDefinida = true;
    guardarEtapa();
    atualizarTextoEtapa();
    avancarDe('etapa');
  }

  // Delegação: a grade é remontada quando os checkpoints chegam da API, e
  // religar listener a cada remontagem é como se perde clique no celular.
  //
  // Quem identifica o botão é o ATRIBUTO data-codigo, nunca a classe: os
  // <span class="nome-etapa"> / <span class="sub-etapa"> DENTRO do botão casam
  // a substring 'etapa' e não têm data-codigo, então clicar no texto (que é
  // onde o dedo cai) lia null e gravava "peça inteira" calado — a etapa errada,
  // sem nenhum sinal na tela. Distinção que importa: o botão "Nenhuma etapa"
  // tem data-codigo="" (string VAZIA, não null) e continua valendo.
  el('grade-etapas').addEventListener('click', function (evento) {
    var alvo = evento.target;
    for (var salto = 0; alvo && salto < 4; salto += 1) {
      if (alvo.getAttribute && alvo.getAttribute('data-codigo') !== null) {
        escolherEtapa(alvo.getAttribute('data-codigo'));
        return;
      }
      alvo = alvo.parentNode;
    }
  });

  // Cada celular abre a URL da SUA etapa (?etapa=serigrafia): é o que, em
  // produção, virá provisionado na câmera fixa. A URL VENCE a memória local —
  // quem digitou o endereço está dizendo qual câmera este aparelho é agora.
  function etapaDaUrl() {
    var busca = window.location.search || '';
    var achado = /[?&]etapa=([^&]*)/.exec(busca);
    if (!achado) { return null; }
    var codigo = decodeURIComponent(achado[1].replace(/\\+/g, ' ')).trim();
    return codigo === '' ? null : codigo;
  }

  function restaurarEtapa() {
    var daUrl = etapaDaUrl();
    if (daUrl !== null) {
      estado.etapaDefinida = true;
      selecionarEtapa(daUrl);
      guardarEtapa();
      return;
    }
    var guardada = etapaGuardada();
    if (guardada === null) { return; }
    estado.etapaDefinida = true;
    selecionarEtapa(guardada === '' ? null : guardada);
  }

  // --- D. Passo 2: QR -----------------------------------------------------

  var suportaQr = 'BarcodeDetector' in window;
  if (!suportaQr) {
    el('btn-camera').hidden = true;
    aviso('qr-aviso', 'Seu navegador não suporta leitura de QR — digite ou cole o conteúdo da etiqueta abaixo.', 'neutro');
  }

  function pararCamera() {
    if (estado.camera) {
      estado.camera.getTracks().forEach(function (trilha) { trilha.stop(); });
      estado.camera = null;
    }
    el('video').srcObject = null;
    el('camera-area').hidden = true;
  }

  el('btn-parar-camera').addEventListener('click', function () {
    pararCamera();
    aviso('qr-aviso', 'Câmera desligada.', 'neutro');
  });

  // A etiqueta está "pronta" quando o operador CONFIRMOU de onde ela veio —
  // QR lido, atalho de teste ou texto aceito. A página não olha o conteúdo:
  // quem interpreta o payload é a API (contrato do CLAUDE.md).
  function marcarEtiqueta(origem, avancar) {
    if (!el('payload').value.trim()) {
      aviso('qr-aviso', 'O conteúdo da etiqueta está vazio — leia o QR, use o atalho de teste ou cole o texto.', 'erro');
      return;
    }
    estado.etiquetaPronta = true;
    estado.origemEtiqueta = origem;
    atualizarPassos();
    if (avancar) { avancarDe('etiqueta'); }
  }

  el('btn-etiqueta-demo').addEventListener('click', function () {
    el('payload').value = ETIQUETA_DEMO;
    el('qr-bruto-texto').textContent = ETIQUETA_DEMO;
    el('qr-bruto').hidden = false;
    aviso('qr-aviso', 'Etiqueta da peça de demonstração preenchida (atalho de teste — em produção quem lê é a câmera).', 'ok');
    marcarEtiqueta('atalho de teste', true);
  });

  el('btn-usar-etiqueta').addEventListener('click', function () {
    marcarEtiqueta('digitada ou colada', true);
  });

  el('payload').addEventListener('input', function () {
    if (estado.etiquetaPronta) {
      estado.origemEtiqueta = 'editada à mão';
      atualizarPassos();
    }
  });

  el('btn-copiar-qr').addEventListener('click', function () {
    var texto = el('qr-bruto-texto').textContent || '';
    var pronto = function () { aviso('qr-aviso', 'Conteúdo bruto copiado.', 'ok'); };
    var falhou = function () { aviso('qr-aviso', 'Não consegui copiar — selecione o texto à mão.', 'erro'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(pronto, falhou);
      return;
    }
    try {
      var faixa = document.createRange();
      faixa.selectNodeContents(el('qr-bruto-texto'));
      var selecao = window.getSelection();
      selecao.removeAllRanges();
      selecao.addRange(faixa);
      document.execCommand('copy') ? pronto() : falhou();
    } catch (erro) {
      falhou();
    }
  });

  el('btn-camera').addEventListener('click', function () {
    if (!suportaQr) { return; }
    aviso('qr-aviso', 'Abrindo a câmera...', 'neutro');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (fluxo) {
        estado.camera = fluxo;
        var video = el('video');
        video.srcObject = fluxo;
        el('camera-area').hidden = false;
        return video.play().then(function () {
          aviso('qr-aviso', 'Aponte para o QR da etiqueta.', 'neutro');
          var detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          var procurar = function () {
            if (!estado.camera) { return; }
            detector.detect(video).then(function (codigos) {
              if (codigos && codigos.length && codigos[0].rawValue) {
                var bruto = codigos[0].rawValue;
                el('payload').value = bruto;
                el('qr-bruto-texto').textContent = bruto;
                el('qr-bruto').hidden = false;
                pararCamera();
                aviso('qr-aviso', 'QR lido — o conteúdo bruto está abaixo, exatamente como veio da etiqueta.', 'ok');
                // Leitura bem-sucedida não tem ambiguidade nenhuma: segue
                // direto para as fotos.
                marcarEtiqueta('lida do QR', true);
                return;
              }
              window.setTimeout(procurar, 300);
            }).catch(function () {
              window.setTimeout(procurar, 500);
            });
          };
          procurar();
        });
      })
      .catch(function (erro) {
        pararCamera();
        aviso('qr-aviso', 'Não foi possível abrir a câmera: ' + erro.message + '. Digite ou cole o conteúdo abaixo.', 'erro');
      });
  });

  // --- E. Passo 3: fotos --------------------------------------------------

  // O rótulo tem de responder "por que este cartão está aqui" sem ninguém
  // explicar. As três situações são coisas DIFERENTES e antes soavam iguais:
  //  - desta-etapa      -> pedido de agora;
  //  - fora-etapa       -> a marcação AINDA NÃO foi gravada na peça (o gate é
  //                        cumulativo, então "fora" só pode ser etapa
  //                        posterior — a placa no gate 1 é este caso);
  //  - fora-da-checklist-> ESTE MODELO não tem marcação nesta vista (nunca vai
  //                        ter, não é questão de esperar).
  function rotuloDaSituacao(info) {
    if (info.situacao === 'desta-etapa') { return 'precisa nesta etapa'; }
    if (info.situacao === 'fora-etapa') {
      // NÃO é "não é desta etapa" (que soa como preferência): a marcação
      // literalmente ainda não foi feita na peça. A placa de identificação é
      // rebitada na última etapa — no gate da adesivação não existe placa para
      // fotografar, e é isso que o cartão tem de dizer.
      if (!info.entraEm) { return 'ainda não existe na peça neste ponto da linha'; }
      var onde = info.ordemQueGrava
        ? 'etapa ' + info.ordemQueGrava + ' (' + info.entraEm + ')'
        : 'etapa ' + info.entraEm;
      return 'ainda não existe na peça — só é marcada na ' + onde;
    }
    if (info.situacao === 'indefinido') {
      // Nem "pedida" nem "ainda não existe": a página não tem o recorte desta
      // etapa (não chegou, falhou, ou a etapa não existe na linha). O cartão
      // fica como escape e manda ler o aviso, que é quem explica o motivo.
      return 'a página não sabe se esta vista é pedida agora — veja o aviso acima';
    }
    if (info.situacao === 'fora-da-checklist') {
      // Diferente do caso acima: aqui não é questão de esperar. O projeto deste
      // modelo não manda gravar nada nessa face, em etapa nenhuma — e isso não
      // é falta na peça, é o desenho dela. Sem essa frase o cartão soava como
      // "está faltando marcação aqui".
      return 'o projeto deste modelo não manda marcar este lado — nenhuma foto é pedida aqui, em etapa nenhuma';
    }
    return '';
  }

  function classeDoCartao(info) {
    var classe = 'item-foto';
    if (info.situacao === 'desta-etapa') { classe += ' desta-etapa'; }
    if (info.situacao === 'fora-etapa') { classe += ' fora-etapa'; }
    if (info.situacao === 'fora-da-checklist') { classe += ' fora-etapa'; }
    return classe;
  }

  // Uma vista é "pedida" só quando a checklist já disse que ela é pedida. Fora
  // disso o cartão existe como escape, e não pode ter cara de instrução.
  function ePedida(info) {
    return info.situacao === 'desta-etapa' || info.situacao === 'sem-etapa';
  }

  // COMO a marcação foi gravada na peça, dito pela API (tipoMarcacao do plano),
  // nunca deduzido aqui. 'indefinido' não vira chip: a página não afirma o que
  // não sabe — e o operador enquadra igual, o chip só ajuda a achar o número.
  function chipDaMarcacao(tipo) {
    if (tipo === 'relevo') { return '<span class="chip chip-relevo">RELEVO no metal</span>'; }
    if (tipo === 'tinta') { return '<span class="chip chip-tinta">TINTA (serigrafia)</span>'; }
    return '';
  }

  // O "o que eles querem desta foto", item a item: nome legível, como está
  // gravado e se é obrigatório. O nome canônico continua ali (linha discreta e
  // title) porque é ele que aparece no veredito e no chat do time.
  function trechoDosCampos(info) {
    var itens = info.itens || [];
    if (!itens.length) { return ''; }
    var verbo = ePedida(info)
      ? 'o sistema lê nesta foto:'
      : 'quando chegar a hora desta vista, lê:';
    var alvos = itens.map(function (item) {
      return '<span class="alvo" title="' + esc(item.campo) + '">' +
        '<span class="alvo-nome">' + esc(nomeLegivel(item.campo)) + '</span>' +
        chipDaMarcacao(item.tipoMarcacao) +
        '<span class="alvo-obrig">' + (item.obrigatorio ? '(obrigatório)' : '(opcional)') + '</span>' +
        '<span class="alvo-cru">' + esc(item.campo) + '</span>' +
        '</span>';
    }).join('');
    return '<span class="estado">' + verbo + '</span>' +
      '<span class="alvos">' + alvos + '</span>';
  }

  // Dica de CAPTURA, por vista: as duas vêm de medição do projeto — o relevo
  // lido de cima ganha dezenas de pontos de confiança (docs/visao-ocr.md), e
  // close mal enquadrado é a causa n.º 1 de "não conferível". É instrução de
  // enquadramento, jamais regra de conferência.
  function trechoDaDica(fonte, info) {
    if (!ePedida(info)) { return ''; }
    var dicas = [];
    var temRelevo = (info.itens || []).filter(function (item) {
      return item.tipoMarcacao === 'relevo';
    }).length > 0;
    if (temRelevo) { dicas.push('relevo lê melhor de cima — a luz do teto define o dígito'); }
    if (fonte === 'placa' || fonte === 'etiqueta') { dicas.push('close: aproxime até o texto encher o quadro'); }
    if (!dicas.length) { return ''; }
    return '<span class="dica-captura">' + esc(dicas.join(' · ')) + '</span>';
  }

  // Vista que carrega DUAS marcações ou mais (topo: série chumbada +
  // patrimônio serigrafado; frente: 3; placa: 2). Dizer isso no cartão é o que
  // faz o operador enquadrar as duas em vez de fotografar só a que enxergou.
  function trechoDasMarcacoes(info) {
    if (!ePedida(info) || !info.campos || info.campos.length < 2) { return ''; }
    return '<span class="multi">esta foto tem de mostrar ' + info.campos.length +
      ' marcações — enquadre todas de uma vez</span>';
  }

  function trechoDaMarca(info) {
    var rotulo = rotuloDaSituacao(info);
    return rotulo ? '<span class="marca-etapa">' + esc(rotulo) + '</span>' : '';
  }

  function textoDoEnvio(fonte) {
    if (estado.enviando[fonte]) { return 'enviando...'; }
    if (estado.falhas[fonte]) { return 'falhou'; }
    if (!estado.fotos[fonte]) { return 'sem foto'; }
    return estado.fotos[fonte].usadaEm
      ? 'enviada · já usada na conferência anterior'
      : 'enviada';
  }

  // Cartão de UMA vista: miniatura, o que aquela face alimenta na checklist e
  // as duas portas de captura. A vista é o destino da foto — nada a escolher.
  // "Galeria" existe porque repetir o teste é o uso real desta página: a foto
  // boa já está no rolo do celular, e obrigar a refotografar a peça a cada
  // rodada é fricção pura (em produção não existe nenhum dos dois — quem
  // captura é a câmera fixa).
  //
  // O BOTÃO SÓ FICA EM DESTAQUE QUANDO A FOTO É PEDIDA. Vista que a etapa não
  // cobra (a placa no gate da adesivação) ganha um botão discreto e escrito
  // como escape — "Enviar mesmo assim" —, nunca um "Fotografar" grande, que se
  // lê como ordem de serviço.
  function cartaoDaVista(fonte, info) {
    var foto = estado.fotos[fonte];
    var pedida = ePedida(info);
    var classePrincipal = pedida ? 'botao-foto grande' : 'botao-foto discreto';
    var rotuloPrincipal = foto
      ? (pedida ? 'Refotografar' : 'Trocar')
      : (pedida ? 'Fotografar' : 'Enviar mesmo assim');

    return '<div class="' + classeDoCartao(info) + (foto ? ' tem-foto' : '') +
      '" data-fonte="' + esc(fonte) + '">' +
      '<img class="miniatura" alt="" ' + (foto && foto.url ? 'src="' + esc(foto.url) + '"' : 'hidden') + '>' +
      '<span class="nome">' + esc(fonte) +
      trechoDaMarca(info) + trechoDasMarcacoes(info) + trechoDaDica(fonte, info) +
      trechoDosCampos(info) +
      '<span class="estado envio' + (estado.falhas[fonte] ? ' falhou' : '') + '">' +
      esc(textoDoEnvio(fonte)) + '</span></span>' +
      '<span class="acoes-vista">' +
      '<label class="' + classePrincipal + '">' + rotuloPrincipal +
      '<input type="file" accept="image/*" capture="environment" hidden></label>' +
      '<label class="botao-foto galeria' + (pedida ? '' : ' discreto') + '">Galeria' +
      '<input type="file" accept="image/*" hidden></label>' +
      '</span></div>';
  }

  function ligarEntradas(container) {
    Array.prototype.forEach.call(container.querySelectorAll('.item-foto'), function (cartao) {
      Array.prototype.forEach.call(cartao.querySelectorAll('input[type=file]'), function (entrada) {
        entrada.addEventListener('change', function (evento) {
          var arquivos = evento.target.files;
          if (!arquivos || !arquivos.length) { return; }
          // Uma foto por vista: se o operador escolher várias, a última vale —
          // refotografar substitui, nunca acumula slot escondido.
          enviarFoto(cartao.getAttribute('data-fonte'), arquivos[arquivos.length - 1]);
        });
      });
    });
  }

  // "Faltam 2 das 3 fotos desta etapa" responde de relance a única pergunta do
  // passo 3. A lista do que falta vem junto: saber que falta não adianta se
  // ainda for preciso caçar qual cartão está vazio. Fala em FOTOS, não em
  // "vistas do recorte" — "vista" só aparece como nome de cada cartão.
  function atualizarProgresso() {
    var caixa = el('fotos-progresso');
    var alvo = fontesAlvo();

    if (!alvo.length) {
      caixa.hidden = true;
      caixa.innerHTML = '';
      return;
    }

    var faltando = alvo.filter(function (fonte) { return !estado.fotos[fonte]; });
    var feitas = alvo.length - faltando.length;
    var pronto = faltando.length === 0;
    var ondeFecha = estado.etapa && ordemDaEtapaAtual() !== undefined
      ? 'desta etapa'
      : 'da peça inteira';
    var largura = Math.round((feitas / alvo.length) * 100);

    caixa.hidden = false;
    caixa.className = 'progresso' + (pronto ? ' completo' : '');
    var quantasFaltam = faltando.length === 1
      ? 'Falta 1 das ' + alvo.length + ' fotos '
      : 'Faltam ' + faltando.length + ' das ' + alvo.length + ' fotos ';

    caixa.innerHTML =
      '<div class="texto">' + (pronto
        ? 'Pronto: as ' + alvo.length + ' fotos ' + ondeFecha + ' já foram enviadas.'
        : quantasFaltam + ondeFecha + '.') +
      '</div>' +
      '<div class="barra"><div class="cheio" style="width:' + largura + '%"></div></div>' +
      (pronto
        ? '<div class="faltando">Pode seguir para o passo 4.</div>'
        : '<div class="faltando">Ainda falta fotografar: <b>' + esc(resumoDeFontes(faltando)) +
          '</b></div>');
  }

  // O passo 3 em três situações, e cada uma diz a verdade sobre o que a página
  // sabe. A do meio é a que faltava e virou bug no celular.
  function estadoDoPasso3() {
    if (estado.checklistEstado === 'pronta') {
      // Plano na mão, mas apontado para um gate que não existe: a página SABE
      // o que a peça tem e não sabe o que ESTA etapa pede. Sem esta frase o
      // caso se fundia com "peça inteira" e a tela mandava fotografar tudo.
      if (etapaDesconhecida()) {
        return ['erro',
          'A etapa "' + estado.etapa + '" deste aparelho não existe na linha, então NÃO SEI quais ' +
          'fotos ela pede — confira o ?etapa= da URL ou escolha uma etapa no passo 1. Nenhuma foto ' +
          'é pedida até isso ser corrigido; enviar continua liberado como escape.'];
      }
      return '';
    }
    if (estado.checklistEstado === 'falhou') {
      return ['erro',
        'Não consegui carregar da API o plano de fotos deste modelo, então NÃO SEI quais fotos ' +
        'esta etapa pede. Motivo: ' + estado.motivoDaFalha + ' — Consequência: a lista abaixo é ' +
        'a de TODAS as vistas possíveis da peça, não a desta etapa; confirme com o time o que ' +
        'fotografar. Fotografar e conferir continuam liberados.'];
    }
    return ['neutro',
      'Buscando na API o plano de fotos deste modelo (quais vistas esta etapa pede). Enquanto ' +
      'ele não chega, a página não tem como saber o que pedir — por isso ainda não pede foto ' +
      'nenhuma. É uma requisição só, leva um instante.'];
  }

  function montarFotos() {
    var situacaoGeral = estadoDoPasso3();
    if (situacaoGeral) {
      aviso('fotos-estado', situacaoGeral[1], situacaoGeral[0]);
    } else {
      aviso('fotos-estado', '');
    }

    var principais = fontesPrincipais();
    var recolhidas = fontesRecolhidas();

    el('lista-fotos').innerHTML = principais.map(function (fonte) {
      return cartaoDaVista(fonte, situacaoDaFonte(fonte));
    }).join('');
    ligarEntradas(el('lista-fotos'));

    // O <details> em si nunca é recriado: reabrir "outras vistas" a cada
    // upload seria uma fricção nova no lugar da que se está removendo.
    if (!recolhidas.length) {
      el('outras-vistas').hidden = true;
      el('lista-outras').innerHTML = '';
    } else {
      el('outras-vistas').hidden = false;
      el('outras-vistas-titulo').textContent =
        'Ver as outras ' + recolhidas.length + ' vistas da peça — nenhuma delas é pedida nesta ' +
        'etapa (o cartão de cada uma diz por quê)';
      el('lista-outras').innerHTML = recolhidas.map(function (fonte) {
        return cartaoDaVista(fonte, situacaoDaFonte(fonte));
      }).join('');
      ligarEntradas(el('lista-outras'));
    }

    atualizarProgresso();
  }

  // Guarda o ARQUIVO junto do id: é ele que permite repetir a conferência sem
  // refotografar. A evidência não pode ser reaproveitada (cada foto pertence a
  // uma conferência só — trilha de auditoria), mas os BYTES podem subir de novo.
  function enviarFoto(fonte, arquivo) {
    estado.enviando[fonte] = true;
    delete estado.falhas[fonte];
    aviso('fotos-aviso', '');
    montarFotos();

    var dados = new FormData();
    dados.append('file', arquivo);
    dados.append('fonteFisica', fonte);

    var encerrar = function () {
      delete estado.enviando[fonte];
      montarFotos();
      atualizarBotaoExtrair();
      talvezAvancarDasFotos();
    };

    return pedir(API + '/fotos-evidencia/upload', { method: 'POST', body: dados })
      .then(function (resposta) {
        if (!resposta.ok || !resposta.corpo || !resposta.corpo.id) {
          estado.falhas[fonte] = true;
          aviso('fotos-aviso', mensagemDeErro(resposta.corpo, resposta.status), 'erro');
          return;
        }
        estado.fotos[fonte] = {
          id: resposta.corpo.id,
          url: resposta.corpo.url,
          arquivo: arquivo,
          usadaEm: null
        };
      })
      .catch(function (erro) {
        estado.falhas[fonte] = true;
        aviso('fotos-aviso', 'Falha de rede no envio: ' + erro.message, 'erro');
      })
      .then(encerrar);
  }

  function fotosEnviadas() {
    return fontesOrdenadas().filter(function (fonte) { return !!estado.fotos[fonte]; });
  }

  // Fotos que já lastreiam uma conferência: a API recusa reaproveitá-las (422
  // foto-evidencia-de-outra-conferencia), e é por elas que o botão do passo 4
  // troca de nome em vez de deixar o time bater no erro cru.
  function fotosUsadas() {
    return fotosEnviadas().filter(function (fonte) { return !!estado.fotos[fonte].usadaEm; });
  }

  // Última vista da etapa enviada = não há mais o que decidir no passo 3, e o
  // operador não deveria rolar a tela procurando o que fazer. Empurra UMA vez
  // por lote (a trava some no "começar do zero" e no descarte de fotos).
  function talvezAvancarDasFotos() {
    if (estado.avancouDasFotos || estado.passo !== 'fotos') { return; }
    var alvo = fontesAlvo();
    if (!alvo.length) { return; }
    var faltando = alvo.filter(function (fonte) { return !estado.fotos[fonte]; });
    if (faltando.length) { return; }
    estado.avancouDasFotos = true;
    aviso('fotos-aviso', 'Todas as fotos desta etapa foram enviadas — agora dá para conferir.', 'ok');
    irPara('conferir');
  }

  function marcarUsadas(fontes, conferenciaId) {
    fontes.forEach(function (fonte) {
      if (estado.fotos[fonte]) { estado.fotos[fonte].usadaEm = conferenciaId; }
    });
    montarFotos();
    atualizarBotaoExtrair();
  }

  function descartarFotos() {
    estado.fotos = {};
    estado.falhas = {};
    estado.avancouDasFotos = false;
    aviso('fotos-aviso', '');
    montarFotos();
    atualizarBotaoExtrair();
    atualizarPassos();
  }

  el('btn-limpar-fotos').addEventListener('click', function () {
    descartarFotos();
    aviso('avancado-aviso', 'Fotos descartadas desta página (as evidências já enviadas continuam no banco, presas às conferências delas).', 'neutro');
  });

  // --- F. Passo 4: extrair ------------------------------------------------

  function atualizarBotaoExtrair() {
    var enviadas = fotosEnviadas();
    var usadas = fotosUsadas();
    var botao = el('btn-extrair');
    var dica = el('extrair-dica');

    el('btn-limpar-fotos').disabled = enviadas.length === 0;
    botao.disabled = enviadas.length === 0 || estado.ocupado;

    if (enviadas.length === 0) {
      botao.textContent = 'EXTRAIR COM TEXTRACT';
      dica.textContent = 'Envie ao menos uma foto no passo 3 para poder conferir.';
      return;
    }

    // Quantas fotos da etapa ainda faltam — sem prever veredito nenhum (quem
    // julga é a API): só o fato de que sem foto não há o que ler.
    var faltando = fontesAlvo().filter(function (fonte) { return !estado.fotos[fonte]; });
    var alerta = faltando.length
      ? ' ATENÇÃO: ainda faltam ' + faltando.length + ' foto(s) desta etapa (' +
        resumoDeFontes(faltando) + '). Dá para conferir assim, mas o que não tem foto não pode ser lido.'
      : '';

    if (usadas.length === 0) {
      botao.textContent = 'EXTRAIR COM TEXTRACT';
      dica.textContent = 'Vai mandar ' + enviadas.length + ' foto(s) para a leitura automática (' +
        resumoDeFontes(enviadas) + '). Uma leitura por foto, sem repetir sozinho.' + alerta;
      return;
    }

    var semArquivo = usadas.filter(function (fonte) { return !estado.fotos[fonte].arquivo; });
    if (semArquivo.length) {
      botao.textContent = 'EXTRAIR COM TEXTRACT';
      dica.textContent = 'Estas fotos já foram usadas na conferência anterior e a página não guardou o arquivo original delas (' +
        resumoDeFontes(semArquivo) + '): fotografe essas vistas outra vez no passo 3 antes de conferir de novo.';
      return;
    }

    botao.textContent = 'REENVIAR AS MESMAS FOTOS E CONFERIR';
    dica.textContent = 'Repetindo o teste com as mesmas ' + usadas.length + ' foto(s) (' +
      resumoDeFontes(usadas) + '). Cada foto vale para uma conferência só, então este botão sobe as MESMAS ' +
      'imagens outra vez — você não precisa voltar à peça. Dá para trocar a etapa no passo 1 antes de tocar.' + alerta;
  }

  // --- G. Modo avançado: leituras digitadas -------------------------------

  // Os campos do formulário são os da checklist REAL do projeto (mesma fonte
  // do passo 3); a tabela literal só cobre o intervalo até a API responder.
  // Assim um campo novo no seed aparece aqui sem tocar esta página.
  function camposDoFormulario() {
    if (!estado.checklist || !estado.checklist.length) { return CAMPOS_FALLBACK; }
    return estado.checklist.map(function (item) {
      return { campo: item.campo, fonte: item.fonteFisica };
    });
  }

  function montarLeituras() {
    var html = camposDoFormulario().map(function (item) {
      var id = 'leitura-' + item.campo;
      return '<div class="item-leitura" data-campo="' + esc(item.campo) + '" data-fonte="' + esc(item.fonte) + '">' +
        '<div class="cabeca"><label for="' + esc(id) + '">' +
        '<input type="checkbox" id="' + esc(id) + '" checked>' +
        '<span><span class="campo">' + esc(item.campo) + '</span>' +
        '<span class="fonte"> — vista: ' + esc(item.fonte) + '</span></span>' +
        '</label></div>' +
        '<div class="campos">' +
        '<input class="valor" type="text" inputmode="text" autocapitalize="none" spellcheck="false" placeholder="valor lido">' +
        '<input class="conf" type="number" min="0" max="1" step="0.01" placeholder="conf.">' +
        '</div></div>';
    }).join('');
    el('lista-leituras').innerHTML = html;
  }

  function linhaDoCampo(campo) {
    return el('lista-leituras').querySelector('.item-leitura[data-campo="' + campo + '"]');
  }

  function aplicarPreset(preset) {
    estado.preset = preset;
    camposDoFormulario().forEach(function (item) {
      var linha = linhaDoCampo(item.campo);
      if (!linha) { return; }
      var valores = preset[item.campo];
      linha.querySelector('input[type=checkbox]').checked = true;
      linha.querySelector('.valor').value = valores ? valores[0] : '';
      linha.querySelector('.conf').value = valores ? String(valores[1]) : '';
    });
    aviso('avancado-aviso', '');
  }

  el('preset-demo').addEventListener('click', function () { aplicarPreset(PRESET_DEMO); });
  el('preset-correta').addEventListener('click', function () { aplicarPreset(PRESET_CORRETA); });
  el('preset-ruim').addEventListener('click', function () { aplicarPreset(PRESET_RUIM); });

  // Recorte da etapa: LIDO do plano da API (união dos campos das vistas
  // daquele gate — a API já aplicou a semântica cumulativa). Esta era a
  // terceira cópia da regra na página; agora é consulta. A tabela local só
  // entra como último recurso, quando o plano não carregou.
  function camposDaEtapa(codigo) {
    var doGate = estado.vistasPorEtapa ? estado.vistasPorEtapa[codigo] : null;
    if (doGate) {
      var permitidos = [];
      Object.keys(doGate).forEach(function (fonte) {
        nomesDosCampos(doGate[fonte]).forEach(function (campo) {
          if (permitidos.indexOf(campo) === -1) { permitidos.push(campo); }
        });
      });
      return permitidos;
    }
    return CAMPOS_POR_ETAPA[codigo] || [];
  }

  el('btn-campos-etapa').addEventListener('click', function () {
    if (!estado.etapa) {
      aviso('avancado-aviso', 'Escolha uma etapa no passo 1 antes de filtrar os campos.', 'erro');
      return;
    }
    var permitidos = camposDaEtapa(estado.etapa);
    camposDoFormulario().forEach(function (item) {
      var linha = linhaDoCampo(item.campo);
      if (!linha) { return; }
      linha.querySelector('input[type=checkbox]').checked =
        permitidos.indexOf(item.campo) !== -1;
    });
    aviso('avancado-aviso', 'Campos ajustados para a etapa ' + estado.etapa + '.', 'neutro');
  });

  function coletarLeituras() {
    var leituras = [];
    camposDoFormulario().forEach(function (item) {
      var linha = linhaDoCampo(item.campo);
      if (!linha || !linha.querySelector('input[type=checkbox]').checked) { return; }
      var valor = linha.querySelector('.valor').value.trim();
      var confBruta = linha.querySelector('.conf').value.trim();
      var leitura = {
        campo: item.campo,
        valorLido: valor === '' ? null : valor,
        confianca: confBruta === '' ? null : Number(confBruta)
      };
      var foto = estado.fotos[item.fonte];
      if (foto) {
        leitura.fotoEvidenciaId = foto.id;
      }
      leituras.push(leitura);
    });
    return leituras;
  }

  // --- H. Passo 5: veredito -----------------------------------------------

  function urlDaFonte(fonte) {
    var foto = estado.fotos[fonte];
    return foto && foto.url ? foto.url : null;
  }

  // Bounding box da leitura, como a API mandou: JSON com Left/Top/Width/Height
  // NORMALIZADOS (0..1) no referencial da foto JÁ ORIENTADA pelo EXIF — e o
  // navegador também orienta a imagem pelo EXIF sozinho, então posicionar por
  // porcentagem cai no lugar certo. Parse DEFENSIVO: a região é texto livre no
  // banco, e caixa desenhada torta é pior que caixa nenhuma.
  function regiaoNormalizada(bruto) {
    if (!bruto) { return null; }
    var caixa = bruto;
    if (typeof bruto === 'string') {
      try { caixa = JSON.parse(bruto); } catch (erro) { return null; }
    }
    if (!caixa || typeof caixa !== 'object') { return null; }
    var lados = [caixa.Left, caixa.Top, caixa.Width, caixa.Height];
    for (var i = 0; i < lados.length; i += 1) {
      if (typeof lados[i] !== 'number' || !isFinite(lados[i])) { return null; }
    }
    if (caixa.Width <= 0 || caixa.Height <= 0) { return null; }
    return { left: caixa.Left, top: caixa.Top, largura: caixa.Width, altura: caixa.Height };
  }

  function porcento(valor) {
    return (Math.max(0, Math.min(1, valor)) * 100).toFixed(2) + '%';
  }

  // Miniatura da foto-evidência com a marca de ONDE o número foi lido. É
  // exibição pura do que a API mandou (url assinada + regiaoLeitura): a página
  // não recorta, não mede e não conclui nada da imagem. Toque abre a foto
  // inteira em outra aba.
  function miniaturaDaEvidencia(url, fonte, regiaoBruta) {
    if (!url) { return ''; }
    var regiao = regiaoNormalizada(regiaoBruta);
    var realce = regiao
      ? '<span class="realce" style="left:' + porcento(regiao.left) +
        ';top:' + porcento(regiao.top) +
        ';width:' + porcento(regiao.largura) +
        ';height:' + porcento(regiao.altura) + '"></span>'
      : '';
    var legenda = (regiao ? 'onde a leitura saiu' : 'foto-evidência') +
      ' · vista ' + fonte + ' · toque para abrir';
    return '<a class="evidencia" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      '<span class="moldura">' +
      '<img src="' + esc(url) + '" alt="Foto-evidência da vista ' + esc(fonte) + '" loading="lazy">' +
      realce + '</span>' +
      '<span class="legenda-evidencia">' + esc(legenda) + '</span></a>';
  }

  function formatarConfianca(valor) {
    if (valor === null || valor === undefined) { return 'sem confiança'; }
    return Number(valor).toFixed(3);
  }

  function linhaDaEtapa(resposta) {
    var quantos = typeof resposta.camposAvaliados === 'number' ? resposta.camposAvaliados : (resposta.campos || []).length;
    var etapa = resposta.etapaAvaliada;
    if (etapa) {
      // A ORDEM entra junto do nome: "etapa 2 — Serigrafia" diz onde na linha
      // este veredito foi emitido, e é isso que impede ler um conforme de gate
      // parcial como atestado da peça inteira.
      var onde = typeof etapa.ordem === 'number'
        ? 'etapa ' + etapa.ordem + ' — ' + etapa.nome
        : etapa.nome;
      return 'Conferência parcial na ' + onde + ' · ' + quantos + ' campos conferíveis nesta etapa';
    }
    return 'Conferência completa · ' + quantos + ' campos';
  }

  // Identidade da peça como a API a resolveu a partir do QR. São dados que já
  // vinham na resposta e a tela ignorava — e é por eles que o time confere, no
  // olho, que está vendo a peça certa e o projeto certo.
  function linhaDaPeca(peca) {
    var partes = [];
    if (peca.patrimonio) { partes.push('patrimônio ' + peca.patrimonio); }
    if (peca.cliente) { partes.push('cliente ' + peca.cliente); }
    return partes.join(' · ');
  }

  function formatarPercentual(valor) {
    if (valor === null || valor === undefined) { return 'sem confiança'; }
    return (Number(valor) * 100).toFixed(1) + '%';
  }

  // Cosmética pura: hífens viram espaços e a primeira letra sobe. Nenhum mapa
  // de nomes bonitos — ele envelheceria a cada campo novo da checklist; o nome
  // canônico continua visível logo abaixo.
  function nomeLegivel(campo) {
    var texto = String(campo || '').replace(/-/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  // Incoerência entre campos irmãos: a série é gravada em VÁRIAS VISTAS de
  // propósito (topo, lateral direita, traseira, mais a placa), e discordância
  // entre elas é o sinal que a comparação campo a campo perde. Aqui só se
  // EXIBE o que a API mandou: nenhuma leitura é eleita vencedora, nada é
  // reordenado por confiança (ranking sugeriria voto) e nenhum veredito é
  // recalculado.
  function blocoDasIncoerencias(incoerencias) {
    if (!incoerencias || !incoerencias.length) { return ''; }

    var grupos = incoerencias.map(function (incoerencia) {
      var leituras = incoerencia.leituras || [];
      var linhas = leituras.map(function (leitura) {
        var url = urlDaFonte(leitura.fonteFisica);
        var linha = '<li>' +
          '<div class="topo-leitura">' +
          '<span><span class="campo-legivel">' + esc(nomeLegivel(leitura.campo)) + '</span>' +
          '<span class="campo-cru">' + esc(leitura.campo) + '</span></span>' +
          '<span class="selo v-' + esc(leitura.veredito) + '">' + esc(leitura.veredito) + '</span>' +
          '</div>' +
          '<div class="detalhe">vista ' + esc(leitura.fonteFisica) + ' · leu <span class="mono">' +
          esc(leitura.valorLido === null ? '(sem leitura)' : leitura.valorLido) +
          '</span> · confiança ' + esc(formatarPercentual(leitura.confianca)) + '</div>';
        if (url) {
          linha += '<a href="' + esc(url) + '" target="_blank" rel="noopener">ver foto (' +
            esc(leitura.fonteFisica) + ')</a>';
        }
        return linha + '</li>';
      }).join('');

      return '<div class="grupo-coerencia">' +
        '<div class="esperado">A etiqueta manda: <span class="mono">' +
        esc(incoerencia.valorEsperado) + '</span></div>' +
        '<div class="valores">Valores lidos neste grupo: ' +
        esc((incoerencia.valoresLidos || []).join(' · ')) + '</div>' +
        '<ul>' + linhas + '</ul></div>';
    }).join('');

    return '<div class="bloco-coerencia">' +
      '<div class="titulo-coerencia">Marcações que deveriam mostrar o mesmo número não concordam</div>' +
      '<p class="explica">A mesma informação é gravada em vistas diferentes da peça de propósito — ' +
      'a série chumbada no topo, na lateral direita e na traseira, mais a da placa, têm de carregar ' +
      'o mesmo número. Elas discordarem indica gravação errada na peça OU leitura ruim da foto: ' +
      '<b>vá às fotos e confira vista por vista</b>. Nenhuma leitura é eleita correta aqui — não ' +
      'existe voto de maioria; a incoerência só impede o veredito conforme, nunca aprova nada.</p>' +
      grupos + '</div>';
  }

  // fotoEvidenciaId -> fonte/url das fotos que ESTA sessão enviou. Id que não
  // veio daqui simplesmente não vira link (nenhuma rota nova é inventada).
  function fotoPorId(id) {
    var achada = null;
    Object.keys(estado.fotos).forEach(function (fonte) {
      if (estado.fotos[fonte].id === id) {
        achada = { fonte: fonte, url: estado.fotos[fonte].url };
      }
    });
    return achada;
  }

  // ALARME, nunca veredito: o veredito geral nasce só da checklist, na API.
  // Este bloco mostra o que a visão leu na peça e não bate com a etiqueta —
  // segunda camada, independente. Sem achados não sai nada na tela.
  function blocoDosAchados(achados) {
    if (!achados || !achados.length) { return ''; }

    var itens = achados.map(function (achado) {
      var ocorrencias = achado.ocorrencias || [];
      var linhas = ocorrencias.map(function (ocorrencia) {
        // A foto vem da API (nova) ou, para resposta antiga, do que ESTA sessão
        // enviou. Nenhuma rota é inventada: sem url, sem link e sem miniatura.
        var daApi = ocorrencia.foto && ocorrencia.foto.url ? ocorrencia.foto : null;
        var local = !daApi && ocorrencia.fotoEvidenciaId ? fotoPorId(ocorrencia.fotoEvidenciaId) : null;
        var url = daApi ? daApi.url : (local ? local.url : null);
        var fonte = daApi ? (daApi.fonteFisica || '?') : (local ? local.fonte : '');
        var confianca = 'confiança ' + esc(formatarConfianca(ocorrencia.confianca));
        if (url) {
          return '<li>' + esc(fonte) + ' · ' + confianca +
            miniaturaDaEvidencia(url, fonte, ocorrencia.regiaoLeitura) + '</li>';
        }
        return '<li>' + confianca + ' · foto não identificada nesta sessão</li>';
      }).join('');

      return '<div class="achado">' +
        '<div class="texto-achado">' + esc(achado.texto) + '</div>' +
        '<div class="quantas">' + ocorrencias.length + ' ocorrência(s) nas fotos desta conferência</div>' +
        '<ul>' + linhas + '</ul></div>';
    }).join('');

    return '<div class="alarme-consistencia">' +
      '<div class="titulo-alarme">Números encontrados que não batem com a etiqueta</div>' +
      '<p class="explica">Verificação extra, independente da checklist: a visão leu estes textos na peça e ' +
      'nenhum corresponde a um valor da etiqueta. <b>Não altera o veredito acima</b> — é alerta para ' +
      'conferência humana (placa de outra peça, etiqueta trocada, peça trocada na esteira).</p>' +
      itens + '</div>';
  }

  function faixaDaExtracao(extracao) {
    if (!extracao) { return ''; }
    // Quanto texto a visão leu além dos alvos da checklist: com o alarme
    // vazio, é a medida do que foi olhado e não assustou ninguém.
    var livres = typeof extracao.achadosLivres === 'number'
      ? ' · ' + esc(extracao.achadosLivres) + ' texto(s) livre(s) lidos'
      : '';
    // Transparência de custo: fotos fora do recorte da etapa NÃO foram
    // enviadas à visão (dinheiro que deixou de ser gasto) — mostrar para o
    // operador entender por que "mandei 4 fotos e só 2 contaram".
    var fora = extracao.fotosForaDoRecorte > 0
      ? ' · ' + esc(extracao.fotosForaDoRecorte) + ' foto(s) fora desta etapa (não enviadas à visão)'
      : '';
    if (extracao.leiturasProduzidas === 0) {
      return '<div class="faixa-extracao vazia">Extração: driver ' + esc(extracao.driver) +
        ' · ' + esc(extracao.fotos) + ' foto(s) · 0 leitura(s) — nenhuma leitura extraída: ' +
        'verifique enquadramento e iluminação.' + fora + livres + '</div>';
    }
    return '<div class="faixa-extracao">Extração: driver ' + esc(extracao.driver) +
      ' · ' + esc(extracao.fotos) + ' foto(s) · ' + esc(extracao.leiturasProduzidas) + ' leitura(s)' +
      fora + livres + '</div>';
  }

  // --- H.1 As duas perguntas que importam ---------------------------------

  // O produto pergunta duas coisas na frente da peça: a serigrafia bate com a
  // etiqueta, e as séries são irmãs entre si. 'casa' agrupa por NOME de campo
  // — o prefixo do nome é contrato do domínio (CLAUDE.md), não heurística
  // desta página.
  //
  // O que este bloco NÃO faz: comparar valor, aplicar limiar, decidir
  // veredito. Ele CONTA os vereditos que a API emitiu e os rotula. Se a API
  // não apontou nada num grupo, a página diz "sem apontamento" — nunca
  // "conforme", que é palavra da engine e só ela pode dizer.
  var PERGUNTAS_FOCO = [
    {
      pergunta: '1. A serigrafia bate com a etiqueta?',
      detalhe: 'patrimônio, cliente e potência pintados na peça × o que o QR manda',
      casa: function (nome) { return String(nome).indexOf('serigrafia') !== -1; }
    },
    {
      pergunta: '2. As séries são irmãs entre si?',
      detalhe: 'as séries chumbadas nas vistas e a da placa têm de carregar o mesmo número',
      casa: function (nome) { return String(nome).indexOf('serie-') === 0; }
    }
  ];

  function cartaoDeFoco(item, campos, incoerencias) {
    var meus = campos.filter(function (campo) { return item.casa(campo.campo); });
    var divergentes = meus.filter(function (campo) { return campo.veredito === 'divergente'; });
    var pendentes = meus.filter(function (campo) { return campo.veredito === 'nao_conferivel'; });
    var minhas = (incoerencias || []).filter(function (incoerencia) {
      return (incoerencia.campos || []).filter(item.casa).length > 0;
    });

    var classe;
    var resposta;
    var detalhe;

    if (minhas.length) {
      var valores = [];
      minhas.forEach(function (incoerencia) {
        (incoerencia.valoresLidos || []).forEach(function (valor) { valores.push(valor); });
      });
      classe = 'v-incoerente';
      resposta = 'DISCORDAM ENTRE SI';
      detalhe = 'A API apontou ' + minhas.length + ' grupo(s) de marcações irmãs com leituras diferentes (' +
        valores.join(' · ') + '). Detalhe no bloco roxo abaixo.';
    } else if (divergentes.length) {
      classe = 'v-divergente';
      resposta = 'PROBLEMA';
      detalhe = divergentes.length + ' campo(s) que a API marcou divergente: ' +
        divergentes.map(function (campo) { return campo.campo; }).join(', ') + '.';
    } else if (pendentes.length) {
      classe = 'v-nao_conferivel';
      resposta = 'PENDENTE — PRECISA DE OLHO HUMANO';
      detalhe = pendentes.length + ' campo(s) que a API marcou não conferível. Não é OK nem defeito: ' +
        'a visão não leu com confiança suficiente, e a peça precisa ser olhada.';
    } else if (meus.length) {
      classe = 'v-conforme';
      resposta = 'SEM APONTAMENTO';
      detalhe = 'A API não apontou nada nos ' + meus.length + ' campo(s) desta pergunta.';
    } else {
      classe = 'v-ausente';
      resposta = 'NÃO CONFERIDA NESTA ETAPA';
      detalhe = 'Nenhum campo desta pergunta entrou no recorte desta conferência.';
    }

    return '<div class="cartao-foco ' + classe + '">' +
      '<div class="pergunta">' + esc(item.pergunta) + '</div>' +
      '<div class="resposta">' + esc(resposta) + '</div>' +
      '<div class="detalhe-foco">' + esc(detalhe) + '</div>' +
      '<div class="campos-foco">' + esc(item.detalhe) +
      (meus.length ? ' · ' + esc(meus.map(function (campo) {
        return campo.campo + ' [' + campo.veredito + ']';
      }).join(' · ')) : '') +
      '</div></div>';
  }

  function blocoDoFoco(resposta) {
    return PERGUNTAS_FOCO.map(function (item) {
      return cartaoDeFoco(item, resposta.campos || [], resposta.incoerencias);
    }).join('') +
      '<p class="nota-foco">Resumo das duas perguntas, montado a partir dos vereditos que a ' +
      'API emitiu: esta página agrupa e rotula, nunca compara valor nem decide veredito.</p>';
  }

  // --- H.2 Campos agrupados por resultado ---------------------------------

  // O motivo canônico da API, dito em português. Rotulagem pura: a página não
  // deriva nada do motivo, só o traduz para quem está com o celular na mão.
  var MOTIVOS = {
    'sem-valor-esperado': 'a etiqueta não traz valor para este campo',
    'sem-leitura': 'a visão não leu nada para este campo',
    'leituras-conflitantes': 'a mesma vista produziu leituras diferentes para este campo',
    'leitura-de-outro-campo': 'o valor lido casa com o valor esperado de OUTRO campo',
    'confianca-abaixo-do-limiar': 'a visão leu, mas com confiança abaixo do limiar',
    'leitura-nao-corroborada': 'marcação em relevo sem segunda leitura concordante — a API não acusa divergência com uma leitura só'
  };

  function cartaoDoCampo(campo) {
    var url = urlDaFonte(campo.fonteFisica);
    var bloco = '<div class="cartao-campo v-' + esc(campo.veredito) + '">' +
      '<div class="topo"><span class="nome-campo">' + esc(campo.campo) + '</span>' +
      '<span class="marca">' + esc(campo.veredito) + '</span></div>' +
      '<dl>' +
      '<dt>esperado</dt><dd class="mono">' + esc(campo.valorEsperado === null ? '(sem valor esperado)' : campo.valorEsperado) + '</dd>' +
      '<dt>lido</dt><dd class="mono">' + esc(campo.valorLido === null ? '(sem leitura)' : campo.valorLido) + '</dd>' +
      '<dt>confiança</dt><dd>' + esc(formatarConfianca(campo.confianca)) + '</dd>' +
      '<dt>vista</dt><dd>' + esc(campo.fonteFisica) + (campo.obrigatorio ? ' (obrigatório)' : ' (opcional)') + '</dd>';
    if (campo.motivo) {
      bloco += '<dt>motivo</dt><dd>' + esc(campo.motivo) +
        (MOTIVOS[campo.motivo] ? ' — ' + esc(MOTIVOS[campo.motivo]) : '') + '</dd>';
    }
    if (campo.campoDaLeitura) {
      bloco += '<dt>casou com</dt><dd class="mono">' + esc(campo.campoDaLeitura) + '</dd>';
    }
    bloco += '</dl>';

    // Evidência VISUAL primeiro: a API agora manda a foto do campo (url
    // assinada) e a região da leitura, então o operador vê o número marcado em
    // vez de ter que caçá-lo na foto inteira. Sem fotoEvidencia na resposta
    // (rota de leituras digitadas, resposta antiga), cai no link da foto que
    // ESTA sessão enviou para a vista — o comportamento de antes.
    var daApi = campo.fotoEvidencia && campo.fotoEvidencia.url ? campo.fotoEvidencia : null;
    if (daApi) {
      bloco += miniaturaDaEvidencia(daApi.url, daApi.fonteFisica || campo.fonteFisica, campo.regiaoLeitura);
    } else if (url) {
      bloco += '<a href="' + esc(url) + '" target="_blank" rel="noopener">ver foto (' + esc(campo.fonteFisica) + ')</a>';
    }
    return bloco + '</div>';
  }

  // Agrupar por RESULTADO, não pela ordem da checklist: o que impede o
  // conforme tem de estar em cima. Os conformes vão recolhidos — são a maioria
  // e são justamente os que ninguém precisa ler. Nenhum campo é omitido:
  // veredito fora dos três conhecidos cai no grupo "não previsto".
  var GRUPOS_VEREDITO = [
    ['divergente', 'divergente(s) — a peça não segue'],
    ['nao_conferivel', 'não conferível(is) — exigem olho humano']
  ];

  function blocoDosCampos(campos) {
    var html = '';
    var restantes = campos.slice();

    GRUPOS_VEREDITO.forEach(function (grupo) {
      var doGrupo = restantes.filter(function (campo) { return campo.veredito === grupo[0]; });
      restantes = restantes.filter(function (campo) { return campo.veredito !== grupo[0]; });
      if (!doGrupo.length) { return; }
      html += '<div class="grupo-campos g-' + esc(grupo[0]) + '">' +
        '<p class="titulo-grupo">' + doGrupo.length + ' ' + esc(grupo[1]) + '</p>' +
        doGrupo.map(cartaoDoCampo).join('') + '</div>';
    });

    var conformes = restantes.filter(function (campo) { return campo.veredito === 'conforme'; });
    restantes = restantes.filter(function (campo) { return campo.veredito !== 'conforme'; });
    if (conformes.length) {
      html += '<details class="grupo-campos g-conforme"><summary>' + conformes.length +
        ' campo(s) conforme(s) — abrir</summary>' +
        conformes.map(cartaoDoCampo).join('') + '</details>';
    }

    if (restantes.length) {
      html += '<div class="grupo-campos"><p class="titulo-grupo">' + restantes.length +
        ' campo(s) com veredito não previsto por esta página</p>' +
        restantes.map(cartaoDoCampo).join('') + '</div>';
    }

    return html;
  }

  function renderizar(resposta) {
    var geral = resposta.conferencia ? resposta.conferencia.vereditoGeral : 'nao_conferivel';
    var textos = TEXTO_VEREDITO[geral] || [String(geral).toUpperCase(), ''];
    var peca = resposta.transformador || {};

    var html = faixaDaExtracao(resposta.extracao);

    var identidade = linhaDaPeca(peca);
    html += '<div class="veredito-geral v-' + esc(geral) + '">' +
      '<div class="titulo">' + esc(textos[0]) + '</div>' +
      '<div class="sub">' + esc(textos[1]) + '</div>' +
      '<div class="sub forte">Peça ' + esc(peca.numeroSerie || '?') + '</div>' +
      (identidade ? '<div class="sub">' + esc(identidade) + '</div>' : '') +
      (peca.projetoModeloCodigo
        ? '<div class="sub">Conferida contra o projeto ' + esc(peca.projetoModeloCodigo) + '</div>'
        : '') +
      '<div class="sub">' + esc(linhaDaEtapa(resposta)) + '</div>' +
      '</div>';

    // As duas perguntas do produto vêm antes de qualquer lista de campo: é o
    // que o time realmente quer saber, e no celular o que está embaixo não é
    // lido.
    html += blocoDoFoco(resposta);

    // Logo abaixo para não passar despercebido no celular, e com forma/cor
    // próprias (âmbar, caixa de alarme) — nunca a faixa vermelha do
    // divergente: confundir alarme com veredito é o erro caro aqui.
    // Ordem: incoerência primeiro (pode ter travado o conforme), achado livre
    // depois (é informativo puro).
    html += blocoDasIncoerencias(resposta.incoerencias);
    html += blocoDosAchados(resposta.achadosInconsistentes);

    html += blocoDosCampos(resposta.campos || []);

    html += '<details><summary>Resposta bruta da API</summary><pre>' +
      esc(JSON.stringify(resposta, null, 2)) + '</pre></details>';

    el('veredito-vazio').hidden = true;
    el('resultado').innerHTML = html;
    estado.temVeredito = true;
    estado.vereditoTexto = textos[0];
    el('acoes-fim').hidden = false;
    el('acoes-fim-2').hidden = false;
    el('dica-fim').hidden = false;
    // O veredito é o produto: a tela ABRE nele, com os passos anteriores
    // recolhidos numa linha de resumo cada. Continuar mostrando o formulário
    // depois da resposta é o que fazia o resultado passar despercebido.
    irPara('veredito');
  }

  function payloadAtual(avisoId) {
    var payload = el('payload').value.trim();
    if (!payload) {
      aviso(avisoId, 'A etiqueta (passo 2) está vazia.', 'erro');
      return null;
    }
    return payload;
  }

  // Uma só rotina de chamada: as duas ações mandam corpos diferentes para
  // rotas diferentes e recebem a MESMA resposta — quem decide o veredito é a
  // API nos dois casos.
  function chamarConferencia(caminho, corpo, botao, avisoId, textoAndamento, aposSucesso) {
    botao.disabled = true;
    estado.ocupado = true;
    aviso(avisoId, textoAndamento, 'neutro');
    el('resultado').innerHTML = '';
    el('veredito-vazio').hidden = false;
    el('veredito-vazio').textContent = textoAndamento;
    el('acoes-fim').hidden = true;
    el('acoes-fim-2').hidden = true;
    el('dica-fim').hidden = true;

    pedir(API + caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    }).then(function (resposta) {
      if (!resposta.ok || !resposta.corpo) {
        aviso(avisoId, mensagemDeErro(resposta.corpo, resposta.status), 'erro');
        el('veredito-vazio').textContent = 'A API recusou a conferência (HTTP ' + resposta.status +
          ') — veja a mensagem no passo 4 e a resposta bruta abaixo.';
        if (resposta.corpo) {
          el('resultado').innerHTML = '<details open><summary>Resposta bruta da API</summary><pre>' +
            esc(JSON.stringify(resposta.corpo, null, 2)) + '</pre></details>';
        }
        return;
      }
      aviso(avisoId, '');
      renderizar(resposta.corpo);
      if (aposSucesso) { aposSucesso(resposta.corpo); }
    }).catch(function (erro) {
      aviso(avisoId, 'Falha de rede: ' + erro.message, 'erro');
      el('veredito-vazio').textContent = 'Falha de rede — nada foi conferido.';
    }).then(function () {
      estado.ocupado = false;
      botao.disabled = false;
      atualizarBotaoExtrair();
    });
  }

  // As fotos que a conferência acabou de consumir. Marca-se TODAS as enviadas,
  // não só as que a API disse ter usado: a recusa da API (422) cai sobre o lote
  // inteiro antes da visão, então marcar demais custa um upload extra e marcar
  // de menos custa um erro na cara do time.
  function marcarLoteUsado(fontes) {
    return function (corpo) {
      marcarUsadas(fontes, corpo && corpo.conferencia ? corpo.conferencia.id : 'anterior');
    };
  }

  el('btn-conferir').addEventListener('click', function () {
    var leituras = coletarLeituras();
    if (!leituras.length) {
      aviso('avancado-aviso', 'Marque ao menos um campo no modo avançado.', 'erro');
      return;
    }
    var payload = payloadAtual('avancado-aviso');
    if (!payload) { return; }

    var corpo = { payloadQr: payload, leituras: leituras };
    if (estado.etapa) {
      corpo.etapaCodigo = estado.etapa;
    }

    chamarConferencia(
      '/conferencias/executar',
      corpo,
      el('btn-conferir'),
      'avancado-aviso',
      'Conferindo na API...',
      marcarLoteUsado(fotosEnviadas())
    );
  });

  function dispararExtracao(payload) {
    var enviadas = fotosEnviadas();
    var corpo = {
      payloadQr: payload,
      fotoEvidenciaIds: enviadas.map(function (fonte) { return estado.fotos[fonte].id; })
    };
    if (estado.etapa) {
      corpo.etapaCodigo = estado.etapa;
    }

    chamarConferencia(
      '/conferencias/executar-com-fotos',
      corpo,
      el('btn-extrair'),
      'conferir-aviso',
      'Lendo as fotos... a visão da API leva alguns segundos por foto.',
      marcarLoteUsado(enviadas)
    );
  }

  // Uma rotina para as DUAS portas do passo 4: o botão principal e o "conferir
  // de novo" do veredito. Repetir o teste tem de ser um toque, e um toque só
  // pode significar uma coisa.
  function dispararPasso4() {
    if (!fotosEnviadas().length) {
      aviso('conferir-aviso', 'Envie ao menos uma foto no passo 3 para extrair.', 'erro');
      irPara('fotos');
      return;
    }
    var payload = payloadAtual('conferir-aviso');
    if (!payload) {
      irPara('etiqueta');
      return;
    }

    var usadas = fotosUsadas();
    if (!usadas.length) {
      dispararExtracao(payload);
      return;
    }

    // Repetir o teste é o uso REAL desta página. A evidência não se
    // reaproveita (cada foto pertence a uma conferência só), mas os bytes sim:
    // sobem de novo como evidências novas, sem ninguém voltar à peça.
    var semArquivo = usadas.filter(function (fonte) { return !estado.fotos[fonte].arquivo; });
    if (semArquivo.length) {
      aviso('conferir-aviso', 'Não guardei o arquivo original de: ' + resumoDeFontes(semArquivo) +
        '. Refotografe essas vistas no passo 3 — a API não aceita reaproveitar evidência de outra conferência.', 'erro');
      return;
    }

    estado.ocupado = true;
    atualizarBotaoExtrair();
    aviso('conferir-aviso', 'Reenviando ' + usadas.length + ' foto(s) já usadas como evidências novas...', 'neutro');

    Promise.all(usadas.map(function (fonte) {
      return enviarFoto(fonte, estado.fotos[fonte].arquivo);
    })).then(function () {
      estado.ocupado = false;
      atualizarBotaoExtrair();
      if (fotosUsadas().length) {
        aviso('conferir-aviso', 'O reenvio de alguma foto falhou — veja o passo 3 e tente de novo.', 'erro');
        return;
      }
      dispararExtracao(payload);
    });
  }

  el('btn-extrair').addEventListener('click', dispararPasso4);

  el('btn-de-novo').addEventListener('click', function () {
    irPara('conferir');
    dispararPasso4();
  });

  el('btn-trocar-etapa').addEventListener('click', function () {
    irPara('etapa');
  });

  // "Começar do zero" apaga a PEÇA (etiqueta, fotos, veredito) e mantém o que
  // pertence ao APARELHO (sessão e etapa) — é a diferença entre pegar a
  // próxima peça e reconfigurar a câmera.
  el('btn-zerar').addEventListener('click', function () {
    descartarFotos();
    estado.etiquetaPronta = false;
    estado.origemEtiqueta = '';
    estado.temVeredito = false;
    estado.vereditoTexto = '';
    el('resultado').innerHTML = '';
    el('veredito-vazio').hidden = false;
    el('veredito-vazio').textContent = 'Ainda sem veredito: conclua o passo 4.';
    el('acoes-fim').hidden = true;
    el('acoes-fim-2').hidden = true;
    el('dica-fim').hidden = true;
    aviso('conferir-aviso', '');
    aviso('qr-aviso', 'Pronto para a próxima peça: leia a etiqueta dela. O ponto da linha deste celular continua o mesmo.', 'neutro');
    irPara('etiqueta');
  });

  montarEtapas();
  montarFotos();
  montarLeituras();
  aplicarPreset(PRESET_DEMO);
  // URL vence memória do aparelho; nenhuma das duas abre passo — quem navega é
  // o assistente, depois do login.
  restaurarEtapa();
  atualizarTextoEtapa();
  atualizarBotaoExtrair();
  atualizarPassos();
  aviso('conferir-aviso', '');
  aviso('avancado-aviso', '');
})();
</script>
</body>
</html>
`;
