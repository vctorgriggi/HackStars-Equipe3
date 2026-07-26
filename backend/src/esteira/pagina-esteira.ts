/**
 * PÁGINA DE APRESENTAÇÃO TEMPORÁRIA — REMOVER JUNTO COM A /demo (gap 13).
 *
 * É a encenação do fluxo-alvo do SPEC ("Planejado / Câmeras fixas na linha")
 * rodando sobre os SERVIÇOS REAIS: a esteira, as câmeras e os monitores são
 * desenho; cada passagem, cada leitura e cada veredito que aparecem nela são
 * uma chamada de verdade à API. Formato paisagem, tema escuro, tipografia
 * grande — ela vai ao telão, não ao celular do operador (esse é o `frontend/`).
 *
 * Uma única template string: HTML + CSS + SVG + JS inline, ES5, zero
 * dependência externa (nenhum CDN, nenhuma fonte remota). Todo fetch usa
 * caminho relativo, então a página funciona em qualquer host/porta onde a API
 * estiver servindo.
 *
 * Regra de ouro preservada: esta página NÃO compara nada, NÃO conhece limiar e
 * NÃO calcula veredito. Ela acende a lâmpada da cor que a API mandou e escreve
 * os campos que a API já marcou como divergentes. Quem decide é a engine.
 *
 * O recorte "quais campos e quais vistas cada gate confere" também não é
 * calculado aqui: vem de GET /conferencias/plano-de-fotos, com o recorte
 * cumulativo JÁ aplicado no servidor — a mesma fonte que a /demo usa. Sem o
 * plano a página não anima e diz por quê (encenar uma linha com etapas
 * inventadas seria pior que não encenar nada).
 *
 * Constraint 4 do SPEC (créditos AWS) é sagrada aqui: a animação ociosa da
 * esteira é CSS puro, sem uma requisição sequer. Rede só acontece dentro de UMA
 * rodada, disparada por UM clique, e os botões ficam travados enquanto ela
 * corre. A rodada REAL anuncia o teto de custo antes de gastar.
 */
