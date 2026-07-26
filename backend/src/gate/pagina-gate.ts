/**
 * PÁGINA DE APRESENTAÇÃO TEMPORÁRIA — REMOVER JUNTO COM A /demo (gap 13).
 *
 * O "modo câmera fixa": o celular fica MONTADO num tripé apontado para a peça e
 * passa a se comportar como a câmera de UM gate da linha — o desenho da rodada
 * futura do SPEC ("Planejado / Câmeras fixas na linha"), encenado com o
 * hardware que existe hoje. A câmera é encenação; a conferência é real.
 *
 * Uma única template string: HTML + CSS + JS inline, ES5, zero dependência
 * externa (nenhum CDN, nenhuma fonte remota). Todo fetch usa caminho relativo,
 * então a página funciona em qualquer host/porta onde a API estiver servindo.
 *
 * ------------------------------------------------------------------------
 * O QUE ESTA PÁGINA NÃO FAZ (regra de ouro do CLAUDE.md)
 * ------------------------------------------------------------------------
 * Não compara campo, não conhece limiar, não calcula veredito. Ela sobe a foto,
 * chama `POST /conferencias/executar-com-fotos` e pinta na tela a cor que a API
 * mandou. O detector decide QUANDO fotografar; ele nunca decide nada sobre a
 * peça.
 *
 * ------------------------------------------------------------------------
 * CONSTRAINT 4 DO SPEC (créditos AWS) — como ela é respeitada aqui
 * ------------------------------------------------------------------------
 * O detector de presença é aritmética local sobre quadros do <video> (canvas
 * 64x36 em memória): NENHUMA requisição, nunca, em nenhuma fase. A rede só é
 * tocada no DISPARO, e o disparo é limitado por construção:
 *
 *   1. armar é um toque explícito do operador (a "ação explícita" da
 *      constraint) e o custo está escrito NO botão, antes de gastar;
 *   2. um armamento produz NO MÁXIMO um disparo — depois de capturar, a câmera
 *      volta a DESARMADA sozinha. Não existe laço de reprocessamento;
 *   3. rearmar é outra decisão humana, com cooldown visível de 5 s;
 *   4. `estado.disparando` é a guarda anti-corrida: dois quadros seguidos
 *      cruzando o limiar não viram duas conferências.
 *
 * ------------------------------------------------------------------------
 * A HONESTIDADE DA VISTA ÚNICA
 * ------------------------------------------------------------------------
 * Um aparelho é UMA câmera, e uma câmera vê UMA vista. O recorte da etapa quase
 * sempre pede mais vistas do que essa — então o veredito vai trazer os campos
 * das outras vistas em âmbar, `sem-leitura`. Isso não é bug: é literalmente o
 * desenho do SPEC ("cada gate cobra a interseção recorte da etapa ∩ fontes
 * cobertas pelas câmeras dele"). A página diz isso com todas as letras na tela
 * do veredito, com os nomes das vistas que faltam — que ela lê do
 * `GET /conferencias/plano-de-fotos`, a mesma fonte que a /demo e a /esteira
 * usam. Nada de recorte reimplementado no cliente.
 */