export const PAGINA_ESTEIRA = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TRAEL — linha de produção (apresentação)</title>
<style>
  :root {
    --fundo: #080d12;
    --palco: #0d151d;
    --painel: #121c26;
    --borda: #223140;
    --borda-forte: #33475c;
    --tinta: #e9f1f8;
    --tinta-fraca: #91a4b6;
    --aco: #17222d;
    --acento: #4aa8e0;
    --verde: #35d07f;
    --verde-fundo: #0f2e1e;
    --ambar: #f5b23d;
    --ambar-fundo: #33260a;
    --vermelho: #ff5252;
    --vermelho-fundo: #3a1013;
    --violeta: #a98bf0;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body {
    background: var(--fundo);
    color: var(--tinta);
    font: 16px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    min-height: 100vh;
    /* Piso de segurança; a altura real do rodapé fixo é medida em runtime
       (ajustarRodape) porque a faixa quebra em 2 linhas em tela estreita e
       escondia o fim do painel LINHA PARADA. */
    padding-bottom: 56px;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    background: var(--aco);
    border-bottom: 1px solid var(--borda);
    padding: 10px 20px;
  }
  header h1 { margin: 0; font-size: 20px; letter-spacing: .12em; text-transform: uppercase; }
  header p { margin: 0; font-size: 13px; color: var(--tinta-fraca); }
  #selo-modo {
    margin-left: auto;
    font-size: 12px;
    letter-spacing: .12em;
    text-transform: uppercase;
    border: 1px solid var(--borda-forte);
    border-radius: 999px;
    padding: 4px 12px;
    color: var(--tinta-fraca);
  }

  main { padding: 12px 20px 0; }

  /* ---- Preparo: tudo que precisa ser feito ANTES do telão ----------------- */
  #preparo {
    background: var(--painel);
    border: 1px solid var(--borda);
    border-radius: 8px;
    margin-bottom: 12px;
  }
  #preparo > summary {
    cursor: pointer;
    padding: 10px 14px;
    font-size: 13px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--tinta-fraca);
  }
  #preparo[open] > summary { border-bottom: 1px solid var(--borda); color: var(--tinta); }
  .grade-preparo {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
    padding: 14px;
  }
  .cartao { background: var(--aco); border: 1px solid var(--borda); border-radius: 6px; padding: 12px; }
  .cartao.larga { grid-column: 1 / -1; }
  .cartao h2 {
    margin: 0 0 8px;
    font-size: 12px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--acento);
  }
  .cartao p.dica { margin: 8px 0 0; font-size: 12px; color: var(--tinta-fraca); }
  label.rotulo { display: block; font-size: 12px; color: var(--tinta-fraca); margin: 8px 0 3px; }
  input[type=text], input[type=email], input[type=password], textarea {
    width: 100%;
    background: #0a1219;
    color: var(--tinta);
    border: 1px solid var(--borda-forte);
    border-radius: 4px;
    padding: 8px 10px;
    font: inherit;
    font-size: 14px;
  }
  textarea { min-height: 108px; resize: vertical; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; }
  button {
    font: inherit;
    border-radius: 5px;
    cursor: pointer;
    border: 1px solid var(--borda-forte);
    background: var(--aco);
    color: var(--tinta);
    padding: 9px 14px;
  }
  button:disabled { opacity: .45; cursor: not-allowed; }
  button.principal { background: var(--acento); border-color: var(--acento); color: #05161f; font-weight: 700; }
  button.perigo { background: #8c2f2f; border-color: #b34141; color: #fff; font-weight: 700; }
  .linha-botoes { display: flex; gap: 10px; flex-wrap: wrap; }

  .escolha { display: block; margin: 6px 0; font-size: 14px; cursor: pointer; }
  .escolha input { margin-right: 8px; }
  .escolha small { display: block; margin-left: 24px; color: var(--tinta-fraca); font-size: 12px; }

  .grade-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .slot {
    border: 1px dashed var(--borda-forte);
    border-radius: 6px;
    padding: 8px;
    font-size: 12px;
    text-align: center;
  }
  .slot.tem-foto { border-style: solid; border-color: var(--verde); }
  .slot.falhou { border-style: solid; border-color: var(--vermelho); }
  .slot.opcional { border-color: var(--borda); opacity: .82; }
  .slot b { display: block; font-size: 13px; margin-bottom: 4px; }
  .slot span.campos { display: block; color: var(--tinta-fraca); min-height: 28px; }
  .slot span.papel { display: block; font-size: 11px; margin-top: 4px; color: var(--acento); }
  .slot.opcional span.papel { color: var(--tinta-fraca); }
  #progresso-fotos { margin: 0 0 10px; font-size: 13px; }
  .slot input[type=file] { width: 100%; font-size: 11px; margin-top: 6px; color: var(--tinta-fraca); }
  .slot .miniatura { width: 100%; height: 62px; object-fit: cover; border-radius: 4px; margin-top: 6px; }

  .aviso { margin-top: 10px; padding: 9px 11px; border-radius: 5px; font-size: 13px; border: 1px solid var(--borda-forte); }
  .aviso.neutro { background: #0f1a24; color: var(--tinta-fraca); }
  .aviso.ok { background: var(--verde-fundo); border-color: var(--verde); color: var(--verde); }
  .aviso.erro { background: var(--vermelho-fundo); border-color: var(--vermelho); color: #ffb3b3; }

  /* ---- Barra de ações: os dois botões de rodada -------------------------- */
  #barra {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    background: var(--painel);
    border: 1px solid var(--borda);
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 12px;
  }
  #barra button { font-size: 15px; padding: 12px 18px; }
  #barra .custo { font-size: 12px; color: var(--tinta-fraca); }

  /* ---- Palco: a cena da linha ------------------------------------------- */
  #palco {
    position: relative;
    background: var(--palco);
    border: 1px solid var(--borda);
    border-radius: 8px;
    overflow: hidden;
  }
  #cena { position: relative; height: 52vh; min-height: 380px; }

  #trilho {
    position: absolute;
    left: 0; right: 0; bottom: 104px;
    height: 26px;
    background: #101a23;
    border-top: 2px solid var(--borda-forte);
    border-bottom: 2px solid #0a1118;
  }
  #correia {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(90deg, #1d2a36 0 26px, #16212b 26px 52px);
    animation: correr 1.05s linear infinite;
  }
  @keyframes correr { from { background-position-x: 0; } to { background-position-x: -52px; } }
  #palco.parado #correia { animation-play-state: paused; }
  #pes {
    position: absolute;
    left: 0; right: 0; bottom: 78px;
    height: 26px;
    background: repeating-linear-gradient(90deg, transparent 0 60px, var(--borda) 60px 64px, transparent 64px 124px);
    opacity: .5;
  }

  /* A peça: desliza pela esteira por transição de 'left'. */
  #peca {
    position: absolute;
    bottom: 128px;
    left: 2%;
    transform: translateX(-50%);
    transition: left 1.4s cubic-bezier(.42,0,.35,1);
    z-index: 3;
  }
  #peca svg { display: block; filter: drop-shadow(0 10px 14px rgba(0,0,0,.6)); }
  #peca.trepidando svg { animation: trepidar .18s linear infinite; }
  @keyframes trepidar { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }

  /* Cada gate: monitor em cima, câmera olhando para a esteira, rótulo embaixo. */
  .gate {
    position: absolute;
    top: 10px; bottom: 0;
    width: 22%;
    max-width: 320px;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .monitor {
    width: 100%;
    flex: 1 1 auto;
    min-height: 96px;
    background: #060b0f;
    border: 2px solid var(--borda-forte);
    border-radius: 6px;
    padding: 5px;
    /* UMA VISTA POR LINHA. Lado a lado, os rótulos de vistas vizinhas colidiam
       e o texto era cortado no meio ("...tura desta vista"): num monitor de
       ~300px, quatro colunas não cabem legíveis a distância de telão. */
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 3px;
    overflow: hidden;
    position: relative;
  }
  .monitor.lendo { border-color: var(--acento); }
  .monitor.lendo::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 20%, rgba(74,168,224,.28) 50%, transparent 80%);
    background-size: 220% 100%;
    animation: varrer 1.05s linear infinite;
    pointer-events: none;
  }
  @keyframes varrer { from { background-position: 120% 0; } to { background-position: -120% 0; } }
  /* Uma linha por vista: rótulo à esquerda, foto ao fundo ocupando a faixa
     inteira. As linhas dividem a altura do monitor por igual (flex: 1 1 0), o
     que mantém o gate de 5 vistas legível sem tirar espaço do de 3. */
  .quadro {
    position: relative;
    width: 100%;
    flex: 1 1 0;
    min-height: 26px;
    background: #0b1218;
    border: 1px solid var(--borda);
    border-radius: 3px;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 5px;
  }
  .quadro img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .quadro .vazio {
    position: relative;
    z-index: 2;
    flex: 1 1 auto;
    min-width: 0;
    font-size: 11px;
    color: var(--tinta-fraca);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Monitor da ENTRADA sem foto da etiqueta: mostra o texto do QR, que é a
     fonte da verdade daquela etapa. */
  .quadro.quadro-etiqueta { flex-direction: column; align-items: stretch; gap: 2px; padding: 4px 5px; }
  .quadro .texto-qr {
    position: relative;
    z-index: 2;
    margin: 0;
    flex: 1 1 auto;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 9px;
    line-height: 1.3;
    white-space: pre-line;
    color: var(--tinta-fraca);
    overflow: hidden;
  }
  .quadro .etiqueta-vista {
    position: relative;
    z-index: 2;
    flex: none;
    max-width: 52%;
    background: rgba(0,0,0,.78);
    border-radius: 3px;
    color: var(--tinta);
    font-size: 10px;
    letter-spacing: .07em;
    text-transform: uppercase;
    padding: 1px 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Retângulo da leitura, posicionado em % sobre a foto: é o regiaoLeitura que
     a API devolveu, desenhado sem recortar nem medir nada aqui. */
  .quadro .realce {
    position: absolute;
    border: 2px solid var(--ambar);
    box-shadow: 0 0 0 9999px rgba(0,0,0,.32);
    pointer-events: none;
  }
  .quadro .realce.divergente { border-color: var(--vermelho); }
  .quadro .realce.conforme { border-color: var(--verde); }

  .camera { position: relative; margin-top: 8px; flex: none; }
  .camera .flash {
    position: absolute;
    left: 50%; top: 78%;
    width: 26px; height: 26px;
    margin-left: -13px;
    border-radius: 50%;
    background: #fff;
    opacity: 0;
    pointer-events: none;
  }
  .camera.disparando .flash { animation: clarao .5s ease-out; }
  @keyframes clarao {
    0% { opacity: 0; transform: scale(.4); }
    18% { opacity: 1; transform: scale(1.9); }
    100% { opacity: 0; transform: scale(4.2); }
  }
  .feixe {
    flex: none;
    width: 0; height: 0;
    border-left: 26px solid transparent;
    border-right: 26px solid transparent;
    border-top: 46px solid rgba(74,168,224,.10);
    transition: border-top-color .25s;
  }
  .camera.disparando + .feixe { border-top-color: rgba(255,255,255,.30); }
  .vao { flex: none; height: 34px; }

  .rotulo-gate { flex: none; height: 96px; width: 100%; text-align: center; padding-top: 6px; }
  .rotulo-gate .ordem { display: block; font-size: 11px; letter-spacing: .16em; color: var(--tinta-fraca); }
  .rotulo-gate .nome { display: block; font-size: 15px; font-weight: 700; line-height: 1.15; }
  .rotulo-gate .veredito-gate {
    display: inline-block;
    margin-top: 5px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 3px 12px;
    border: 1px solid var(--borda-forte);
    background: transparent;
    color: var(--tinta-fraca);
    cursor: default;
  }
  /* O chip só vira porta de entrada depois que existe resposta para mostrar —
     e aí ganha affordance: sublinhado pontilhado, cursor e realce no hover. */
  .gate[data-clicavel] .veredito-gate {
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .gate[data-clicavel] .veredito-gate:hover,
  .gate[data-clicavel] .veredito-gate:focus-visible {
    filter: brightness(1.3);
    outline: 2px solid var(--acento);
    outline-offset: 2px;
  }
  /* 'registrado' NÃO é veredito: é a entrada da linha e a etapa de trânsito,
     onde só há passagem. Cor própria (azul do sistema), nunca verde — verde
     aqui faria a plateia ler "aprovado" onde ninguém conferiu nada. */
  .gate.registrado .veredito-gate { border-color: var(--acento); color: var(--acento); }
  .gate.registrado .lampada { background: var(--acento); box-shadow: 0 0 12px var(--acento); }
  .gate.registrado .monitor { border-color: var(--acento); }
  .gate.conforme .veredito-gate { background: var(--verde-fundo); border-color: var(--verde); color: var(--verde); }
  .gate.nao_conferivel .veredito-gate { background: var(--ambar-fundo); border-color: var(--ambar); color: var(--ambar); }
  .gate.divergente .veredito-gate { background: var(--vermelho-fundo); border-color: var(--vermelho); color: #ff8b8b; }
  .gate.falha .veredito-gate { border-color: var(--violeta); color: var(--violeta); }
  .gate.conforme .monitor { border-color: var(--verde); }
  .gate.nao_conferivel .monitor { border-color: var(--ambar); }
  .gate.divergente .monitor { border-color: var(--vermelho); box-shadow: 0 0 22px rgba(255,82,82,.5); }

  .lampada {
    display: block;
    width: 16px; height: 16px;
    margin: 0 auto 2px;
    border-radius: 50%;
    background: #24313d;
    border: 1px solid #33475c;
  }
  .gate.conforme .lampada { background: var(--verde); box-shadow: 0 0 14px var(--verde); }
  .gate.nao_conferivel .lampada { background: var(--ambar); box-shadow: 0 0 14px var(--ambar); }
  .gate.divergente .lampada { background: var(--vermelho); box-shadow: 0 0 16px var(--vermelho); animation: pulsar .7s ease-in-out infinite; }
  @keyframes pulsar { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

  .alerta-gate {
    display: block;
    margin: 5px auto 0;
    max-width: 96%;
    font-size: 11px;
    line-height: 1.25;
    color: var(--ambar);
    border: 1px solid var(--ambar);
    background: var(--ambar-fundo);
    border-radius: 4px;
    padding: 2px 5px;
  }

  /* Girofaro: só aparece quando a linha para. */
  #girofaro {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity .3s;
    background: conic-gradient(from 0deg, rgba(255,82,82,.30), transparent 22%, transparent 78%, rgba(255,82,82,.30));
  }
  #palco.parado #girofaro { opacity: 1; animation: girar 1.6s linear infinite; }
  @keyframes girar { to { transform: rotate(360deg); } }
  #palco.parado { border-color: var(--vermelho); }

  /* ---- Detalhe de um gate: o PORQUÊ, campo a campo ----------------------- */
  #detalhe {
    margin-top: 12px;
    background: var(--painel);
    border: 1px solid var(--borda-forte);
    border-radius: 8px;
    padding: 14px 16px;
  }
  #detalhe .cabeca { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
  #detalhe h3 { margin: 0; font-size: 21px; }
  #detalhe .sub { font-size: 13px; color: var(--tinta-fraca); }
  #detalhe .fechar { margin-left: auto; padding: 6px 12px; font-size: 13px; }
  .grade-campos { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 10px; }
  .cartao-campo {
    background: #0c141b;
    border: 1px solid var(--borda);
    border-left: 4px solid var(--borda-forte);
    border-radius: 6px;
    padding: 10px 12px;
  }
  .cartao-campo.v-conforme { border-left-color: var(--verde); }
  .cartao-campo.v-nao_conferivel { border-left-color: var(--ambar); }
  .cartao-campo.v-divergente { border-left-color: var(--vermelho); }
  .cartao-campo .topo { display: flex; align-items: center; gap: 8px; justify-content: space-between; margin-bottom: 2px; }
  .cartao-campo .nome-campo { font-size: 16px; font-weight: 700; }
  .cartao-campo .selo {
    flex: none;
    font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
    border: 1px solid var(--borda-forte); border-radius: 999px; padding: 2px 8px;
    color: var(--tinta-fraca);
  }
  .cartao-campo.v-conforme .selo { color: var(--verde); border-color: var(--verde); }
  .cartao-campo.v-nao_conferivel .selo { color: var(--ambar); border-color: var(--ambar); }
  .cartao-campo.v-divergente .selo { color: #ff8b8b; border-color: var(--vermelho); }
  .cartao-campo .canonico { display: block; font-size: 11px; color: var(--tinta-fraca); font-family: ui-monospace, Menlo, Consolas, monospace; margin-bottom: 8px; }
  .cartao-campo dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; margin: 0; font-size: 13px; }
  .cartao-campo dt { color: var(--tinta-fraca); }
  .cartao-campo dd { margin: 0; }
  .cartao-campo dd.mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 16px; }
  .cartao-campo dd.ausente { color: var(--tinta-fraca); font-style: italic; }
  .cartao-campo dd.explica { color: var(--ambar); }
  .cartao-campo.v-divergente dd.explica { color: #ff8b8b; }
  .evidencia { display: block; margin-top: 9px; text-decoration: none; color: var(--acento); }
  .evidencia .moldura {
    display: block; position: relative; overflow: hidden;
    width: 100%;
    border: 1px solid var(--borda-forte); border-radius: 4px; background: #060b0f;
  }
  .evidencia img { display: block; width: 100%; height: auto; }
  .evidencia .realce {
    position: absolute;
    border: 3px solid var(--ambar);
    border-radius: 2px;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, .6);
  }
  .evidencia .realce.divergente { border-color: var(--vermelho); }
  .evidencia .realce.conforme { border-color: var(--verde); }
  .evidencia .legenda-evidencia { display: block; margin-top: 4px; font-size: 11px; color: var(--tinta-fraca); }

  /* ---- Painel de status -------------------------------------------------- */
  #faixa {
    margin-top: 12px;
    background: var(--painel);
    border: 1px solid var(--borda);
    border-left: 5px solid var(--acento);
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 19px;
    min-height: 54px;
  }
  #faixa.parada { border-left-color: var(--vermelho); }
  #faixa.liberada { border-left-color: var(--verde); }
  #faixa.ressalva { border-left-color: var(--ambar); }

  #desfecho { margin-top: 12px; border-radius: 8px; padding: 18px 20px; border: 2px solid var(--borda); }
  #desfecho.parada { background: var(--vermelho-fundo); border-color: var(--vermelho); }
  #desfecho.liberada { background: var(--verde-fundo); border-color: var(--verde); }
  #desfecho.ressalva { background: var(--ambar-fundo); border-color: var(--ambar); }
  #desfecho h2 { margin: 0 0 6px; font-size: 34px; letter-spacing: .06em; text-transform: uppercase; }
  #desfecho.parada h2 { color: #ff8b8b; }
  #desfecho.liberada h2 { color: var(--verde); }
  #desfecho.ressalva h2 { color: var(--ambar); }
  #desfecho p.sub { margin: 0 0 12px; font-size: 15px; color: var(--tinta-fraca); }
  #desfecho ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  #desfecho li {
    background: rgba(0,0,0,.28);
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 18px;
  }
  #desfecho li .campo-nome { display: block; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--tinta-fraca); }
  #desfecho li .par { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 22px; }
  #desfecho li .esperado { color: var(--verde); }
  #desfecho li .lido { color: #ff8b8b; }
  /* Lista âmbar: no fim com ressalva ela é o assunto; embaixo do painel de
     parada é nota de rodapé (o divergente é que manda parar). */
  #desfecho .bloco-ambar { margin-top: 14px; }
  #desfecho .bloco-ambar h3 { margin: 0 0 4px; font-size: 15px; letter-spacing: .06em; text-transform: uppercase; color: var(--ambar); }
  #desfecho .bloco-ambar p { margin: 0 0 10px; font-size: 14px; color: var(--tinta-fraca); }
  #desfecho.parada .bloco-ambar { opacity: .85; border-top: 1px solid rgba(255,255,255,.14); padding-top: 12px; }
  #desfecho.parada .bloco-ambar li { font-size: 14px; }
  #desfecho .ressalva-gate { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--tinta-fraca); display: block; margin-bottom: 2px; }
  #desfecho .ressalva-linha .rotulo-campo { font-weight: 700; }
  #desfecho .ressalva-linha .valor { font-family: ui-monospace, Menlo, Consolas, monospace; }
  #desfecho .ressalva-linha .porque { display: block; font-size: 13px; color: var(--tinta-fraca); margin-top: 3px; }
  #desfecho .ver-gate {
    margin-top: 8px; padding: 5px 11px; font-size: 12px;
    background: transparent; border-color: rgba(255,255,255,.3); color: var(--tinta);
  }

  .rodape {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    background: rgba(8,13,18,.96);
    border-top: 1px solid var(--borda);
    margin: 0;
    padding: 8px 20px;
    font-size: 12px;
    color: var(--tinta-fraca);
    text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    #correia, #palco.parado #girofaro, #peca.trepidando svg, .monitor.lendo::after { animation: none; }
  }
</style>
</head>
<body>
<header>
  <h1>TRAEL — linha de produção</h1>
  <p>Encenação do fluxo com câmeras fixas · conferência real na API</p>
  <span id="selo-modo">preparo</span>
</header>

<main>

  <details id="preparo" open>
    <summary>Preparo da apresentação — abrir / fechar</summary>
    <div class="grade-preparo">

      <div class="cartao">
        <h2>1 · Entrar</h2>
        <label class="rotulo" for="email">E-mail</label>
        <input type="email" id="email" value="admin@example.com" autocomplete="username" autocapitalize="none" spellcheck="false">
        <label class="rotulo" for="senha">Senha</label>
        <input type="password" id="senha" value="secret" autocomplete="current-password">
        <div class="linha-botoes" style="margin-top:10px">
          <button id="btn-login" class="principal">ENTRAR</button>
        </div>
        <p class="dica">Entrar carrega as etapas reais da linha e a checklist do modelo (GET /conferencias/plano-de-fotos). A cena só é desenhada depois disso.</p>
        <div id="login-aviso" class="aviso neutro" hidden></div>
      </div>

      <div class="cartao">
        <h2>2 · Etiqueta da peça</h2>
        <label class="rotulo" for="payload">Conteúdo do QR (é a fonte da verdade)</label>
        <textarea id="payload" spellcheck="false" autocapitalize="none">Pedido: 68202
Núm. Série: 847233
Seq: 86
Patrimônio: 251328
Cliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A
TPD-408136</textarea>
        <p class="dica">Já vem com a etiqueta da peça de demonstração. Quem interpreta este texto é a API — esta página só o transporta.</p>
      </div>

      <div class="cartao">
        <h2>3 · Peça do ensaio</h2>
        <label class="escolha"><input type="radio" name="preset" value="defeito" checked>Peça com defeito real
          <small>Placa gravada 847833 contra a etiqueta 847233 — o defeito da peça de demonstração. Deve parar a linha no gate da placa.</small></label>
        <label class="escolha"><input type="radio" name="preset" value="correta">Peça correta
          <small>Todos os números batendo com a etiqueta. Deve chegar à expedição.</small></label>
        <label class="escolha"><input type="radio" name="preset" value="foto-ruim">Foto lateral mal enquadrada
          <small>Peça correta, mas a leitura da série chumbada lateral sai a 85,8% (medido). Mostra o caminho âmbar: não conferível, exige olho humano.</small></label>
        <p class="dica">Vale só para a RODADA DE ENSAIO: são as confianças medidas pelo Textract nas fotos reais, digitadas em vez de lidas. A rodada real ignora isto e lê as fotos.</p>
      </div>

      <div class="cartao larga">
        <h2>4 · Fotos por vista da peça (opcional para o ensaio, obrigatório para a rodada real)</h2>
        <div id="slots"><p class="dica">Entre no passo 1 para a página saber quais vistas a peça tem.</p></div>
        <p class="dica">Uma foto por vista. Elas aparecem no monitor da câmera de cada gate que confere aquela vista; a rodada real manda ao Textract só as vistas do gate. Sem foto, o ensaio roda igual (o monitor mostra "sem captura desta vista"). A entrada da linha não pede foto de marcação — lá o QR é a referência, não algo a conferir.</p>
        <div id="fotos-aviso" class="aviso neutro" hidden></div>
      </div>

    </div>
  </details>

  <div id="barra">
    <button id="btn-ensaio" class="principal" disabled>RODADA DE ENSAIO — leituras simuladas (grátis)</button>
    <button id="btn-real" class="perigo" disabled>RODADA REAL — Textract lê as fotos</button>
    <span class="custo" id="custo">rodada real: envie fotos no preparo</span>
    <button id="btn-reiniciar" disabled style="margin-left:auto">Rebobinar a cena</button>
  </div>

  <div id="palco">
    <div id="cena"><p class="dica" style="padding:24px;color:#91a4b6">A linha aparece aqui depois do login: as etapas são as que estiverem cadastradas no banco, na ordem delas.</p></div>
    <div id="girofaro"></div>
  </div>

  <div id="detalhe" hidden></div>

  <div id="faixa">Linha ociosa. Faça o preparo e dispare uma rodada.</div>
  <div id="desfecho" hidden></div>

</main>

<p class="rodape">Simulação de apresentação: a esteira e as câmeras são encenação — cada passagem, leitura e veredito acima é uma chamada REAL à API em produção. Em produção, câmeras fixas provisionadas por etapa substituem o clique.</p>