export const PAGINA_GATE = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#080d12">
<title>TRAEL — câmera de gate (apresentação)</title>
<style>
  :root {
    --fundo: #080d12;
    --painel: #121c26;
    --aco: #17222d;
    --borda: #223140;
    --borda-forte: #33475c;
    --tinta: #e9f1f8;
    --tinta-fraca: #91a4b6;
    --acento: #4aa8e0;
    --verde: #35d07f;
    --verde-fundo: #0f2e1e;
    --ambar: #f5b23d;
    --ambar-fundo: #33260a;
    --vermelho: #ff5252;
    --vermelho-fundo: #3a1013;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: var(--fundo);
    color: var(--tinta);
    font: 16px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  button {
    font: inherit;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid var(--borda-forte);
    background: var(--aco);
    color: var(--tinta);
    padding: 10px 14px;
    -webkit-appearance: none;
  }
  button.principal { background: var(--acento); border-color: var(--acento); color: #06121c; font-weight: 700; }
  button.perigo { background: #b3421f; border-color: #d4562c; color: #fff; font-weight: 700; }
  button[disabled] { opacity: .45; cursor: not-allowed; }
  .aviso {
    margin: 10px 0 0;
    padding: 9px 11px;
    border-radius: 5px;
    font-size: 13px;
    border: 1px solid var(--borda-forte);
    background: rgba(0,0,0,.25);
  }
  .aviso.ok { border-color: var(--verde); color: #b8f0d3; background: var(--verde-fundo); }
  .aviso.erro { border-color: var(--vermelho); color: #ffc9c9; background: var(--vermelho-fundo); }
  .aviso.atencao { border-color: var(--ambar); color: #ffe2ab; background: var(--ambar-fundo); }

  /* ---------------- Tela 1: preparo (montagem do aparelho) ---------------- */
  #tela-preparo { padding: 14px 14px 40px; max-width: 720px; margin: 0 auto; }
  #tela-preparo header { margin-bottom: 12px; }
  #tela-preparo h1 { margin: 0; font-size: 19px; letter-spacing: .1em; text-transform: uppercase; }
  #tela-preparo header p { margin: 6px 0 0; font-size: 13px; color: var(--tinta-fraca); }
  .cartao {
    background: var(--painel);
    border: 1px solid var(--borda);
    border-radius: 8px;
    padding: 13px;
    margin-bottom: 12px;
  }
  .cartao h2 {
    margin: 0 0 4px;
    font-size: 12px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--acento);
  }
  .cartao p.contexto { margin: 0 0 10px; font-size: 13px; color: var(--tinta-fraca); }
  .cartao p.dica { margin: 9px 0 0; font-size: 12px; color: var(--tinta-fraca); }
  label.rotulo { display: block; font-size: 12px; color: var(--tinta-fraca); margin: 9px 0 3px; }
  input[type=text], input[type=email], input[type=password], textarea {
    width: 100%;
    background: #0a1219;
    color: var(--tinta);
    border: 1px solid var(--borda-forte);
    border-radius: 5px;
    padding: 10px;
    font: inherit;
    font-size: 15px;
  }
  textarea { min-height: 122px; resize: vertical; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; }
  .grade-escolha { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grade-escolha button {
    text-align: left;
    min-height: 60px;
    padding: 9px 11px;
    background: #0a1219;
  }
  .grade-escolha button[aria-pressed="true"] {
    border-color: var(--acento);
    background: #10293a;
    box-shadow: inset 0 0 0 1px var(--acento);
  }
  .grade-escolha .titulo-escolha { display: block; font-size: 15px; font-weight: 700; }
  .grade-escolha .sub-escolha { display: block; font-size: 12px; margin-top: 3px; color: var(--tinta-fraca); }
  .grade-escolha button[aria-pressed="true"] .sub-escolha { color: #bcd6e8; }
  #btn-montar { width: 100%; padding: 16px; font-size: 17px; letter-spacing: .04em; }
  .rodape-preparo { font-size: 12px; color: var(--tinta-fraca); text-align: center; margin: 14px 0 0; }

  /* ---------------- Tela 2: visor da câmera ------------------------------- */
  #tela-visor { position: fixed; inset: 0; background: #000; overflow: hidden; }
  #video {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    background: #000;
  }
  #hud { position: absolute; inset: 0; display: flex; flex-direction: column; pointer-events: none; }
  #hud > * { pointer-events: auto; }

  #cinta {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 10px 12px;
    padding-top: calc(10px + env(safe-area-inset-top));
    background: linear-gradient(to bottom, rgba(0,0,0,.82), rgba(0,0,0,0));
    font-size: 12px;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  #lampada {
    width: 13px; height: 13px; border-radius: 50%;
    background: var(--tinta-fraca);
    box-shadow: 0 0 0 3px rgba(255,255,255,.1);
    flex: none;
  }
  body[data-armada="1"] #lampada { background: var(--vermelho); animation: pulsar 1.6s ease-in-out infinite; }
  body[data-armada="2"] #lampada { background: var(--ambar); }
  @keyframes pulsar { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
  #rotulo-estado { font-weight: 700; letter-spacing: .1em; }
  #rotulo-ponto { color: var(--tinta-fraca); margin-left: auto; text-align: right; text-transform: none; letter-spacing: 0; }

  #mira { flex: 1; position: relative; margin: 4px 18px; }
  #mira span {
    position: absolute; width: 30px; height: 30px;
    border: 2px solid rgba(255,255,255,.55);
  }
  #mira .ce { top: 0; left: 0; border-right: 0; border-bottom: 0; }
  #mira .cd { top: 0; right: 0; border-left: 0; border-bottom: 0; }
  #mira .be { bottom: 0; left: 0; border-right: 0; border-top: 0; }
  #mira .bd { bottom: 0; right: 0; border-left: 0; border-top: 0; }
  body[data-armada="1"] #mira span { border-color: rgba(255,82,82,.9); }

  #painel-inferior {
    background: linear-gradient(to top, rgba(0,0,0,.9) 60%, rgba(0,0,0,0));
    padding: 14px 12px;
    padding-bottom: calc(14px + env(safe-area-inset-bottom));
  }
  #medidor {
    height: 8px; border-radius: 4px; background: rgba(255,255,255,.14);
    position: relative; overflow: hidden; margin-bottom: 4px;
  }
  #medidor-barra { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--acento); }
  #medidor-limiar { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--ambar); }
  #medidor-texto { font-size: 11px; color: var(--tinta-fraca); margin: 0 0 10px; font-variant-numeric: tabular-nums; }
  #btn-armar { width: 100%; padding: 18px 14px; font-size: 18px; letter-spacing: .05em; }
  #btn-armar .custo-linha { display: block; font-size: 12px; font-weight: 400; letter-spacing: 0; margin-top: 4px; opacity: .9; }
  #nota-custo { margin: 9px 0 0; font-size: 12px; color: var(--tinta-fraca); text-align: center; }
  .linha-visor { display: flex; gap: 8px; margin-top: 10px; }
  .linha-visor button { flex: 1; font-size: 13px; padding: 9px; background: rgba(255,255,255,.08); }

  #flash {
    position: absolute; inset: 0; background: #fff; opacity: 0;
    pointer-events: none;
  }
  #flash.disparou { animation: clarao .45s ease-out; }
  @keyframes clarao { 0% { opacity: .92; } 100% { opacity: 0; } }

  #sem-camera {
    position: absolute; inset: 0;
    background: var(--fundo);
    padding: 18px;
    padding-top: calc(18px + env(safe-area-inset-top));
    overflow-y: auto;
  }
  #sem-camera h2 { margin: 0 0 8px; font-size: 17px; color: var(--ambar); }
  #sem-camera p { font-size: 14px; color: var(--tinta-fraca); }
  #sem-camera label.arquivo {
    display: block; margin-top: 14px; padding: 16px; text-align: center;
    border: 1px dashed var(--borda-forte); border-radius: 8px;
    background: var(--painel); font-size: 15px; font-weight: 700;
  }
  #sem-camera input[type=file] { display: block; margin: 10px auto 0; font-size: 13px; }

  /* ---------------- Tela 3: veredito -------------------------------------- */
  #tela-veredito {
    position: fixed; inset: 0; overflow-y: auto;
    background: var(--fundo);
    padding-bottom: calc(96px + env(safe-area-inset-bottom));
  }
  #faixa-veredito {
    padding: 22px 16px;
    padding-top: calc(22px + env(safe-area-inset-top));
    border-bottom: 2px solid transparent;
  }
  #faixa-veredito h2 { margin: 0; font-size: 30px; line-height: 1.1; letter-spacing: .04em; text-transform: uppercase; }
  #faixa-veredito p { margin: 8px 0 0; font-size: 14px; }
  #tela-veredito[data-veredito="conforme"] #faixa-veredito { background: var(--verde-fundo); border-color: var(--verde); }
  #tela-veredito[data-veredito="conforme"] h2 { color: var(--verde); }
  #tela-veredito[data-veredito="divergente"] #faixa-veredito { background: var(--vermelho-fundo); border-color: var(--vermelho); }
  #tela-veredito[data-veredito="divergente"] h2 { color: #ff8b8b; }
  #tela-veredito[data-veredito="nao_conferivel"] #faixa-veredito { background: var(--ambar-fundo); border-color: var(--ambar); }
  #tela-veredito[data-veredito="nao_conferivel"] h2 { color: var(--ambar); }
  #tela-veredito[data-veredito="erro"] #faixa-veredito { background: #2a1a2e; border-color: #a98bf0; }
  #tela-veredito[data-veredito="erro"] h2 { color: #cbb6ff; }

  #corpo-veredito { padding: 14px 14px 0; }
  .campo {
    background: var(--painel);
    border: 1px solid var(--borda);
    border-left-width: 5px;
    border-radius: 7px;
    padding: 11px 12px;
    margin-bottom: 9px;
  }
  .campo.v-conforme { border-left-color: var(--verde); }
  .campo.v-divergente { border-left-color: var(--vermelho); }
  .campo.v-nao_conferivel { border-left-color: var(--ambar); }
  .campo .cabeca { display: flex; align-items: baseline; gap: 8px; }
  .campo .nome { font-size: 15px; font-weight: 700; }
  .campo .selo { margin-left: auto; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
  .campo.v-conforme .selo { color: var(--verde); }
  .campo.v-divergente .selo { color: #ff8b8b; }
  .campo.v-nao_conferivel .selo { color: var(--ambar); }
  .campo .canonico { display: block; font-size: 11px; color: var(--tinta-fraca); margin-top: 2px; }
  .campo .par { display: block; margin-top: 7px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 17px; }
  .campo .par .esperado { color: var(--verde); }
  .campo .par .lido { color: #ff8b8b; }
  .campo .par .ausente { color: var(--tinta-fraca); font-style: italic; font-family: inherit; font-size: 14px; }
  .campo .porque { display: block; margin-top: 6px; font-size: 13px; color: var(--tinta-fraca); }
  .campo img.evidencia { display: block; margin-top: 9px; width: 100%; border-radius: 5px; border: 1px solid var(--borda-forte); }

  #cobertura {
    background: var(--aco);
    border: 1px solid var(--borda-forte);
    border-radius: 7px;
    padding: 11px 12px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--tinta-fraca);
  }
  #cobertura b { color: var(--tinta); }
  #rodape-veredito {
    position: fixed; left: 0; right: 0; bottom: 0;
    background: rgba(8,13,18,.97);
    border-top: 1px solid var(--borda);
    padding: 10px 12px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    display: flex; gap: 8px;
  }
  #btn-rearmar { flex: 2; padding: 15px; font-size: 16px; }
  #btn-desmontar { flex: 1; font-size: 13px; }

  @media (prefers-reduced-motion: reduce) {
    #lampada, #flash.disparou { animation: none !important; }
    body[data-armada="1"] #lampada { opacity: 1; }
    /* Sem clarão: o disparo continua sinalizado pela lâmpada e pelo texto. */
    #flash.disparou { opacity: 0; }
  }
</style>
</head>
<body data-armada="0">