<script>
(function () {
  'use strict';

  var API = '/api/v1';

  // Custo unitário do Textract (DetectDocumentText, US$ 0,0015 por página) e o
  // TETO de chamadas por foto — 3, fixo: a foto inteira + 2 recortes de
  // corroboração do relevo (CLAUDE.md, "Extração e bordas AWS"). É teto, não
  // média: foto sem relevo custa 1.
  var USD_POR_CHAMADA = 0.0015;
  var CHAMADAS_POR_FOTO = 3;

  var CLIENTE = '143091 - Energisa Rondônia Distribuidora de Energia S.A';

  // Confianças medidas pelo Textract nas fotos reais (docs/visao-ocr.md). São
  // as mesmas da /demo; a única diferença é a série chumbada lateral, que aqui
  // usa a leitura BEM ENQUADRADA (96,7%, a mesma medição que achou as 3
  // posições a 99,3% / 96,7% / 92,1%) em vez da foto torta de 85,8%. Motivo: no
  // ensaio a lateral mal enquadrada derruba TODOS os gates para não conferível
  // e a linha nunca chega à expedição — o caminho âmbar continua demonstrável,
  // mas como escolha explícita (preset 'foto-ruim'), não como estado único.
  var PRESET_DEFEITO = {
    'serie-chumbada-topo': ['847233', 0.988],
    'serie-chumbada-lateral-direita': ['847233', 0.967],
    'serie-chumbada-traseira': ['847233', 0.967],
    'serie-placa': ['847833', 0.999],
    'patrimonio-placa': ['251328', 0.98],
    'patrimonio-serigrafia-topo': ['251328', 0.985],
    'patrimonio-serigrafia-frente': ['251328', 0.984],
    'cliente-serigrafia-frente': [CLIENTE, 0.972],
    'potencia-serigrafia-frente': ['10 kVA', 0.985]
  };

  var PRESET_CORRETA = Object.assign({}, PRESET_DEFEITO, {
    'serie-placa': ['847233', 0.995]
  });

  // O 85,8% da /demo, intacto: valor CERTO com confiança abaixo do limiar.
  var PRESET_FOTO_RUIM = Object.assign({}, PRESET_CORRETA, {
    'serie-chumbada-lateral-direita': ['847233', 0.858]
  });

  var PRESETS = {
    'defeito': PRESET_DEFEITO,
    'correta': PRESET_CORRETA,
    'foto-ruim': PRESET_FOTO_RUIM
  };

  var TEXTO_VEREDITO = {
    conforme: 'CONFORME',
    nao_conferivel: 'NÃO CONFERÍVEL',
    divergente: 'DIVERGENTE'
  };

  // Código de erro da API -> o que fazer. Tradução, não substituição: a
  // mensagem crua continua aparecendo junto.
  var EXPLICACOES = [
    ['foto-evidencia-de-outra-conferencia',
      'Estas fotos já lastreiam outra conferência (cada evidência pertence a UMA só). A página reenvia os mesmos arquivos antes de cada gate justamente para isso — se o erro apareceu, algum arquivo original se perdeu: reenvie a foto dessa vista no preparo.'],
    ['foto-evidencia-inexistente',
      'A API não achou uma das fotos enviadas (o banco pode ter sido reiniciado). Reenvie as fotos no preparo.'],
    ['etapa-desconhecida',
      'Uma etapa da cena não existe mais como Checkpoint no banco. Recarregue a página para buscar o plano de novo.'],
    ['etapa-sem-campos-conferiveis',
      'Nenhuma marcação da checklist existe na peça até esta etapa — não há o que conferir neste gate.'],
    ['projeto-modelo-indeterminado',
      'A API não consegue decidir qual projeto/modelo vale para esta peça e se recusa a chutar. É preciso exatamente um ProjetoModelo cadastrado, ou o QR trazer o código do projeto.'],
    ['checklist-invalido',
      'A checklist do modelo está ilegível no banco. Rodar o seed recria a checklist do modelo da demonstração.'],
    ['payload-somente-codigo',
      'O QR trouxe só um código de lookup, sem os campos da peça. Use a etiqueta de demonstração do preparo.'],
    ['formato-desconhecido',
      'A API não reconheceu o formato do conteúdo da etiqueta.'],
    ['campos-obrigatorios-ausentes',
      'Faltam número de série e/ou patrimônio no conteúdo da etiqueta.']
  ];

  var estado = {
    token: null,
    plano: null,
    // [{codigo, nome, ordem, vistas: [fonte], campos: [nome]}] — TUDO vindo do
    // plano da API, com o recorte cumulativo já aplicado lá.
    gates: [],
    // fonte -> [nome do campo] (a peça inteira), só para rotular os slots.
    camposPorVista: {},
    // fonte -> {id, url, arquivo, objectUrl, usadaEm}
    fotos: {},
    // índice do gate -> a resposta INTEIRA da conferência daquele gate. É o que
    // permite abrir o detalhe campo a campo depois, sem repetir uma chamada: o
    // porquê do veredito já veio junto do veredito (motivo, confiança, foto,
    // região) e a página só tinha jogado fora.
    resultados: {},
    rodando: false,
    preset: 'defeito'
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
    if (!texto) { caixa.hidden = true; caixa.textContent = ''; return; }
    caixa.hidden = false;
    caixa.className = 'aviso ' + (tipo || 'neutro');
    caixa.textContent = texto;
  }

  function espera(ms) {
    return new Promise(function (pronto) { setTimeout(pronto, ms); });
  }

  // --- Chamadas à API (idênticas em espírito às da /demo) -------------------

  function explicacaoDoErro(texto) {
    var achada = '';
    EXPLICACOES.forEach(function (par) {
      if (!achada && texto.indexOf(par[0]) !== -1) { achada = par[1]; }
    });
    return achada;
  }

  function mensagemDeErro(corpo, status) {
    var cru = 'HTTP ' + status + ' — falha na chamada da API.';
    if (corpo && corpo.errors && typeof corpo.errors === 'object') {
      var partes = Object.keys(corpo.errors).map(function (chave) {
        var valor = corpo.errors[chave];
        return chave + ': ' + (typeof valor === 'string' ? valor : JSON.stringify(valor));
      });
      if (partes.length) { cru = 'HTTP ' + status + ' — ' + partes.join(' | '); }
    } else if (corpo && typeof corpo.message === 'string') {
      cru = 'HTTP ' + status + ' — ' + corpo.message;
    }
    var explicacao = explicacaoDoErro(cru);
    return explicacao ? explicacao + ' [' + cru + ']' : cru;
  }

  function pedir(caminho, opcoes) {
    var config = opcoes || {};
    var cabecalhos = config.headers || {};
    if (estado.token) { cabecalhos.Authorization = 'Bearer ' + estado.token; }
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

  // Igual a pedir(), mas a falha VIRA exceção: a coreografia é uma cadeia de
  // promessas e precisa parar inteira quando um gate falha, sem seguir
  // animando como se estivesse tudo bem.
  function exigir(caminho, corpo) {
    return pedir(API + caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    }).then(function (resposta) {
      if (!resposta.ok || !resposta.corpo) {
        throw new Error(mensagemDeErro(resposta.corpo, resposta.status));
      }
      return resposta.corpo;
    });
  }

  // --- Login e plano da linha ---------------------------------------------

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
        aviso('login-aviso', mensagemDeErro(resposta.corpo, resposta.status), 'erro');
        return null;
      }
      estado.token = resposta.corpo.token;
      aviso('login-aviso', 'Conectado. Buscando as etapas da linha...', 'neutro');
      return carregarPlano();
    }).catch(function (erro) {
      aviso('login-aviso', 'Falha de rede: ' + erro.message, 'erro');
    }).then(function () {
      botao.disabled = false;
    });
  });

  // As etapas, as vistas de cada uma e os campos de cada vista vêm PRONTOS de
  // GET /conferencias/plano-de-fotos — a mesma fonte da /demo. Esta página não
  // recalcula recorte por etapa: se ela e o servidor discordassem sobre o que
  // cada gate confere, a cena estaria mentindo sobre o sistema.
  function carregarPlano() {
    return pedir(API + '/conferencias/plano-de-fotos').then(function (resposta) {
      if (!resposta.ok || !resposta.corpo) {
        throw new Error(mensagemDeErro(resposta.corpo, resposta.status));
      }
      var plano = resposta.corpo;
      if (!plano.etapas || !plano.etapas.length || !plano.pecaInteira) {
        throw new Error('a API respondeu um plano de fotos sem etapas — sem elas não há linha para encenar');
      }

      var gates = [];
      plano.etapas.forEach(function (item) {
        if (!item || !item.etapa || typeof item.etapa.codigo !== 'string') { return; }
        var vistas = [];
        var campos = [];
        (item.vistas || []).forEach(function (vista) {
          vistas.push(vista.fonteFisica);
          (vista.campos || []).forEach(function (campo) { campos.push(campo.campo); });
        });
        gates.push({
          codigo: item.etapa.codigo,
          nome: item.etapa.nome || item.etapa.codigo,
          ordem: item.etapa.ordem,
          vistas: vistas,
          campos: campos
        });
      });
      gates.sort(function (a, b) { return a.ordem - b.ordem; });

      var porVista = {};
      ((plano.pecaInteira || {}).vistas || []).forEach(function (vista) {
        porVista[vista.fonteFisica] = (vista.campos || []).map(function (c) { return c.campo; });
      });

      atribuirPapeis(gates);

      estado.plano = plano;
      estado.gates = gates;
      estado.camposPorVista = porVista;

      montarCena();
      montarSlots();
      atualizarBotoes();
      var conferem = gatesDeConferencia();
      aviso('login-aviso', 'Linha carregada: ' + gates.length + ' etapas do projeto ' +
        ((plano.projeto || {}).codigo || 'desconhecido') + ' — ' + conferem.length +
        ' gate(s) de conferência (' + conferem.map(function (g) { return g.nome; }).join(', ') +
        '), derivados da checklist, não do código da etapa.', 'ok');
      faixa('Linha pronta. Dispare a rodada de ensaio (grátis) ou a rodada real (paga).', '');
    }).catch(function (erro) {
      estado.gates = [];
      el('cena').innerHTML = '<p class="dica" style="padding:24px;color:#ff8b8b">Sem o plano da linha esta cena não anima: ' +
        esc(erro.message) + '</p>';
      aviso('login-aviso', erro.message, 'erro');
      atualizarBotoes();
    });
  }

  // --- Papel de cada etapa: DERIVADO DO PLANO, nunca do código da etapa ----

  // O fluxo-alvo do SPEC tem DOIS gates de conferência, não quatro — mas quais
  // são os dois não pode virar constante aqui: sai da comparação entre o
  // recorte de cada etapa e o das anteriores, tudo dado que
  // GET /conferencias/plano-de-fotos já entregou.
  //
  //   entrada  = a PRIMEIRA etapa da linha. O QR nasce com a peça e não é
  //              conferido (SPEC): aqui só se registra que ela entrou.
  //   gate     = a etapa acrescenta campo NOVO ao que já se conferia — é onde
  //              existe marcação nova para comparar.
  //   transito = o recorte não mudou: nada de novo foi gravado na peça, então
  //              conferir de novo seria gastar visão para repetir a resposta.
  //
  // Com OUTRA checklist os papéis mudam sozinhos — é exatamente o ponto. Um
  // modelo que serigrafa em três etapas ganha três gates; um que grava tudo de
  // uma vez ganha um. Nenhum código de Checkpoint aparece nesta função.
  //
  // Isto é AGRUPAMENTO DE EXIBIÇÃO. O recorte continua sendo o da API: quando
  // um gate confere, ele manda a etapa e a API decide os campos.
  function atribuirPapeis(gates) {
    var jaConferidos = {};
    var houveGate = false;

    gates.forEach(function (gate, indice) {
      var novos = gate.campos.filter(function (campo) { return !jaConferidos[campo]; });
      gate.camposNovos = novos;

      if (indice === 0) {
        gate.papel = 'entrada';
      } else if (novos.length) {
        gate.papel = 'gate';
        houveGate = true;
      } else {
        gate.papel = 'transito';
      }

      gate.campos.forEach(function (campo) { jaConferidos[campo] = true; });
    });

    // Guarda: uma linha em que NADA é conferido é pior que um rótulo imperfeito.
    // Acontece com uma etapa só cadastrada — aí ela volta a ser gate.
    if (!houveGate && gates.length && gates[0].campos.length) {
      gates[0].papel = 'gate';
      gates[0].camposNovos = gates[0].campos.slice();
    }
  }

  function gatesDeConferencia() {
    return estado.gates.filter(function (gate) { return gate.papel === 'gate'; });
  }

  // As vistas que o operador precisa fotografar: só as dos gates que conferem.
  // A entrada não pede foto de marcação nenhuma.
  function fontesExigidas() {
    var conjunto = {};
    gatesDeConferencia().forEach(function (gate) {
      gate.vistas.forEach(function (fonte) { conjunto[fonte] = true; });
    });
    return conjunto;
  }

  // O que o MONITOR daquele gate mostra. Na entrada, a etiqueta — é ela que a
  // câmera da adesivação enxerga, e é ela a fonte da verdade.
  function vistasDoMonitor(gate) {
    return gate.papel === 'entrada' ? ['etiqueta'] : gate.vistas;
  }

  // --- Desenho da cena ------------------------------------------------------

  var SVG_PECA =
    '<svg width="104" height="132" viewBox="0 0 104 132" aria-label="Transformador na esteira">' +
    '<defs>' +
    '<linearGradient id="corpo" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#4e9e7f"/><stop offset=".42" stop-color="#8fe3c0"/>' +
    '<stop offset="1" stop-color="#3d8267"/></linearGradient>' +
    '<linearGradient id="bucha" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="#6b4025"/><stop offset=".45" stop-color="#a86c40"/>' +
    '<stop offset="1" stop-color="#5d3620"/></linearGradient>' +
    '</defs>' +
    // buchas (isoladores marrons no topo)
    '<g>' +
    '<rect x="26" y="16" width="12" height="26" rx="3" fill="url(#bucha)"/>' +
    '<ellipse cx="32" cy="16" rx="9" ry="4" fill="#c08753"/>' +
    '<rect x="22" y="24" width="20" height="3" rx="1.5" fill="#8a5a34"/>' +
    '<rect x="66" y="16" width="12" height="26" rx="3" fill="url(#bucha)"/>' +
    '<ellipse cx="72" cy="16" rx="9" ry="4" fill="#c08753"/>' +
    '<rect x="62" y="24" width="20" height="3" rx="1.5" fill="#8a5a34"/>' +
    '</g>' +
    // alças laterais
    '<path d="M14 52 q-9 0 -9 9" stroke="#2f6a54" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M90 52 q9 0 9 9" stroke="#2f6a54" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    // tanque cilíndrico
    '<rect x="14" y="42" width="76" height="76" rx="6" fill="url(#corpo)"/>' +
    '<ellipse cx="52" cy="42" rx="38" ry="9" fill="#a5edd0"/>' +
    '<ellipse cx="52" cy="118" rx="38" ry="8" fill="#2f6a54"/>' +
    // aletas (radiadores) e a serigrafia como marca, sem número legível
    '<g fill="#2f6a54" opacity=".55">' +
    '<rect x="18" y="56" width="3" height="52" rx="1.5"/>' +
    '<rect x="24" y="56" width="3" height="52" rx="1.5"/>' +
    '<rect x="77" y="56" width="3" height="52" rx="1.5"/>' +
    '<rect x="83" y="56" width="3" height="52" rx="1.5"/>' +
    '</g>' +
    '<rect x="34" y="72" width="36" height="13" rx="2" fill="#12241d" opacity=".78"/>' +
    '<rect x="38" y="76" width="28" height="2.5" rx="1.25" fill="#8fe3c0" opacity=".85"/>' +
    '<rect x="38" y="80" width="18" height="2.5" rx="1.25" fill="#8fe3c0" opacity=".6"/>' +
    // placa de identificação rebitada
    '<rect x="38" y="94" width="28" height="16" rx="2" fill="#0b1116" stroke="#48606f"/>' +
    '<rect x="42" y="98" width="20" height="2" rx="1" fill="#93a4b6"/>' +
    '<rect x="42" y="103" width="14" height="2" rx="1" fill="#93a4b6"/>' +
    '</svg>';

  var SVG_CAMERA =
    '<svg width="72" height="52" viewBox="0 0 72 52" aria-label="Câmera fixa do gate">' +
    '<rect x="30" y="0" width="8" height="10" rx="2" fill="#33475c"/>' +
    '<rect x="10" y="8" width="52" height="26" rx="5" fill="#1d2a36" stroke="#42576b"/>' +
    '<rect x="16" y="13" width="18" height="7" rx="2" fill="#2b3d4d"/>' +
    '<circle cx="47" cy="21" r="3" fill="#4aa8e0"/>' +
    '<path d="M26 34 L46 34 L41 46 L31 46 Z" fill="#22303d" stroke="#42576b"/>' +
    '<ellipse cx="36" cy="46" rx="7" ry="3.4" fill="#0b1116" stroke="#5b7285"/>' +
    '<ellipse cx="36" cy="46" rx="4" ry="2" fill="#4aa8e0" opacity=".65"/>' +
    '</svg>';

  function posicaoDoGate(indice) {
    return ((indice + 0.5) / estado.gates.length) * 100;
  }

  function rotuloDoPapel(gate) {
    if (gate.papel === 'entrada') { return 'entrada — etiqueta aplicada'; }
    if (gate.papel === 'transito') { return 'trânsito'; }
    return 'gate de conferência (+' + gate.camposNovos.length + ')';
  }

  function montarCena() {
    var html = '<div id="pes"></div><div id="trilho"><div id="correia"></div></div>';
    html += '<div id="peca">' + SVG_PECA + '</div>';

    estado.gates.forEach(function (gate, indice) {
      html += '<div class="gate" id="gate-' + indice + '" style="left:' + posicaoDoGate(indice).toFixed(3) + '%">' +
        '<div class="monitor" id="monitor-' + indice + '"></div>' +
        '<div class="camera" id="camera-' + indice + '">' + SVG_CAMERA + '<span class="flash"></span></div>' +
        '<div class="feixe"></div>' +
        '<div class="vao"></div>' +
        '<div class="rotulo-gate">' +
          '<span class="ordem">ETAPA ' + esc(gate.ordem) + ' · ' + esc(rotuloDoPapel(gate)) + '</span>' +
          '<span class="nome">' + esc(gate.nome) + '</span>' +
          '<span class="lampada"></span>' +
          '<button type="button" class="veredito-gate" id="vg-' + indice +
            '" data-gate="' + indice + '">aguardando</button>' +
          '<span class="alerta-gate" id="ag-' + indice + '" hidden></span>' +
        '</div>' +
      '</div>';
    });

    el('cena').innerHTML = html;
    estado.gates.forEach(function (gate, indice) { desenharMonitor(indice); });
    recuar();
  }

  // O monitor de um gate mostra as vistas QUE AQUELE GATE CONFERE — a lista
  // veio do plano, não de uma regra local. Sem foto da vista, o quadro diz
  // isso em vez de ficar preto e mudo. Na ENTRADA a câmera olha para a
  // etiqueta, e sem foto dela o monitor exibe o texto do QR: é o que aquela
  // câmera enxerga na linha, e é a fonte da verdade da peça.
  function desenharMonitor(indice) {
    var gate = estado.gates[indice];
    var vistas = vistasDoMonitor(gate);
    var html = '';

    if (gate.papel === 'entrada' && !estado.fotos['etiqueta']) {
      el('monitor-' + indice).innerHTML =
        '<div class="quadro quadro-etiqueta" id="q-' + indice + '-etiqueta">' +
        '<span class="etiqueta-vista">etiqueta · QR</span>' +
        '<pre class="texto-qr">' + esc(el('payload').value.trim() || '(etiqueta em branco no preparo)') + '</pre>' +
        '</div>';
      return;
    }

    vistas.forEach(function (fonte) {
      var foto = estado.fotos[fonte];
      // Rótulo PRIMEIRO: é ele que fica na coluna da esquerda da linha; a foto
      // entra por trás (absoluta) e o texto de ausência ocupa o resto.
      html += '<div class="quadro" id="q-' + indice + '-' + fonte + '">' +
        '<span class="etiqueta-vista">' + esc(fonte) + '</span>';
      if (foto && foto.objectUrl) {
        html += '<img src="' + esc(foto.objectUrl) + '" alt="Captura da vista ' + esc(fonte) + '">';
      } else {
        html += '<span class="vazio">sem captura desta vista</span>';
      }
      html += '</div>';
    });
    if (!vistas.length) {
      html = '<span class="vazio">' +
        (gate.papel === 'transito'
          ? 'etapa de trânsito — nada novo a conferir aqui'
          : 'este gate não confere nenhuma vista') + '</span>';
    }
    el('monitor-' + indice).innerHTML = html;
  }

  function limparCena() {
    el('palco').classList.remove('parado');
    el('desfecho').hidden = true;
    el('desfecho').innerHTML = '';
    fecharDetalhe();
    estado.resultados = {};
    estado.gates.forEach(function (gate, indice) {
      var noGate = el('gate-' + indice);
      if (!noGate) { return; }
      noGate.className = 'gate';
      noGate.removeAttribute('data-clicavel');
      el('vg-' + indice).textContent = 'aguardando';
      el('ag-' + indice).hidden = true;
      el('ag-' + indice).textContent = '';
      el('monitor-' + indice).classList.remove('lendo');
      desenharMonitor(indice);
    });
    recuar();
  }

  function recuar() {
    var peca = el('peca');
    if (!peca) { return; }
    // Sem transição no recuo: rebobinar não é parte da encenação.
    peca.style.transition = 'none';
    peca.style.left = '1.5%';
    peca.classList.remove('trepidando');
    // Força o navegador a aplicar antes de devolver a transição.
    void peca.offsetWidth;
    peca.style.transition = '';
  }

  function moverPeca(porcento) {
    var peca = el('peca');
    peca.classList.add('trepidando');
    peca.style.left = porcento.toFixed(3) + '%';
    return espera(1450).then(function () { peca.classList.remove('trepidando'); });
  }

  function piscarCamera(indice) {
    var camera = el('camera-' + indice);
    camera.classList.add('disparando');
    return espera(560).then(function () { camera.classList.remove('disparando'); });
  }

  function lendo(indice, ligado) {
    el('monitor-' + indice).classList.toggle('lendo', !!ligado);
  }

  function faixa(texto, classe) {
    var caixa = el('faixa');
    caixa.className = classe || '';
    caixa.textContent = texto;
  }

  function selo(texto) { el('selo-modo').textContent = texto; }

  // O rodapé é FIXO (a nota de honestidade tem de ficar no quadro o tempo todo,
  // é ela que impede a plateia de achar que a esteira é real), então o conteúdo
  // precisa reservar exatamente a altura dele — que muda quando o texto quebra
  // em duas linhas. Sem isto, o "esperado 847233 · lido 847833" do painel de
  // parada ficava atrás da faixa, justamente a linha que a demo existe para
  // mostrar.
  function ajustarRodape() {
    var rodape = document.querySelector('.rodape');
    if (!rodape) { return; }
    document.body.style.paddingBottom = (rodape.offsetHeight + 18) + 'px';
  }
  window.addEventListener('resize', ajustarRodape);

  // --- Fotos: slots do preparo ---------------------------------------------

  // As vistas pedidas são as dos GATES DE CONFERÊNCIA. A etiqueta não é
  // conferida (o QR é a referência), mas continua recomendada: é ela que o
  // monitor da entrada mostra.
  function papelDaVista(fonte, exigidas) {
    if (exigidas[fonte]) { return { pedida: true, texto: 'pedida pelos gates de conferência' }; }
    if (fonte === 'etiqueta') { return { pedida: false, texto: 'opcional — aparece no monitor da entrada' }; }
    return { pedida: false, texto: 'nenhum gate desta linha confere esta vista' };
  }

  function montarSlots() {
    var fontes = Object.keys(estado.camposPorVista);
    if (!fontes.length) {
      el('slots').innerHTML = '<p class="dica">O plano da API não trouxe nenhuma vista.</p>';
      return;
    }
    var exigidas = fontesExigidas();
    var pedidas = fontes.filter(function (fonte) { return !!exigidas[fonte]; });
    var feitas = pedidas.filter(function (fonte) { return !!estado.fotos[fonte]; });
    var faltam = pedidas.length - feitas.length;

    var progresso = '<p id="progresso-fotos" class="' + (faltam ? 'aviso neutro' : 'aviso ok') + '">' +
      (pedidas.length
        ? (faltam
          ? 'Faltam ' + faltam + ' de ' + pedidas.length + ' fotos dos gates de conferência (' +
            esc(pedidas.filter(function (f) { return !estado.fotos[f]; }).join(', ')) + ').'
          : 'As ' + pedidas.length + ' fotos dos gates de conferência estão enviadas.')
        : 'Nenhum gate desta linha confere vista alguma.') + '</p>';

    el('slots').innerHTML = progresso + '<div class="grade-slots">' + fontes.map(function (fonte) {
      var foto = estado.fotos[fonte];
      var papel = papelDaVista(fonte, exigidas);
      var classe = 'slot' + (foto ? ' tem-foto' : '') + (papel.pedida ? '' : ' opcional');
      return '<div class="' + classe + '" id="slot-' + fonte + '">' +
        '<b>' + esc(fonte) + '</b>' +
        '<span class="campos">' + esc((estado.camposPorVista[fonte] || []).join(', ') || 'sem campo') + '</span>' +
        '<span class="papel">' + esc(papel.texto) + '</span>' +
        (foto && foto.objectUrl ? '<img class="miniatura" src="' + esc(foto.objectUrl) + '" alt="">' : '') +
        '<input type="file" accept="image/*" data-fonte="' + esc(fonte) + '">' +
      '</div>';
    }).join('') + '</div>';

    Array.prototype.forEach.call(el('slots').querySelectorAll('input[type=file]'), function (entrada) {
      entrada.addEventListener('change', function (evento) {
        var arquivo = evento.target.files && evento.target.files[0];
        if (arquivo) { enviarFoto(evento.target.getAttribute('data-fonte'), arquivo); }
      });
    });
  }

  // Upload é de graça (S3/disco, sem visão): é por isso que a página pode
  // reenviar os mesmos bytes antes de cada gate sem culpa nenhuma.
  function enviarFoto(fonte, arquivo) {
    var dados = new FormData();
    dados.append('file', arquivo);
    dados.append('fonteFisica', fonte);

    return pedir(API + '/fotos-evidencia/upload', { method: 'POST', body: dados })
      .then(function (resposta) {
        if (!resposta.ok || !resposta.corpo || !resposta.corpo.id) {
          throw new Error(mensagemDeErro(resposta.corpo, resposta.status));
        }
        var anterior = estado.fotos[fonte];
        estado.fotos[fonte] = {
          id: resposta.corpo.id,
          url: resposta.corpo.url,
          arquivo: arquivo,
          // Object URL local: o monitor não depende da URL assinada da AWS (que
          // expira em 1 h) para mostrar a captura.
          objectUrl: anterior && anterior.arquivo === arquivo && anterior.objectUrl
            ? anterior.objectUrl
            : URL.createObjectURL(arquivo),
          usadaEm: null
        };
        aviso('fotos-aviso', '');
      })
      .catch(function (erro) {
        aviso('fotos-aviso', 'Vista ' + fonte + ': ' + erro.message, 'erro');
      })
      .then(function () {
        montarSlots();
        estado.gates.forEach(function (gate, indice) { desenharMonitor(indice); });
        atualizarBotoes();
      });
  }

  // Evidência já usada por uma conferência não pode lastrear outra (422
  // foto-evidencia-de-outra-conferencia). Os bytes, sim: sobem de novo como
  // evidência nova. Sem isto a rodada real morreria no segundo gate, porque a
  // semântica cumulativa faz o gate N pedir as vistas dos anteriores.
  function renovarEvidencias(fontes) {
    var usadas = fontes.filter(function (fonte) {
      return estado.fotos[fonte] && estado.fotos[fonte].usadaEm;
    });
    if (!usadas.length) { return Promise.resolve(); }

    var semArquivo = usadas.filter(function (fonte) { return !estado.fotos[fonte].arquivo; });
    if (semArquivo.length) {
      return Promise.reject(new Error('não guardei o arquivo original das vistas: ' +
        semArquivo.join(', ') + ' — reenvie no preparo.'));
    }

    return Promise.all(usadas.map(function (fonte) {
      return enviarFoto(fonte, estado.fotos[fonte].arquivo);
    })).then(function () {
      var falhou = usadas.filter(function (fonte) { return !estado.fotos[fonte] || estado.fotos[fonte].usadaEm; });
      if (falhou.length) {
        throw new Error('o reenvio das vistas ' + falhou.join(', ') + ' falhou — veja o preparo.');
      }
    });
  }

  function fotosDoGate(gate) {
    return gate.vistas.filter(function (fonte) { return !!estado.fotos[fonte]; });
  }

  // Só os gates de CONFERÊNCIA gastam visão: entrada e trânsito fazem uma
  // chamada de passagem cada, que é de graça.
  function custoDaRodadaReal() {
    var fotos = 0;
    gatesDeConferencia().forEach(function (gate) { fotos += fotosDoGate(gate).length; });
    return { fotos: fotos, teto: fotos * CHAMADAS_POR_FOTO * USD_POR_CHAMADA };
  }

  function dolar(valor) {
    return 'US$ ' + valor.toFixed(2).replace('.', ',');
  }

  function atualizarBotoes() {
    var pronto = !!estado.token && estado.gates.length > 0 && !estado.rodando;
    var custo = custoDaRodadaReal();
    el('btn-ensaio').disabled = !pronto;
    el('btn-real').disabled = !pronto || custo.fotos === 0;
    el('btn-reiniciar').disabled = estado.rodando || !estado.gates.length;
    // O custo vai NO BOTÃO, não numa nota de rodapé: quem clica tem de ver o
    // que vai gastar (SPEC, constraint 4).
    el('btn-real').textContent = custo.fotos
      ? 'RODADA REAL — Textract lê as fotos (~' + dolar(custo.teto) + ')'
      : 'RODADA REAL — Textract lê as fotos (sem fotos ainda)';
    el('custo').textContent = custo.fotos
      ? custo.fotos + ' leituras de foto nesta linha · teto de ' + (custo.fotos * CHAMADAS_POR_FOTO) +
        ' chamadas Textract (3 por foto: a foto inteira + 2 recortes de corroboração) · ~' + dolar(custo.teto)
      : 'rodada real: envie fotos no preparo';
  }

  Array.prototype.forEach.call(document.querySelectorAll('input[name=preset]'), function (entrada) {
    entrada.addEventListener('change', function () {
      if (entrada.checked) { estado.preset = entrada.value; }
    });
  });

  // --- A rodada: UM clique, nenhuma chamada em laço ------------------------

  function leiturasDoGate(gate) {
    var preset = PRESETS[estado.preset] || PRESET_DEFEITO;
    var vistos = {};
    var leituras = [];
    // O recorte por gate É o do plano da API; aqui só se lê o preset pelos
    // nomes que ela mandou.
    gate.campos.forEach(function (campo) {
      if (vistos[campo] || !preset[campo]) { return; }
      vistos[campo] = true;
      leituras.push({ campo: campo, valorLido: preset[campo][0], confianca: preset[campo][1] });
    });
    return leituras;
  }

  function registrarPassagem(gate) {
    return exigir('/passagens/registrar', {
      payloadQr: el('payload').value.trim(),
      etapaCodigo: gate.codigo
    });
  }

  function conferirEnsaio(gate) {
    var leituras = leiturasDoGate(gate);
    if (!leituras.length) { return Promise.resolve(null); }
    return exigir('/conferencias/executar', {
      payloadQr: el('payload').value.trim(),
      etapaCodigo: gate.codigo,
      leituras: leituras
    });
  }

  function conferirReal(gate) {
    var fontes = fotosDoGate(gate);
    if (!fontes.length) { return Promise.resolve(null); }
    return renovarEvidencias(fontes).then(function () {
      var atuais = fotosDoGate(gate);
      return exigir('/conferencias/executar-com-fotos', {
        payloadQr: el('payload').value.trim(),
        etapaCodigo: gate.codigo,
        fotoEvidenciaIds: atuais.map(function (fonte) { return estado.fotos[fonte].id; })
      }).then(function (resposta) {
        var id = resposta.conferencia ? resposta.conferencia.id : 'usada';
        atuais.forEach(function (fonte) {
          if (estado.fotos[fonte]) { estado.fotos[fonte].usadaEm = id; }
        });
        return resposta;
      });
    });
  }

  // Alerta do critério 6 do SPEC: o scan devolve a ÚLTIMA conferência conhecida
  // da peça. É histórico, não o veredito deste gate — e o rótulo diz isso.
  function alertaDoScan(indice, registro) {
    var ultima = registro ? registro.ultimaConferencia : null;
    if (!ultima || ultima.vereditoGeral !== 'divergente') { return; }
    var onde = ultima.checkpoint ? ultima.checkpoint.nome : 'peça inteira';
    var caixa = el('ag-' + indice);
    caixa.hidden = false;
    caixa.textContent = 'ALERTA NO SCAN · última conferência desta peça: DIVERGENTE (' + onde + ')';
  }

  // O bounding box como a API mandou: JSON com Left/Top/Width/Height
  // NORMALIZADOS (0..1) no referencial da foto JÁ ORIENTADA pelo EXIF — e o
  // navegador também orienta pelo EXIF, então posicionar por porcentagem cai no
  // lugar certo. Parse DEFENSIVO: caixa torta é pior que caixa nenhuma.
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

  // Desenha o retângulo da leitura sobre a captura do monitor do gate.
  function marcarRegioes(indice, campos) {
    (campos || []).forEach(function (campo) {
      var foto = campo.fotoEvidencia;
      if (!foto) { return; }
      var regiao = regiaoNormalizada(campo.regiaoLeitura);
      if (!regiao) { return; }

      var quadro = el('q-' + indice + '-' + foto.fonteFisica);
      if (!quadro) { return; }
      var marca = document.createElement('span');
      marca.className = 'realce ' + campo.veredito;
      marca.style.left = porcento(regiao.left);
      marca.style.top = porcento(regiao.top);
      marca.style.width = porcento(regiao.largura);
      marca.style.height = porcento(regiao.altura);
      marca.title = campo.campo;
      quadro.appendChild(marca);
    });
  }

  // Miniatura da foto-evidência com a marca de ONDE o número foi lido, para o
  // cartão do detalhe. Mesma técnica de porcentagem do monitor; a imagem fica
  // em proporção natural (width 100%, height auto) justamente para a caixa cair
  // exatamente sobre o número.
  function miniaturaDaEvidencia(url, fonte, regiaoBruta, veredito) {
    if (!url) { return ''; }
    var regiao = regiaoNormalizada(regiaoBruta);
    var realce = regiao
      ? '<span class="realce ' + esc(veredito) + '" style="left:' + porcento(regiao.left) +
        ';top:' + porcento(regiao.top) +
        ';width:' + porcento(regiao.largura) +
        ';height:' + porcento(regiao.altura) + '"></span>'
      : '';
    var legenda = (regiao ? 'onde a leitura saiu' : 'foto-evidência') +
      ' · vista ' + fonte + ' · abrir em outra aba';
    return '<a class="evidencia" href="' + esc(url) + '" target="_blank" rel="noopener">' +
      '<span class="moldura">' +
      '<img src="' + esc(url) + '" alt="Foto-evidência da vista ' + esc(fonte) + '" loading="lazy">' +
      realce + '</span>' +
      '<span class="legenda-evidencia">' + esc(legenda) + '</span></a>';
  }

  // O motivo canônico da API, dito em português (mesmas traduções da /demo).
  // Rotulagem pura: a página não deriva nada do motivo, só o traduz.
  var MOTIVOS = {
    'sem-valor-esperado': 'a etiqueta não traz valor para este campo',
    'sem-leitura': 'a visão não leu nada para este campo',
    'leituras-conflitantes': 'a mesma vista produziu leituras diferentes para este campo',
    'leitura-de-outro-campo': 'o valor lido casa com o valor esperado de OUTRO campo',
    'confianca-abaixo-do-limiar': 'a visão leu, mas com confiança abaixo do limiar',
    'leitura-nao-corroborada': 'marcação em relevo sem segunda leitura concordante — a API não acusa divergência com uma leitura só'
  };

  function motivoLegivel(motivo) {
    if (!motivo) { return ''; }
    return MOTIVOS[motivo] ? MOTIVOS[motivo] + ' (' + motivo + ')' : motivo;
  }

  // Cosmética: hífens viram espaços e a primeira letra sobe. Sem mapa de nomes
  // bonitos — ele envelheceria a cada campo novo da checklist, e o nome
  // canônico continua visível logo abaixo.
  function nomeLegivel(campo) {
    var texto = String(campo || '').replace(/-/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function formatarPercentual(valor) {
    if (valor === null || valor === undefined) { return 'sem confiança'; }
    return (Number(valor) * 100).toFixed(1).replace('.', ',') + '%';
  }

  function valorOuAusente(valor, textoAusente) {
    return valor === null || valor === undefined || valor === ''
      ? '<dd class="ausente">' + esc(textoAusente) + '</dd>'
      : '<dd class="mono">' + esc(valor) + '</dd>';
  }

  // --- Detalhe de um gate: o porquê que o chip não cabe -------------------

  // Um cartão por campo, montado SÓ com o que a resposta já trouxe. Nenhuma
  // comparação, nenhum limiar, nenhuma chamada nova: o veredito, o motivo, a
  // confiança e a foto vieram todos da API no mesmo POST.
  function cartaoDoCampo(campo) {
    var bloco = '<div class="cartao-campo v-' + esc(campo.veredito) + '">' +
      '<div class="topo"><span class="nome-campo">' + esc(nomeLegivel(campo.campo)) + '</span>' +
      '<span class="selo">' + esc(TEXTO_VEREDITO[campo.veredito] || campo.veredito) + '</span></div>' +
      '<span class="canonico">' + esc(campo.campo) + ' · vista ' + esc(campo.fonteFisica) +
      (campo.obrigatorio ? ' · obrigatório' : ' · opcional') + '</span>' +
      '<dl>' +
      '<dt>esperado</dt>' + valorOuAusente(campo.valorEsperado, '(a etiqueta não traz)') +
      '<dt>lido</dt>' + valorOuAusente(campo.valorLido, '(sem leitura)') +
      '<dt>confiança</dt><dd>' + esc(formatarPercentual(campo.confianca)) + '</dd>';
    if (campo.motivo) {
      bloco += '<dt>por quê</dt><dd class="explica">' + esc(motivoLegivel(campo.motivo)) + '</dd>';
    }
    if (campo.campoDaLeitura) {
      bloco += '<dt>casou com</dt><dd class="mono">' + esc(campo.campoDaLeitura) + '</dd>';
    }
    bloco += '</dl>';

    var foto = campo.fotoEvidencia && campo.fotoEvidencia.url ? campo.fotoEvidencia : null;
    if (foto) {
      bloco += miniaturaDaEvidencia(foto.url, foto.fonteFisica || campo.fonteFisica,
        campo.regiaoLeitura, campo.veredito);
    }
    return bloco + '</div>';
  }

  // Campos ordenados por RESULTADO, não pela ordem da checklist: quem impede o
  // conforme tem de aparecer primeiro. Reordenar é exibição, não juízo.
  var PESO_VEREDITO = { divergente: 0, nao_conferivel: 1, conforme: 2 };

  function abrirDetalhe(indice) {
    var resposta = estado.resultados[indice];
    var gate = estado.gates[indice];
    if (!resposta || !gate) { return; }

    var campos = (resposta.campos || []).slice().sort(function (a, b) {
      var pa = PESO_VEREDITO[a.veredito]; var pb = PESO_VEREDITO[b.veredito];
      return (pa === undefined ? 3 : pa) - (pb === undefined ? 3 : pb);
    });
    var veredito = resposta.conferencia ? resposta.conferencia.vereditoGeral : null;

    var caixa = el('detalhe');
    caixa.hidden = false;
    caixa.innerHTML =
      '<div class="cabeca">' +
      '<h3>Etapa ' + esc(gate.ordem) + ' — ' + esc(gate.nome) + '</h3>' +
      '<span class="sub">' + esc(TEXTO_VEREDITO[veredito] || 'sem veredito') + ' · ' +
      esc(contagemDoChip(veredito, resposta.campos || [])) +
      ' · conferência ' + esc(resposta.conferencia ? resposta.conferencia.id : '') + '</span>' +
      '<button type="button" class="fechar" id="btn-fechar-detalhe">Fechar</button>' +
      '</div>' +
      '<div class="grade-campos">' + campos.map(cartaoDoCampo).join('') + '</div>';

    el('btn-fechar-detalhe').addEventListener('click', fecharDetalhe);
    if (caixa.scrollIntoView) { caixa.scrollIntoView({ block: 'nearest' }); }
  }

  function fecharDetalhe() {
    var caixa = el('detalhe');
    caixa.hidden = true;
    caixa.innerHTML = '';
  }

  // Delegação: os chips nascem e morrem com montarCena(), então o ouvinte fica
  // no palco, que é permanente.
  el('cena').addEventListener('click', function (evento) {
    var alvo = evento.target;
    while (alvo && alvo !== this && (!alvo.getAttribute || alvo.getAttribute('data-gate') === null)) {
      alvo = alvo.parentNode;
    }
    if (!alvo || alvo === this) { return; }
    abrirDetalhe(Number(alvo.getAttribute('data-gate')));
  });

  // Acende o gate com o veredito que a API gravou. Nada é recalculado: a cor
  // sai de resposta.conferencia.vereditoGeral, ponto.
  function acender(indice, resposta, modo) {
    var noGate = el('gate-' + indice);
    if (!resposta) {
      // Não houve conferência: na rodada real, porque nenhuma vista deste gate
      // tem foto; no ensaio, porque nenhum campo do gate está no preset. Nos
      // dois casos o gate fica SEM veredito — e dizer isso é obrigatório, já
      // que "não conferi" jamais pode passar por "conforme".
      noGate.className = 'gate falha';
      el('vg-' + indice).textContent = modo === 'real' ? 'SEM CAPTURA' : 'SEM LEITURA';
      return 'sem-conferencia';
    }
    var veredito = resposta.conferencia ? resposta.conferencia.vereditoGeral : null;
    noGate.className = 'gate ' + (veredito || 'falha');
    // A resposta inteira fica guardada: é dela que o painel de detalhe monta o
    // porquê, sem tocar a rede de novo.
    estado.resultados[indice] = resposta;
    noGate.setAttribute('data-clicavel', '1');
    var chip = el('vg-' + indice);
    chip.textContent = (TEXTO_VEREDITO[veredito] || 'SEM VEREDITO') +
      ' · ' + contagemDoChip(veredito, resposta.campos || []) + ' ▸';
    chip.title = 'Ver os campos deste gate: esperado, lido, confiança e o motivo de cada veredito';
    marcarRegioes(indice, resposta.campos);
    return veredito;
  }

  // Entrada e trânsito NÃO produzem veredito — só passagem. O chip diz isso com
  // cor própria: pintar de verde seria dar por aprovado o que ninguém conferiu.
  function marcarRegistro(indice, gate) {
    var noGate = el('gate-' + indice);
    noGate.className = 'gate registrado';
    noGate.removeAttribute('data-clicavel');
    var chip = el('vg-' + indice);
    chip.textContent = gate.papel === 'entrada'
      ? 'PEÇA REGISTRADA NA LINHA'
      : 'PASSAGEM REGISTRADA — peça rastreada';
    chip.title = gate.papel === 'entrada'
      ? 'A etiqueta é a referência da peça, não algo a conferir: aqui só se registra a entrada.'
      : 'Nenhuma marcação nova até esta etapa — não há o que conferir, só rastrear.';
  }

  // "DIVERGENTE · 8 campos" lia-se como "8 campos divergentes" — o 8 é o total
  // conferido no gate. Quando o veredito é de MINORIA (um campo derrubou o
  // conjunto), o chip diz "1 de 8". É CONTAGEM DE EXIBIÇÃO dos vereditos que a
  // API já emitiu: nada é comparado nem reclassificado aqui.
  function contagemDoChip(veredito, campos) {
    if (veredito !== 'divergente' && veredito !== 'nao_conferivel') {
      return campos.length + ' campos';
    }
    var quantos = campos.filter(function (campo) { return campo.veredito === veredito; }).length;
    return quantos + ' de ' + campos.length + ' campos';
  }

  function divergentesDe(resposta) {
    return (resposta.campos || []).filter(function (campo) { return campo.veredito === 'divergente'; });
  }

  function naoConferiveisDe(resposta) {
    return (resposta.campos || []).filter(function (campo) { return campo.veredito === 'nao_conferivel'; });
  }

  // Uma linha de ressalva: o que a API LEU e por que se recusou a afirmar.
  function linhaDoAmbar(campo) {
    return '<li class="ressalva-linha">' +
      '<span class="rotulo-campo">' + esc(nomeLegivel(campo.campo)) + '</span>' +
      ' · lido <span class="valor">' + esc(campo.valorLido === null || campo.valorLido === undefined
        ? '(sem leitura)' : campo.valorLido) + '</span>' +
      ' · confiança <span class="valor">' + esc(formatarPercentual(campo.confianca)) + '</span>' +
      (campo.motivo ? '<span class="porque">' + esc(motivoLegivel(campo.motivo)) + '</span>' : '') +
      '</li>';
  }

  function botaoVerGate(indice) {
    return '<button type="button" class="ver-gate" data-abre-gate="' + esc(indice) +
      '">Ver todos os campos deste gate</button>';
  }

  function pararLinha(gate, indice, resposta) {
    el('palco').classList.add('parado');
    var divergentes = divergentesDe(resposta);
    var pendentes = naoConferiveisDe(resposta);
    var itens = divergentes.map(function (campo) {
      return '<li><span class="campo-nome">' + esc(campo.campo) + ' · vista ' + esc(campo.fonteFisica) + '</span>' +
        '<span class="par">esperado <b class="esperado">' + esc(campo.valorEsperado) + '</b>' +
        ' · lido <b class="lido">' + esc(campo.valorLido) + '</b></span></li>';
    }).join('');

    // Os âmbar deste gate entram embaixo e discretos: quem manda parar a linha é
    // o divergente, mas esconder o resto seria contar meia história.
    var bloco = '';
    if (pendentes.length) {
      bloco = '<div class="bloco-ambar"><h3>No mesmo gate, ' + pendentes.length +
        ' campo(s) não conferível(is)</h3>' +
        '<p>A API leu, mas não afirma — não são divergência: são pedido de olho humano.</p>' +
        '<ul>' + pendentes.map(linhaDoAmbar).join('') + '</ul></div>';
    }

    var caixa = el('desfecho');
    caixa.hidden = false;
    caixa.className = 'parada';
    caixa.innerHTML = '<h2>Linha parada — divergência na etapa ' + esc(gate.ordem) + ', ' + esc(gate.nome) + '</h2>' +
      '<p class="sub">A peça não avança até a correção. Veredito emitido pela API (POST /conferencias/executar) e gravado com foto-evidência.</p>' +
      '<ul>' + (itens || '<li>A API marcou a conferência como divergente; veja o veredito campo a campo na conferência ' +
        esc(resposta.conferencia ? resposta.conferencia.id : '') + '.</li>') + '</ul>' +
      bloco + botaoVerGate(indice);
    faixa('LINHA PARADA na etapa ' + gate.ordem + ' — ' + gate.nome + '. ' +
      divergentes.length + ' campo(s) divergente(s).', 'parada');
    selo('linha parada');
  }

  function encerrarLinha(resumo) {
    var caixa = el('desfecho');
    caixa.hidden = false;
    if (resumo.ressalvas.length) {
      caixa.className = 'ressalva';
      // Contar não explica nada. O que convence é ver que o sistema LEU o
      // número certo e ainda assim se recusou a aprovar — com o motivo que a
      // própria API devolveu. O limiar não é dito aqui de propósito: ele é
      // parâmetro da engine, e a página não conhece regra de comparação.
      caixa.innerHTML = '<h2>Fim da linha com ressalva</h2>' +
        '<p class="sub">Nenhuma divergência — mas o sistema LEU os campos abaixo e se recusou a afirmá-los. ' +
        'No relevo, a confiança do OCR mede ENQUADRAMENTO e não correção (medido: o mesmo valor certo oscilou ' +
        'de 37% a 95% só mudando o recorte), então abaixo do limiar que a API aplica ela pede olho humano em ' +
        'vez de aprovar no chute. Ilegível nunca vira conforme.</p>' +
        '<ul>' + resumo.ressalvas.map(function (item) {
          var corpo = item.campos && item.campos.length
            ? '<ul>' + item.campos.map(linhaDoAmbar).join('') + '</ul>'
            : '<span>' + esc(item.texto || 'sem detalhe') + '</span>';
          return '<li><span class="ressalva-gate">etapa ' + esc(item.ordem) + ' · ' + esc(item.gate) + '</span>' +
            corpo +
            (estado.resultados[item.indice] ? botaoVerGate(item.indice) : '') + '</li>';
        }).join('') + '</ul>';
      faixa('Fim da linha com ressalva: ' + resumo.ressalvas.length + ' gate(s) exigem conferência humana.', 'ressalva');
      selo('conferência humana');
      return;
    }
    var quantos = gatesDeConferencia().length;
    caixa.className = 'liberada';
    caixa.innerHTML = '<h2>Expedição liberada</h2>' +
      '<p class="sub">Os ' + esc(quantos) + ' gates de conferência desta linha responderam conforme, e as demais etapas ' +
      'registraram a passagem da peça. Cada veredito foi emitido pela API e gravado com a foto que o lastreia.</p>';
    faixa('EXPEDIÇÃO LIBERADA — a peça passou pelas ' + estado.gates.length + ' etapas, com veredito conforme nos ' +
      quantos + ' gates de conferência.', 'liberada');
    selo('expedição liberada');
  }

  function nomeDaRota(modo) {
    return modo === 'real' ? 'POST /conferencias/executar-com-fotos' : 'POST /conferencias/executar';
  }

  function textoDaCaptura(gate) {
    if (gate.papel === 'entrada') { return 'a etiqueta adesiva (QR) da peça'; }
    if (!gate.vistas.length) { return 'nenhuma vista'; }
    return gate.vistas.join(', ');
  }

  // A coreografia de UMA etapa. Ordem fixa: a peça chega, a câmera dispara, o
  // monitor mostra o que ela capturou, a passagem é registrada — e SÓ NOS GATES
  // DE CONFERÊNCIA vem a conferência. Entrada e trânsito param na passagem:
  // uma chamada, nenhuma visão, nenhum veredito.
  function rodarGate(indice, modo, resumo) {
    var gate = estado.gates[indice];
    var confere = gate.papel === 'gate';

    faixa('A peça avança para a etapa ' + gate.ordem + ' — ' + gate.nome + '.', '');
    return moverPeca(posicaoDoGate(indice))
      .then(function () {
        faixa('Etapa ' + gate.ordem + ': a câmera captura ' + textoDaCaptura(gate) + '.', '');
        return piscarCamera(indice);
      })
      .then(function () {
        lendo(indice, true);
        faixa('Etapa ' + gate.ordem + ': registrando a passagem da peça (POST /passagens/registrar).', '');
        return registrarPassagem(gate);
      })
      .then(function (registro) {
        alertaDoScan(indice, registro);
        if (!confere) {
          // O ramo curto: o QR é a referência (entrada) ou nada novo foi
          // gravado desde o gate anterior (trânsito). Conferir aqui gastaria
          // visão para repetir uma resposta que a linha já tem.
          return espera(450).then(function () {
            lendo(indice, false);
            marcarRegistro(indice, gate);
            var peca = registro && registro.transformador ? registro.transformador.numeroSerie : 'sem série';
            faixa(gate.papel === 'entrada'
              ? 'Etapa ' + gate.ordem + ': peça ' + peca + ' registrada na linha (etiqueta aplicada).'
              : 'Etapa ' + gate.ordem + ': passagem registrada — nenhuma marcação nova para conferir aqui.', '');
            return { registrada: true };
          });
        }
        faixa('Etapa ' + gate.ordem + ': ' +
          (modo === 'real' ? 'Textract lendo as fotos' : 'conferindo as leituras simuladas') +
          ' — ' + nomeDaRota(modo) + '.', '');
        return modo === 'real' ? conferirReal(gate) : conferirEnsaio(gate);
      })
      .then(function (resposta) {
        // Espera curta para o olho acompanhar quando a resposta volta instantânea.
        return espera(500).then(function () { return resposta; });
      })
      .then(function (resposta) {
        if (resposta && resposta.registrada) { return false; }
        lendo(indice, false);
        var veredito = acender(indice, resposta, modo);

        if (veredito === 'sem-conferencia') {
          resumo.ressalvas.push({
            ordem: gate.ordem, gate: gate.nome, indice: indice, campos: [],
            texto: modo === 'real'
              ? 'sem foto das vistas deste gate — nada foi conferido aqui.'
              : 'nenhum campo deste gate está no conjunto de leituras simuladas — nada foi conferido aqui.'
          });
          faixa('Etapa ' + gate.ordem + ': nada conferido neste gate. A peça segue SEM veredito aqui.', 'ressalva');
          return false;
        }
        if (veredito === 'divergente') {
          pararLinha(gate, indice, resposta);
          return true;
        }
        if (veredito === 'nao_conferivel') {
          // Os CAMPOS inteiros, não um texto achatado: o painel de fim precisa
          // de valor lido, confiança e motivo para explicar a recusa.
          resumo.ressalvas.push({
            ordem: gate.ordem, gate: gate.nome, indice: indice,
            campos: naoConferiveisDe(resposta)
          });
          faixa('Etapa ' + gate.ordem + ': NÃO CONFERÍVEL — exige conferência humana. A peça segue com aviso.', 'ressalva');
          return false;
        }
        faixa('Etapa ' + gate.ordem + ': CONFORME. A peça segue.', '');
        return false;
      });
  }

  function sequencia(indice, modo, resumo) {
    if (indice >= estado.gates.length) { return Promise.resolve(false); }
    return rodarGate(indice, modo, resumo).then(function (parou) {
      if (parou) { return true; }
      return espera(750).then(function () { return sequencia(indice + 1, modo, resumo); });
    });
  }

  function iniciarRodada(modo) {
    if (estado.rodando) { return; }
    if (!el('payload').value.trim()) {
      aviso('login-aviso', 'O conteúdo da etiqueta (preparo, passo 2) está vazio.', 'erro');
      el('preparo').open = true;
      return;
    }

    estado.rodando = true;
    atualizarBotoes();
    limparCena();
    el('preparo').open = false;
    selo(modo === 'real' ? 'rodada real — Textract' : 'rodada de ensaio');

    var resumo = { ressalvas: [] };
    espera(250)
      .then(function () { return sequencia(0, modo, resumo); })
      .then(function (parou) {
        if (parou) { return null; }
        faixa('A peça deixa a linha.', '');
        return moverPeca(99).then(function () { encerrarLinha(resumo); });
      })
      .catch(function (erro) {
        el('palco').classList.remove('parado');
        faixa('A rodada parou por FALHA DE CHAMADA (não é veredito da peça): ' + erro.message, 'parada');
        selo('falha na chamada');
      })
      .then(function () {
        estado.rodando = false;
        atualizarBotoes();
      });
  }

  // Mesma porta de entrada do chip, a partir dos painéis de resultado.
  el('desfecho').addEventListener('click', function (evento) {
    var alvo = evento.target;
    while (alvo && alvo !== this && (!alvo.getAttribute || alvo.getAttribute('data-abre-gate') === null)) {
      alvo = alvo.parentNode;
    }
    if (!alvo || alvo === this) { return; }
    abrirDetalhe(Number(alvo.getAttribute('data-abre-gate')));
  });

  el('btn-ensaio').addEventListener('click', function () { iniciarRodada('ensaio'); });
  el('btn-real').addEventListener('click', function () { iniciarRodada('real'); });
  el('btn-reiniciar').addEventListener('click', function () {
    if (estado.rodando) { return; }
    limparCena();
    faixa('Cena rebobinada. Dispare uma rodada.', '');
    selo('preparo');
  });

  atualizarBotoes();
  ajustarRodape();
})();
</script>
</body>
</html>`;