<!-- =================== TELA 1 — PREPARO / MONTAGEM ====================== -->
<section id="tela-preparo">
  <header>
    <h1>TRAEL — câmera de gate</h1>
    <p>Este aparelho vira a câmera fixa de UM ponto da linha: monte no tripé, aponte para a peça e arme. A câmera é encenação — a conferência é real, feita pela API.</p>
  </header>

  <div class="cartao">
    <h2>1 · Entrar</h2>
    <p class="contexto">Em produção a câmera já nasce provisionada com credencial própria. Aqui a página faz login para poder falar com a API.</p>
    <label class="rotulo" for="email">E-mail</label>
    <input type="email" id="email" value="admin@example.com" autocomplete="username" autocapitalize="none" spellcheck="false">
    <label class="rotulo" for="senha">Senha</label>
    <input type="password" id="senha" value="secret" autocomplete="current-password">
    <button id="btn-login" class="principal" style="margin-top:11px;width:100%">ENTRAR E CARREGAR A LINHA</button>
    <div id="login-aviso" class="aviso" hidden></div>
  </div>

  <div class="cartao">
    <h2>2 · Etiqueta da peça</h2>
    <p class="contexto">É a fonte da verdade da conferência. Em produção o QR é lido na adesivação e viaja com a peça; aqui ele fica fixo neste aparelho.</p>
    <textarea id="payload" spellcheck="false" autocapitalize="none">Pedido: 68202
Núm. Série: 847233
Seq: 86
Patrimônio: 251328
Cliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A
TPD-408136</textarea>
    <p class="dica">Quem interpreta este texto é a API — a página só o transporta.</p>
  </div>

  <div class="cartao">
    <h2>3 · Ponto da linha (etapa)</h2>
    <p class="contexto">Define o que este gate cobra: cada ponto só confere as marcações que já foram gravadas na peça até ali. Abrir a URL com <b>?etapa=&lt;codigo&gt;</b> fixa o ponto — é assim que, em produção, cada câmera é provisionada.</p>
    <div class="grade-escolha" id="grade-etapas"></div>
    <p class="dica" id="etapa-dica">Entre no passo 1 para a página buscar as etapas da linha.</p>
  </div>

  <div class="cartao">
    <h2>4 · Vista que esta câmera enxerga</h2>
    <p class="contexto">Uma câmera vê UM lado da peça — nunca "o chumbado 2". As outras vistas deste gate são de outras câmeras; nesta captura elas vão sair sem leitura, e a tela do veredito diz isso.</p>
    <div class="grade-escolha" id="grade-vistas"></div>
    <p class="dica" id="vista-dica">A lista sai da checklist do projeto (GET /conferencias/plano-de-fotos), não de constante na página.</p>
  </div>

  <button id="btn-montar" class="principal" disabled>MONTAR A CÂMERA NESTE PONTO</button>
  <div id="montar-aviso" class="aviso" hidden></div>
  <p class="rodape-preparo">Nenhuma chamada de visão acontece no preparo: aqui só se lê a linha e a checklist. O gasto começa no ARMAR.</p>
</section>

<!-- =================== TELA 2 — VISOR DA CÂMERA ========================= -->
<section id="tela-visor" hidden>
  <video id="video" playsinline muted autoplay></video>
  <div id="flash"></div>

  <div id="hud">
    <div id="cinta">
      <span id="lampada"></span>
      <span id="rotulo-estado">DESARMADA</span>
      <span id="rotulo-ponto"></span>
    </div>

    <div id="mira"><span class="ce"></span><span class="cd"></span><span class="be"></span><span class="bd"></span></div>

    <div id="painel-inferior">
      <div id="medidor"><div id="medidor-barra"></div><div id="medidor-limiar"></div></div>
      <p id="medidor-texto">detector parado — a câmera está desarmada</p>
      <button id="btn-armar" class="perigo">ARMAR CÂMERA<span class="custo-linha" id="custo-armar"></span></button>
      <p id="nota-custo">1 captura = 1 conferência paga. Um armamento dispara no máximo UMA vez; rearmar é outra decisão sua.</p>
      <div class="linha-visor">
        <button id="btn-desmontar-visor">Ajustar montagem</button>
        <button id="btn-capturar-manual">Capturar agora</button>
      </div>
    </div>
  </div>

  <div id="sem-camera" hidden>
    <h2>Sem vídeo ao vivo neste aparelho</h2>
    <p id="sem-camera-motivo"></p>
    <p>O detector de presença precisa do vídeo, então ele fica indisponível. O resto do gate continua funcionando: tire a foto pelo botão abaixo e a conferência roda igual — quem dispara passa a ser você, o que é ainda mais explícito.</p>
    <label class="arquivo" for="arquivo-fallback">FOTOGRAFAR A PEÇA
      <input type="file" id="arquivo-fallback" accept="image/*" capture="environment">
    </label>
    <div id="fallback-aviso" class="aviso" hidden></div>
    <div class="linha-visor" style="margin-top:14px">
      <button id="btn-desmontar-fallback">Ajustar montagem</button>
    </div>
  </div>
</section>

<!-- =================== TELA 3 — VEREDITO ================================ -->
<section id="tela-veredito" hidden>
  <div id="faixa-veredito">
    <h2 id="veredito-titulo"></h2>
    <p id="veredito-sub"></p>
  </div>
  <div id="corpo-veredito">
    <div id="cobertura"></div>
    <div id="lista-campos"></div>
  </div>
  <div id="rodape-veredito">
    <button id="btn-rearmar" class="perigo">REARMAR</button>
    <button id="btn-desmontar-veredito">Ajustar</button>
  </div>
</section>

<script>
(function () {
  'use strict';

  var API = '/api/v1';

  /* ======================================================================
   * DETECTOR DE PRESENÇA — parâmetros
   * ======================================================================
   * Tudo aqui é aritmética local sobre quadros do vídeo. Nenhuma requisição
   * sai daqui: o detector só decide QUANDO valeria a pena gastar uma foto.
   *
   * Como funciona: cada quadro é reduzido a uma miniatura de 64x36 num canvas
   * e virado num vetor de LUMINÂNCIA (0..255). Duas distâncias são medidas,
   * ambas como média da diferença absoluta pixel a pixel:
   *
   *   dVizinho = quadro atual  x  quadro anterior  -> "há movimento AGORA?"
   *   dBase    = quadro atual  x  quadro de fundo  -> "a cena MUDOU de estado?"
   *
   * As duas juntas descrevem o que um gate realmente vê: a esteira vazia é o
   * fundo; a peça chegando faz dBase subir; a peça PARADA na frente da câmera
   * faz dVizinho voltar a cair. É nesse instante que a foto presta.
   *
   * Os números abaixo são um ponto de partida calibrado na bancada, em
   * unidades de luminância 0..255 (3 de 255 é ~1,2% de variação média):
   *  - quieto (3)          - ruído de sensor de celular parado fica abaixo disso;
   *  - presenca (12)       - ~4,7%: uma peça entrando no quadro passa fácil,
   *                          sombra e mudança de luz de teto não passam;
   *  - quadrosEstaveis (8) - ~1 s de cena parada antes de fixar o fundo;
   *  - sustentadoMs (1000) - a mudança tem de PERSISTIR 1 s (pessoa passando na
   *                          frente e saindo não dispara);
   *  - esperaMaximaMs      - teto: se a cena mudou e não para de tremer, ainda
   *                          assim captura. Foto tremida vira nao_conferivel na
   *                          API; nunca vira falso OK — então "capturar de
   *                          qualquer jeito" é a falha segura, e "nunca
   *                          capturar" seria a insegura (gate cego).
   *
   * Ajustar na bancada é esperado: o medidor no rodapé do visor mostra dBase e
   * dVizinho ao vivo, com o limiar marcado.
   */
  var DETECTOR = {
    amostraL: 64,
    amostraA: 36,
    intervaloMs: 120,
    quieto: 3,
    quietoDisparo: 5,
    quadrosEstaveis: 8,
    presenca: 12,
    sustentadoMs: 1000,
    esperaMaximaMs: 2500
  };

  /* Custo do Textract (DetectDocumentText, US$ 0,0015 por página) e o TETO de
   * chamadas por foto — 3, fixo: a foto inteira + 2 recortes de corroboração do
   * relevo (CLAUDE.md, "Extração e bordas AWS"). Vista SEM marcação em relevo
   * custa 1 chamada; é por isso que a página consulta o plano antes de anunciar
   * o preço, em vez de chutar um número redondo. */
  var USD_POR_CHAMADA = 0.0015;
  var CHAMADAS_COM_RELEVO = 3;

  /* Cooldown entre armamentos: um freio de mão contra o dedo nervoso na
   * bancada (constraint 4 — créditos são finitos). */
  var COOLDOWN_MS = 5000;

  /* Vistas canônicas — usadas SÓ como escape quando o plano da API não veio.
   * A fonte de verdade é sempre o plano; esta lista existe para o aparelho não
   * ficar inutilizável se o projeto estiver indeterminado no banco. */
  var VISTAS_CANONICAS = ['base', 'topo', 'frente', 'traseira', 'lateral-esquerda',
    'lateral-direita', 'placa', 'etiqueta', 'geral'];

  var ETAPA_PADRAO = 'serigrafia';
  var VISTA_PADRAO = 'frente';

  var TEXTO_VEREDITO = {
    conforme: 'CONFORME',
    nao_conferivel: 'NÃO CONFERÍVEL',
    divergente: 'DIVERGENTE'
  };

  /* O que o operador do gate faz com cada veredito. Não é regra de negócio: é
   * a leitura em voz alta do que a API já decidiu. */
  var ACAO_VEREDITO = {
    conforme: 'A peça segue para a etapa seguinte.',
    divergente: 'A peça NÃO avança. Compare abaixo o que a etiqueta manda e o que está gravado.',
    nao_conferivel: 'A API leu, mas não afirma. Nada aqui é aprovação: chame o olho humano ou reenquadre e capture de novo.'
  };

  /* O motivo canônico da API, dito em português. Mesmo mapa da /esteira e da
   * /demo — rotulagem pura, a página não deriva nada do motivo. */
  var MOTIVOS = {
    'sem-valor-esperado': 'a etiqueta não traz valor para este campo',
    'sem-leitura': 'a visão não leu nada para este campo',
    'leituras-conflitantes': 'a mesma vista produziu leituras diferentes para este campo',
    'leitura-de-outro-campo': 'o valor lido casa com o valor esperado de OUTRO campo',
    'confianca-abaixo-do-limiar': 'a visão leu, mas com confiança abaixo do limiar',
    'leitura-nao-corroborada': 'marcação em relevo sem segunda leitura concordante — a API não acusa divergência com uma leitura só'
  };

  /* Código de erro da API -> o que fazer. Tradução, não substituição: a
   * mensagem crua continua aparecendo junto. */
  var EXPLICACOES = [
    ['foto-evidencia-de-outra-conferencia',
      'Esta foto já lastreia outra conferência (cada evidência pertence a UMA só). Rearme: a próxima captura sobe uma evidência nova.'],
    ['foto-evidencia-inexistente',
      'A API não achou a foto enviada (o banco pode ter sido reiniciado). Rearme para capturar de novo.'],
    ['etapa-desconhecida',
      'O código de etapa deste aparelho não existe como Checkpoint no banco. Ajuste a montagem e escolha o ponto na lista.'],
    ['etapa-sem-campos-conferiveis',
      'Nenhuma marcação da checklist existe na peça até esta etapa — não há o que conferir neste ponto da linha.'],
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
    // [{codigo, nome, ordem, vistas: [{fonteFisica, campos: [item]}]}]
    etapas: [],
    etapa: null,
    vista: null,
    fluxo: null,
    // 0 = desarmada, 1 = armada (detector rodando), 2 = capturando/enviando
    armada: 0,
    disparando: false,
    ultimoArmamento: 0,
    timerDetector: null,
    timerCooldown: null,
    anterior: null,
    fundo: null,
    detector: { fase: 'calibrando', estaveis: 0, desde: 0 },
    travaTela: null
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

  // --- Chamadas à API (mesmo espírito da /demo e da /esteira) --------------

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

  // === PREPARO: login e plano ==============================================

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
      aviso('login-aviso', 'Conectado. Buscando a linha e a checklist do modelo...', 'neutro');
      return carregarPlano();
    }).catch(function (erro) {
      aviso('login-aviso', 'Falha de rede: ' + erro.message, 'erro');
    }).then(function () {
      botao.disabled = false;
      atualizarMontar();
    });
  });

  // O recorte por etapa NÃO é calculado aqui: vem pronto do plano, com a
  // semântica cumulativa já aplicada no servidor. Chamada de leitura, sem
  // nenhum custo de visão.
  function carregarPlano() {
    return pedir(API + '/conferencias/plano-de-fotos').then(function (resposta) {
      if (!resposta.ok || !resposta.corpo) {
        aviso('login-aviso', 'Entrei, mas o plano de fotos falhou: ' +
          mensagemDeErro(resposta.corpo, resposta.status) +
          ' A câmera ainda funciona: escolha etapa e vista à mão.', 'atencao');
        estado.etapas = [];
        desenharEtapas();
        desenharVistas();
        return;
      }
      var plano = resposta.corpo;
      estado.plano = plano;
      estado.etapas = (plano.etapas || []).map(function (item) {
        var etapa = item.etapa || {};
        return {
          codigo: etapa.codigo,
          nome: etapa.nome || etapa.codigo,
          ordem: etapa.ordem,
          vistas: item.vistas || []
        };
      }).filter(function (item) { return !!item.codigo; });
      estado.etapas.sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });

      aviso('login-aviso', 'Linha carregada: ' + estado.etapas.length +
        ' etapa(s), projeto ' + ((plano.projeto || {}).codigo || 'sem código') + '.', 'ok');

      restaurarEtapa();
      desenharEtapas();
      desenharVistas();
    }).catch(function (erro) {
      aviso('login-aviso', 'Falha ao buscar o plano: ' + erro.message +
        ' A câmera ainda funciona: escolha etapa e vista à mão.', 'atencao');
      desenharEtapas();
      desenharVistas();
    });
  }

  // Cada aparelho abre a URL da SUA etapa (?etapa=serigrafia): é o que, em
  // produção, virá provisionado na câmera fixa. A URL VENCE o padrão.
  function etapaDaUrl() {
    var busca = window.location.search || '';
    var achado = /[?&]etapa=([^&]*)/.exec(busca);
    if (!achado) { return null; }
    var codigo = decodeURIComponent(achado[1].replace(/\\+/g, ' ')).trim();
    return codigo === '' ? null : codigo;
  }

  function vistaDaUrl() {
    var busca = window.location.search || '';
    var achado = /[?&]vista=([^&]*)/.exec(busca);
    if (!achado) { return null; }
    var vista = decodeURIComponent(achado[1].replace(/\\+/g, ' ')).trim();
    return vista === '' ? null : vista;
  }

  function restaurarEtapa() {
    var pedida = etapaDaUrl() || ETAPA_PADRAO;
    var existe = false;
    estado.etapas.forEach(function (item) { if (item.codigo === pedida) { existe = true; } });
    // Etapa pedida que não existe na linha não é silenciada: fica escolhida
    // assim mesmo, para a API responder 'etapa-desconhecida' e a página dizer
    // o porquê. Chutar outra etapa aqui trocaria o gate sem ninguém saber.
    estado.etapa = pedida;
    if (!existe && estado.etapas.length) {
      aviso('montar-aviso', 'A etapa "' + pedida + '" não está na linha carregada. ' +
        'Escolha um ponto na lista, ou siga assim e a API dirá o que houve.', 'atencao');
    }
    escolherVistaPadrao();
  }

  function etapaAtual() {
    var achada = null;
    estado.etapas.forEach(function (item) { if (item.codigo === estado.etapa) { achada = item; } });
    return achada;
  }

  function vistasDaEtapa() {
    var etapa = etapaAtual();
    if (!etapa) { return []; }
    return etapa.vistas.map(function (vista) { return vista.fonteFisica; });
  }

  function camposDaVista(fonte) {
    var etapa = etapaAtual();
    var achados = [];
    if (!etapa) { return achados; }
    etapa.vistas.forEach(function (vista) {
      if (vista.fonteFisica === fonte) { achados = vista.campos || []; }
    });
    return achados;
  }

  function escolherVistaPadrao() {
    var pedida = vistaDaUrl();
    var disponiveis = vistasDaEtapa();
    if (pedida) { estado.vista = pedida; return; }
    if (!disponiveis.length) { estado.vista = estado.vista || VISTA_PADRAO; return; }
    var temPadrao = disponiveis.indexOf(VISTA_PADRAO) !== -1;
    if (estado.vista && disponiveis.indexOf(estado.vista) !== -1) { return; }
    estado.vista = temPadrao ? VISTA_PADRAO : disponiveis[0];
  }

  function desenharEtapas() {
    var caixa = el('grade-etapas');
    if (!estado.etapas.length) {
      caixa.innerHTML = '';
      el('etapa-dica').innerHTML = 'Sem a lista da API, o ponto vem do ?etapa= da URL (agora: <b>' +
        esc(estado.etapa || ETAPA_PADRAO) + '</b>).';
      return;
    }
    caixa.innerHTML = estado.etapas.map(function (item) {
      var quantas = item.vistas.length;
      return '<button type="button" data-codigo="' + esc(item.codigo) + '" aria-pressed="' +
        (item.codigo === estado.etapa ? 'true' : 'false') + '">' +
        '<span class="titulo-escolha">' + esc(item.ordem) + ' · ' + esc(item.nome) + '</span>' +
        '<span class="sub-escolha">' + esc(item.codigo) + ' · ' + quantas +
        ' vista(s) neste gate</span></button>';
    }).join('');
    el('etapa-dica').innerHTML = 'Ponto atual: <b>' + esc(estado.etapa) +
      '</b>. Recorte CUMULATIVO — o gate reconfere o que as etapas anteriores gravaram.';
  }

  function desenharVistas() {
    var caixa = el('grade-vistas');
    var disponiveis = vistasDaEtapa();
    var lista = disponiveis.length ? disponiveis : VISTAS_CANONICAS;
    caixa.innerHTML = lista.map(function (fonte) {
      var campos = camposDaVista(fonte);
      var sub = campos.length
        ? campos.map(function (campo) { return campo.campo; }).join(', ')
        : 'a página não sabe os campos desta vista';
      return '<button type="button" data-vista="' + esc(fonte) + '" aria-pressed="' +
        (fonte === estado.vista ? 'true' : 'false') + '">' +
        '<span class="titulo-escolha">' + esc(fonte) + '</span>' +
        '<span class="sub-escolha">' + esc(sub) + '</span></button>';
    }).join('');

    if (disponiveis.length) {
      var outras = disponiveis.filter(function (fonte) { return fonte !== estado.vista; });
      el('vista-dica').innerHTML = 'Este aparelho é a câmera da vista <b>' + esc(estado.vista) +
        '</b>. ' + (outras.length
          ? 'As outras câmeras deste gate cobrem: ' + esc(outras.join(', ')) + '.'
          : 'Este gate tem uma vista só — este aparelho o cobre inteiro.');
    } else {
      el('vista-dica').innerHTML = 'Sem o plano da API, a lista é o vocabulário canônico de vistas. ' +
        'Escolha a que este aparelho enxerga.';
    }
    atualizarCusto();
    atualizarMontar();
  }

  el('grade-etapas').addEventListener('click', function (evento) {
    var alvo = evento.target;
    for (var salto = 0; alvo && salto < 4; salto += 1) {
      if (alvo.getAttribute && alvo.getAttribute('data-codigo') !== null) {
        estado.etapa = alvo.getAttribute('data-codigo');
        aviso('montar-aviso', '');
        estado.vista = null;
        escolherVistaPadrao();
        desenharEtapas();
        desenharVistas();
        return;
      }
      alvo = alvo.parentNode;
    }
  });

  el('grade-vistas').addEventListener('click', function (evento) {
    var alvo = evento.target;
    for (var salto = 0; alvo && salto < 4; salto += 1) {
      if (alvo.getAttribute && alvo.getAttribute('data-vista') !== null) {
        estado.vista = alvo.getAttribute('data-vista');
        desenharVistas();
        return;
      }
      alvo = alvo.parentNode;
    }
  });

  // --- Custo: anunciado ANTES de gastar (constraint 4) ---------------------

  // Vista que carrega marcação em RELEVO custa até 3 chamadas (a foto inteira +
  // 2 recortes de corroboração); sem relevo, 1. Quem diz se há relevo é o plano
  // (tipoMarcacao), não uma lista de vistas na página. Sem plano, assume o TETO
  // — errar para mais no anúncio de custo é a falha segura.
  function chamadasDaCaptura() {
    var campos = camposDaVista(estado.vista);
    if (!campos.length) { return CHAMADAS_COM_RELEVO; }
    var temRelevo = false;
    campos.forEach(function (campo) { if (campo.tipoMarcacao === 'relevo') { temRelevo = true; } });
    return temRelevo ? CHAMADAS_COM_RELEVO : 1;
  }

  function dolar(valor) {
    return 'US$ ' + valor.toFixed(4).replace('.', ',');
  }

  function textoDoCusto() {
    var chamadas = chamadasDaCaptura();
    var campos = camposDaVista(estado.vista);
    var comRelevo = chamadas > 1;
    return 'teto de ' + chamadas + ' chamada(s) Textract · ~' + dolar(chamadas * USD_POR_CHAMADA) +
      (campos.length
        ? (comRelevo
          ? ' (esta vista tem marcação em relevo: a API relê 2 recortes para confirmar)'
          : ' (vista sem relevo: uma leitura basta)')
        : ' (sem o plano, assumo o teto)');
  }

  function atualizarCusto() {
    el('custo-armar').textContent = textoDoCusto();
  }

  function atualizarMontar() {
    var pronto = !!estado.token && !!estado.etapa && !!estado.vista &&
      !!el('payload').value.trim();
    el('btn-montar').disabled = !pronto;
    el('btn-montar').textContent = pronto
      ? 'MONTAR A CÂMERA — ' + estado.etapa + ' · vista ' + estado.vista
      : 'MONTAR A CÂMERA NESTE PONTO';
  }

  el('payload').addEventListener('input', atualizarMontar);

  // === Navegação entre telas ==============================================

  function mostrar(tela) {
    el('tela-preparo').hidden = tela !== 'preparo';
    el('tela-visor').hidden = tela !== 'visor';
    el('tela-veredito').hidden = tela !== 'veredito';
    if (window.scrollTo) { window.scrollTo(0, 0); }
  }

  el('btn-montar').addEventListener('click', function () {
    mostrar('visor');
    el('rotulo-ponto').textContent = estado.etapa + ' · vista ' + estado.vista;
    atualizarCusto();
    abrirCamera();
    manterTelaAcesa();
  });

  function desmontar() {
    desarmar('câmera desmontada');
    fecharCamera();
    soltarTela();
    mostrar('preparo');
    atualizarMontar();
  }

  el('btn-desmontar-visor').addEventListener('click', desmontar);
  el('btn-desmontar-fallback').addEventListener('click', desmontar);
  el('btn-desmontar-veredito').addEventListener('click', desmontar);

  // Celular montado num tripé apaga a tela e o vídeo morre junto. Wake Lock é
  // opcional em toda parte: se não existir, a página segue igual.
  function manterTelaAcesa() {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (trava) {
          estado.travaTela = trava;
        }, function () { /* negado: sem drama, é conforto e não requisito */ });
      }
    } catch (erro) { /* idem */ }
  }

  function soltarTela() {
    if (estado.travaTela && estado.travaTela.release) {
      try { estado.travaTela.release(); } catch (erro) { /* idem */ }
    }
    estado.travaTela = null;
  }

  // === Câmera ==============================================================

  function semCamera(motivo) {
    el('sem-camera').hidden = false;
    el('sem-camera-motivo').textContent = motivo;
  }

  function abrirCamera() {
    el('sem-camera').hidden = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      semCamera('Este navegador não expõe getUserMedia. Quase sempre é a origem: ' +
        'a câmera do navegador só abre em HTTPS (ou em localhost). Abra a página pela URL segura do servidor.');
      return;
    }
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    }).then(function (fluxo) {
      estado.fluxo = fluxo;
      var video = el('video');
      video.srcObject = fluxo;
      return video.play();
    }).then(function () {
      atualizarEstadoVisor('câmera montada — arme quando a peça começar a chegar');
    }).catch(function (erro) {
      fecharCamera();
      semCamera('Não foi possível abrir a câmera: ' + (erro && erro.message ? erro.message : erro) +
        '. Se a permissão foi negada, libere a câmera para este site nas configurações do navegador e recarregue.');
    });
  }

  function fecharCamera() {
    if (estado.fluxo) {
      estado.fluxo.getTracks().forEach(function (trilha) { trilha.stop(); });
      estado.fluxo = null;
    }
    el('video').srcObject = null;
  }

  // === DETECTOR — matemática pura, testável, sem DOM e sem rede ============

  // Miniatura do quadro virada em vetor de luminância (0..255), um valor por
  // pixel da amostra. Perceptual o bastante e barato: é aritmética inteira
  // sobre 64x36 = 2304 pixels, ~30 vezes por segundo no pior caso.
  function luminancias(dados) {
    var saida = new Array(dados.length / 4);
    for (var i = 0, p = 0; i < dados.length; i += 4, p += 1) {
      saida[p] = (dados[i] * 299 + dados[i + 1] * 587 + dados[i + 2] * 114) / 1000;
    }
    return saida;
  }

  // Média da diferença absoluta entre dois vetores de luminância. É a única
  // "medida" do detector: 0 = quadros idênticos, 255 = preto contra branco.
  function distanciaMedia(a, b) {
    if (!a || !b || !a.length || a.length !== b.length) { return 0; }
    var soma = 0;
    for (var i = 0; i < a.length; i += 1) {
      soma += a[i] > b[i] ? a[i] - b[i] : b[i] - a[i];
    }
    return soma / a.length;
  }

  // Máquina de estados do detector. PURA de propósito: recebe as duas
  // distâncias já medidas e o relógio, devolve o PRÓXIMO estado e a ação. Sem
  // DOM, sem vídeo, sem rede — é o que permite testá-la com frames sintéticos.
  //
  // fases: calibrando -> vigiando -> entrando -> disparado
  // ações: 'nada' | 'fundo' (fixe o quadro atual como fundo) | 'desistiu' |
  //        'disparar'
  function decidirDetector(atual, dBase, dVizinho, agora) {
    var proximo = { fase: atual.fase, estaveis: atual.estaveis, desde: atual.desde, acao: 'nada' };

    if (atual.fase === 'calibrando') {
      proximo.estaveis = dVizinho < DETECTOR.quieto ? atual.estaveis + 1 : 0;
      if (proximo.estaveis >= DETECTOR.quadrosEstaveis) {
        proximo.fase = 'vigiando';
        proximo.estaveis = 0;
        proximo.acao = 'fundo';
      }
      return proximo;
    }

    if (atual.fase === 'vigiando') {
      if (dBase >= DETECTOR.presenca) {
        proximo.fase = 'entrando';
        proximo.desde = agora;
      }
      return proximo;
    }

    if (atual.fase === 'entrando') {
      // A mudança sumiu antes de completar o tempo: era sombra, reflexo ou
      // alguém passando. Volta a vigiar sem gastar nada.
      if (dBase < DETECTOR.presenca) {
        proximo.fase = 'vigiando';
        proximo.desde = 0;
        proximo.acao = 'desistiu';
        return proximo;
      }
      var faz = agora - atual.desde;
      if (faz < DETECTOR.sustentadoMs) { return proximo; }
      // Sustentou: agora espera a cena ASSENTAR (peça parada dá foto nítida).
      // O teto evita gate cego numa bancada que nunca para de tremer.
      if (dVizinho < DETECTOR.quietoDisparo || faz >= DETECTOR.esperaMaximaMs) {
        proximo.fase = 'disparado';
        proximo.acao = 'disparar';
      }
      return proximo;
    }

    return proximo;
  }

  // --- O laço do detector (a parte suja: canvas, DOM, relógio) -------------

  var amostra = document.createElement('canvas');
  amostra.width = DETECTOR.amostraL;
  amostra.height = DETECTOR.amostraA;
  var ctxAmostra = amostra.getContext('2d');

  var captura = document.createElement('canvas');
  var ctxCaptura = captura.getContext('2d');

  function lerQuadro() {
    var video = el('video');
    if (!video.videoWidth) { return null; }
    ctxAmostra.drawImage(video, 0, 0, DETECTOR.amostraL, DETECTOR.amostraA);
    return luminancias(ctxAmostra.getImageData(0, 0, DETECTOR.amostraL, DETECTOR.amostraA).data);
  }

  function atualizarEstadoVisor(texto) {
    el('rotulo-estado').textContent = estado.armada === 1 ? 'ARMADA' :
      (estado.armada === 2 ? 'CAPTURANDO' : 'DESARMADA');
    document.body.setAttribute('data-armada', String(estado.armada));
    if (texto) { el('medidor-texto').textContent = texto; }
  }

  function desenharMedidor(dBase, dVizinho) {
    // A escala do medidor é 3x o limiar: passa dele e a barra fica na metade.
    var escala = DETECTOR.presenca * 3;
    var largura = Math.max(0, Math.min(100, (dBase / escala) * 100));
    el('medidor-barra').style.width = largura + '%';
    el('medidor-barra').style.background = dBase >= DETECTOR.presenca ? 'var(--ambar)' : 'var(--acento)';
    el('medidor-limiar').style.left = ((DETECTOR.presenca / escala) * 100) + '%';
    el('medidor-texto').textContent = textoDaFase() +
      ' · mudança ' + dBase.toFixed(1) + ' (limiar ' + DETECTOR.presenca +
      ') · movimento ' + dVizinho.toFixed(1);
  }

  function textoDaFase() {
    var fase = estado.detector.fase;
    if (fase === 'calibrando') { return 'aprendendo a cena vazia — deixe o quadro parado'; }
    if (fase === 'vigiando') { return 'vigiando: nada na frente da câmera'; }
    if (fase === 'entrando') { return 'algo entrou no quadro — confirmando'; }
    return 'disparado';
  }

  function passoDoDetector() {
    if (estado.armada !== 1 || estado.disparando) { return; }
    var atual = lerQuadro();
    if (!atual) { return; }

    var dVizinho = distanciaMedia(atual, estado.anterior);
    var dBase = estado.fundo ? distanciaMedia(atual, estado.fundo) : 0;
    estado.anterior = atual;

    var decidido = decidirDetector(estado.detector, dBase, dVizinho, Date.now());
    estado.detector = { fase: decidido.fase, estaveis: decidido.estaveis, desde: decidido.desde };

    if (decidido.acao === 'fundo') { estado.fundo = atual; }
    desenharMedidor(dBase, dVizinho);

    if (decidido.acao === 'disparar') { dispararCaptura('detector'); }
  }

  // === Armar / desarmar ====================================================

  function podeArmar() {
    return Math.max(0, COOLDOWN_MS - (Date.now() - estado.ultimoArmamento));
  }

  function armar() {
    if (estado.armada !== 0 || estado.disparando) { return; }
    if (!estado.fluxo) {
      aviso('fallback-aviso', 'Sem vídeo ao vivo não há detector — use o botão de fotografar.', 'atencao');
      return;
    }
    if (podeArmar() > 0) { return; }
    estado.ultimoArmamento = Date.now();
    estado.armada = 1;
    estado.detector = { fase: 'calibrando', estaveis: 0, desde: 0 };
    estado.anterior = null;
    estado.fundo = null;
    atualizarEstadoVisor('aprendendo a cena vazia — deixe o quadro parado');
    atualizarBotaoArmar();
    if (estado.timerDetector) { window.clearInterval(estado.timerDetector); }
    estado.timerDetector = window.setInterval(passoDoDetector, DETECTOR.intervaloMs);
  }

  function desarmar(motivo) {
    estado.armada = 0;
    if (estado.timerDetector) { window.clearInterval(estado.timerDetector); estado.timerDetector = null; }
    el('medidor-barra').style.width = '0';
    atualizarEstadoVisor(motivo || 'detector parado — a câmera está desarmada');
    atualizarBotaoArmar();
  }

  function atualizarBotaoArmar() {
    var botao = el('btn-armar');
    var falta = podeArmar();
    if (estado.armada === 2) {
      botao.disabled = true;
      botao.firstChild.nodeValue = 'CAPTURANDO...';
      return;
    }
    if (estado.armada === 1) {
      botao.disabled = false;
      botao.firstChild.nodeValue = 'DESARMAR';
      return;
    }
    botao.disabled = falta > 0;
    botao.firstChild.nodeValue = falta > 0
      ? 'AGUARDE ' + Math.ceil(falta / 1000) + 's'
      : 'ARMAR CÂMERA';
  }

  el('btn-armar').addEventListener('click', function () {
    if (estado.armada === 1) { desarmar('desarmada por você'); return; }
    armar();
  });

  // Escape honesto do gate: dá para capturar sem esperar o detector. Continua
  // sendo UMA captura e UMA conferência, e o mesmo cooldown vale.
  el('btn-capturar-manual').addEventListener('click', function () {
    if (estado.disparando) { return; }
    var falta = podeArmar();
    if (falta > 0) {
      el('medidor-texto').textContent = 'cooldown: aguarde ' + Math.ceil(falta / 1000) +
        's — uma captura é uma conferência paga';
      return;
    }
    estado.ultimoArmamento = Date.now();
    dispararCaptura('manual');
  });

  // Cooldown visível: um só timer, sempre ligado, sem custo nenhum.
  estado.timerCooldown = window.setInterval(function () {
    if (!el('tela-visor').hidden) { atualizarBotaoArmar(); }
    if (!el('tela-veredito').hidden) { atualizarBotaoRearmar(); }
  }, 500);

  // === DISPARO — o único ponto da página que toca a rede ==================

  function dataUrlParaBlob(dataUrl) {
    var partes = dataUrl.split(',');
    var binario = window.atob(partes[1]);
    var bytes = new Uint8Array(binario.length);
    for (var i = 0; i < binario.length; i += 1) { bytes[i] = binario.charCodeAt(i); }
    return new Blob([bytes], { type: 'image/jpeg' });
  }

  function congelarQuadro() {
    return new Promise(function (pronto, falhou) {
      var video = el('video');
      if (!video.videoWidth) { falhou(new Error('o vídeo ainda não tem quadro para congelar')); return; }
      captura.width = video.videoWidth;
      captura.height = video.videoHeight;
      ctxCaptura.drawImage(video, 0, 0, captura.width, captura.height);
      if (captura.toBlob) {
        captura.toBlob(function (blob) {
          if (blob) { pronto(blob); } else { falhou(new Error('não consegui codificar o quadro')); }
        }, 'image/jpeg', 0.92);
        return;
      }
      try { pronto(dataUrlParaBlob(captura.toDataURL('image/jpeg', 0.92))); }
      catch (erro) { falhou(erro); }
    });
  }

  function piscarFlash() {
    var flash = el('flash');
    flash.classList.remove('disparou');
    // Reflow: sem isto a animação não reinicia no segundo disparo.
    void flash.offsetWidth;
    flash.classList.add('disparou');
  }

  // UMA captura -> UM upload -> UMA conferência. A guarda estado.disparando é o
  // que impede dois quadros seguidos de virarem duas conferências pagas.
  function dispararCaptura(origem) {
    if (estado.disparando) { return; }
    estado.disparando = true;
    estado.armada = 2;
    if (estado.timerDetector) { window.clearInterval(estado.timerDetector); estado.timerDetector = null; }
    atualizarEstadoVisor('peça detectada — congelando o quadro');
    atualizarBotaoArmar();
    piscarFlash();

    congelarQuadro()
      .then(function (blob) {
        atualizarEstadoVisor('enviando a foto...');
        return enviarFoto(blob);
      })
      .then(function (fotoId) {
        atualizarEstadoVisor('conferindo na API...');
        return conferir(fotoId);
      })
      .then(function (resposta) {
        mostrarVeredito(resposta, origem);
      })
      .catch(function (erro) {
        mostrarErro(erro);
      })
      .then(function () {
        // Sempre: um armamento = um disparo. A câmera não se rearma sozinha.
        estado.disparando = false;
        desarmar('capturada — rearme para a próxima peça');
      });
  }

  function enviarFoto(blob) {
    var dados = new FormData();
    var nome = 'gate-' + estado.vista + '-' + Date.now() + '.jpg';
    dados.append('file', blob, nome);
    dados.append('fonteFisica', estado.vista);
    return pedir(API + '/fotos-evidencia/upload', { method: 'POST', body: dados })
      .then(function (resposta) {
        if (!resposta.ok || !resposta.corpo || !resposta.corpo.id) {
          throw new Error(mensagemDeErro(resposta.corpo, resposta.status));
        }
        return resposta.corpo.id;
      });
  }

  function conferir(fotoId) {
    return exigir('/conferencias/executar-com-fotos', {
      payloadQr: el('payload').value.trim(),
      etapaCodigo: estado.etapa,
      fotoEvidenciaIds: [fotoId]
    });
  }

  // Fallback sem vídeo: o humano é o gatilho. Mesmo pipeline, mesma guarda.
  el('arquivo-fallback').addEventListener('change', function (evento) {
    var arquivo = evento.target.files && evento.target.files[0];
    if (!arquivo || estado.disparando) { return; }
    estado.disparando = true;
    estado.ultimoArmamento = Date.now();
    aviso('fallback-aviso', 'Enviando a foto e conferindo...', 'neutro');
    enviarFoto(arquivo)
      .then(conferir)
      .then(function (resposta) {
        aviso('fallback-aviso', '');
        mostrarVeredito(resposta, 'manual');
      })
      .catch(function (erro) {
        aviso('fallback-aviso', erro.message, 'erro');
        mostrarErro(erro);
      })
      .then(function () {
        estado.disparando = false;
        evento.target.value = '';
      });
  });

  // === VEREDITO ============================================================

  function nomeLegivel(campo) {
    var texto = String(campo || '').replace(/-/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function motivoLegivel(motivo) {
    if (!motivo) { return ''; }
    return MOTIVOS[motivo] ? MOTIVOS[motivo] + ' (' + motivo + ')' : motivo;
  }

  function formatarPercentual(valor) {
    if (valor === null || valor === undefined) { return 'sem confiança'; }
    return (Number(valor) * 100).toFixed(1).replace('.', ',') + '%';
  }

  // Ordem de exibição: quem impede o conforme aparece primeiro. É reordenação
  // de tela, não juízo — o veredito de cada campo é o que a API mandou.
  var PESO = { divergente: 0, nao_conferivel: 1, conforme: 2 };

  function cartaoDoCampo(campo) {
    var linha;
    if (campo.veredito === 'divergente') {
      linha = '<span class="par">esperado <b class="esperado">' + esc(campo.valorEsperado) +
        '</b> · lido <b class="lido">' + esc(campo.valorLido) + '</b></span>';
    } else if (campo.valorLido === null || campo.valorLido === undefined || campo.valorLido === '') {
      linha = '<span class="par"><i class="ausente">sem leitura nesta captura</i></span>';
    } else {
      linha = '<span class="par">lido <b>' + esc(campo.valorLido) + '</b> · ' +
        esc(formatarPercentual(campo.confianca)) + '</span>';
    }

    var evidencia = '';
    if (campo.fotoEvidencia && campo.fotoEvidencia.url) {
      evidencia = '<img class="evidencia" src="' + esc(campo.fotoEvidencia.url) +
        '" alt="Foto-evidência da vista ' + esc(campo.fonteFisica) + '" loading="lazy">';
    }

    return '<div class="campo v-' + esc(campo.veredito) + '">' +
      '<div class="cabeca"><span class="nome">' + esc(nomeLegivel(campo.campo)) + '</span>' +
      '<span class="selo">' + esc(TEXTO_VEREDITO[campo.veredito] || campo.veredito) + '</span></div>' +
      '<span class="canonico">' + esc(campo.campo) + ' · vista ' + esc(campo.fonteFisica) +
      (campo.obrigatorio ? ' · obrigatório' : ' · opcional') + '</span>' +
      linha +
      (campo.motivo ? '<span class="porque">' + esc(motivoLegivel(campo.motivo)) + '</span>' : '') +
      evidencia +
      '</div>';
  }

  // A frase mais importante da tela: esta câmera vê UM lado. O que ela não vê
  // sai âmbar, e isso é o desenho do gate, não uma falha da peça.
  function textoDaCobertura(resposta) {
    // O que este aparelho cobre é a vista dele — não "as vistas que tiveram
    // leitura". A distinção importa: campo da PRÓPRIA vista que saiu sem
    // leitura é problema de foto (reenquadre), e não falta de câmera.
    var faltantes = {};
    (resposta.campos || []).forEach(function (campo) {
      if (campo.fonteFisica !== estado.vista) { faltantes[campo.fonteFisica] = true; }
    });
    var lista = Object.keys(faltantes);
    var base = 'Esta câmera cobre a vista <b>' + esc(estado.vista) + '</b>' +
      (resposta.etapaAvaliada ? ' no gate <b>' + esc(resposta.etapaAvaliada.nome) + '</b>' : '') + '. ';
    if (!lista.length) {
      return base + 'Todos os campos deste recorte saem desta vista — este aparelho cobre o gate inteiro.';
    }
    return base + 'Os demais campos do gate são das <b>outras câmeras</b> (' + esc(lista.join(', ')) +
      '): sem foto delas, a API não tem o que ler e devolve <b>sem-leitura</b>. ' +
      'Cada gate cobra a interseção entre o recorte da etapa e as vistas que suas câmeras enxergam.';
  }

  function mostrarVeredito(resposta, origem) {
    var veredito = resposta.conferencia ? resposta.conferencia.vereditoGeral : null;
    var tela = el('tela-veredito');
    tela.setAttribute('data-veredito', veredito || 'erro');
    el('veredito-titulo').textContent = TEXTO_VEREDITO[veredito] || 'SEM VEREDITO';

    var campos = resposta.campos || [];
    var quantos = campos.filter(function (campo) { return campo.veredito === veredito; }).length;
    el('veredito-sub').textContent = (ACAO_VEREDITO[veredito] || '') + ' ' +
      quantos + ' de ' + campos.length + ' campo(s) neste veredito · disparo ' +
      (origem === 'detector' ? 'automático pelo detector' : 'manual') +
      ' · ' + ((resposta.extracao || {}).driver || 'visão') +
      ' leu ' + ((resposta.extracao || {}).leiturasProduzidas || 0) + ' valor(es).';

    el('cobertura').innerHTML = textoDaCobertura(resposta);

    var ordenados = campos.slice().sort(function (a, b) {
      var pa = PESO[a.veredito]; var pb = PESO[b.veredito];
      return (pa === undefined ? 3 : pa) - (pb === undefined ? 3 : pb);
    });
    el('lista-campos').innerHTML = ordenados.map(cartaoDoCampo).join('') ||
      '<div class="campo">A API não devolveu campo algum para este recorte.</div>';

    atualizarBotaoRearmar();
    mostrar('veredito');
  }

  function mostrarErro(erro) {
    var tela = el('tela-veredito');
    tela.setAttribute('data-veredito', 'erro');
    el('veredito-titulo').textContent = 'CAPTURA NÃO CONFERIDA';
    el('veredito-sub').textContent = 'A câmera voltou a DESARMADA e nada foi aprovado — ' +
      'falha de chamada nunca vira veredito.';
    el('cobertura').textContent = erro && erro.message ? erro.message : String(erro);
    el('lista-campos').innerHTML = '';
    atualizarBotaoRearmar();
    mostrar('veredito');
  }

  function atualizarBotaoRearmar() {
    var botao = el('btn-rearmar');
    var falta = podeArmar();
    botao.disabled = falta > 0;
    botao.textContent = falta > 0
      ? 'REARMAR EM ' + Math.ceil(falta / 1000) + 's'
      : 'REARMAR — ' + textoDoCusto();
  }

  // Rearmar é UMA decisão humana que vale UM armamento: volta ao visor e arma.
  el('btn-rearmar').addEventListener('click', function () {
    if (podeArmar() > 0) { return; }
    mostrar('visor');
    if (!estado.fluxo) { abrirCamera(); return; }
    // Alguns navegadores pausam o <video> enquanto ele fica display:none (a
    // tela do veredito): sem este play() o detector calibraria sobre um quadro
    // congelado e nunca mais dispararia.
    var tocando = el('video').play();
    if (tocando && tocando.then) { tocando.then(armar, armar); return; }
    armar();
  });

  // === Partida =============================================================

  // A etapa da URL já aparece no preparo ANTES do login: quem abriu a URL da
  // câmera tem de ver, na hora, qual ponto da linha este aparelho é. O login só
  // troca a lista digitada por lista de verdade.
  estado.etapa = etapaDaUrl() || ETAPA_PADRAO;
  estado.vista = vistaDaUrl() || VISTA_PADRAO;
  desenharEtapas();
  desenharVistas();
  atualizarMontar();
})();
</script>
</body>
</html>`;
