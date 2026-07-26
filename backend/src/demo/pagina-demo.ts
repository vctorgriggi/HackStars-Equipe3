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
 * O recorte "quais fontes esta etapa confere" NÃO é constante desta página:
 * sai da checklist do ProjetoModelo (campo 'etapa' por item) cruzada com a
 * 'ordem' dos Checkpoints, ambas buscadas na API depois do login. Sem esses
 * dados a página mostra todas as fontes sem destaque — nunca bloqueia.
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
  section h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 10px;
    font-size: 15px;
    letter-spacing: .02em;
    color: var(--tinta);
  }
  section h2 .num {
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
  .resumo-passo {
    display: flex; align-items: center; gap: 10px; justify-content: space-between;
    padding: 10px 12px; border-radius: 4px; font-size: 14px;
    background: var(--verde-fundo); border: 1px solid var(--verde); color: var(--verde);
  }
  .resumo-passo[hidden] { display: none; }
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
  .grade-etapas button { min-height: 62px; line-height: 1.2; }
  .grade-etapas button[aria-pressed="true"] {
    background: var(--acento);
    border-color: var(--acento);
    color: #fff;
    box-shadow: inset 0 0 0 2px #fff, 0 0 0 2px var(--acento);
  }
  .aviso { font-size: 14px; padding: 10px 12px; border-radius: 4px; margin-top: 10px; }
  .aviso.erro { background: var(--vermelho-fundo); color: var(--vermelho); border: 1px solid var(--vermelho); }
  .aviso.ok { background: var(--verde-fundo); color: var(--verde); border: 1px solid var(--verde); }
  .aviso.neutro { background: #eef1f4; color: var(--tinta-fraca); border: 1px solid var(--borda); }
  .aviso[hidden] { display: none; }
  .item-foto {
    display: flex;
    align-items: center;
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
  .item-foto .nome { flex: 1 1 auto; font-size: 15px; font-family: ui-monospace, Menlo, Consolas, monospace; }
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
  .botao-foto.grande { min-height: 60px; min-width: 150px; font-size: 16px; font-weight: 600; }
  .botao-foto.desativado { opacity: .5; cursor: default; font-weight: 400; }
  .miniatura {
    width: 46px; height: 46px; object-fit: cover;
    border: 1px solid var(--borda); border-radius: 4px; background: #e6e9ec;
  }
  .item-foto.grupo { display: block; }
  .cabeca-grupo { display: flex; align-items: center; gap: 10px; }
  .item-foto.grupo .dica, .item-foto.grupo .contexto { margin-top: 8px; }
  .item-foto.grupo .contexto { margin-bottom: 0; font-size: 12px; }
  .tiras { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .tira {
    width: 104px; padding: 6px; text-align: center;
    border: 1px solid var(--borda); border-radius: 4px; background: #fff;
  }
  .tira img {
    display: block; width: 90px; height: 68px; object-fit: cover;
    border-radius: 3px; background: #e6e9ec;
  }
  .tira .rotulo { display: block; font-size: 12px; color: var(--tinta-fraca); margin: 5px 0; }
  .tira button {
    width: 100%; min-height: 44px; padding: 6px; font-size: 13px;
    background: #fff; color: var(--vermelho); border-color: var(--vermelho);
  }
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
  .v-divergente { background: var(--vermelho-fundo); border-color: var(--vermelho); color: var(--vermelho); }
  .v-nao_conferivel { background: var(--ambar-fundo); border-color: var(--ambar); color: var(--ambar); }
  .v-conforme { background: var(--verde-fundo); border-color: var(--verde); color: var(--verde); }
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
  <p>Demonstração guiada: siga os passos 0 a 5. Cada passo diz o que a linha fará sozinha em produção.</p>
</header>
<main>

  <section id="sec-login">
    <h2><span class="num">0</span> Entrar</h2>
    <div id="login-corpo">
      <label class="rotulo" for="email">E-mail</label>
      <input type="email" id="email" value="admin@example.com" autocomplete="username" autocapitalize="none" spellcheck="false">
      <label class="rotulo" for="senha">Senha</label>
      <input type="password" id="senha" value="secret" autocomplete="current-password">
      <div class="linha-botoes" style="margin-top:12px">
        <button id="btn-login" class="largo">Entrar</button>
      </div>
    </div>
    <div id="login-resumo" class="resumo-passo" hidden>
      <span id="login-quem">Conectado.</span>
      <button id="btn-trocar-login" class="secundario compacto">Trocar</button>
    </div>
    <div id="login-aviso" class="aviso neutro" hidden></div>
  </section>

  <section id="sec-etapa" data-bloqueado="1">
    <h2><span class="num">1</span> Etapa da linha</h2>
    <p class="contexto">Em produção cada câmera fixa nasce amarrada a uma etapa; aqui você escolhe qual câmera está simulando.</p>
    <div class="grade-etapas" id="grade-etapas">
      <button class="secundario etapa" data-codigo="adesivacao" aria-pressed="false">Adesivação</button>
      <button class="secundario etapa" data-codigo="serigrafia" aria-pressed="false">Serigrafia</button>
      <button class="secundario etapa" data-codigo="oleo-conferencia" aria-pressed="false">Óleo e conferência</button>
      <button class="secundario etapa" data-codigo="fixacao-placa" aria-pressed="false">Fixação da placa</button>
    </div>
    <p class="dica" id="etapa-dica">Nenhuma etapa escolhida — a conferência será registrada sem etapa.</p>
  </section>

  <section id="sec-qr" data-bloqueado="1">
    <h2><span class="num">2</span> Escanear a etiqueta da peça</h2>
    <p class="contexto">Em produção a câmera lê o QR sozinha quando a peça chega; a etiqueta é a fonte da verdade — o sistema nunca inventa valor esperado.</p>
    <div class="linha-botoes">
      <button id="btn-camera" class="principal alternativa largo">Ler QR com a câmera</button>
    </div>
    <div id="qr-aviso" class="aviso neutro" hidden></div>
    <div id="camera-area" hidden>
      <video id="video" playsinline muted></video>
      <div class="linha-botoes" style="margin-top:8px">
        <button id="btn-parar-camera" class="secundario">Parar câmera</button>
      </div>
    </div>
    <label class="rotulo" for="payload">Conteúdo da etiqueta (o que a API vai interpretar)</label>
    <textarea id="payload" spellcheck="false" autocapitalize="none">Pedido: 68202\nNúm. Série: 847233\nSeq: 86\nPatrimônio: 251328\nCliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A\nTPD-408136</textarea>
    <div id="qr-bruto" class="bloco-bruto" hidden>
      <p class="titulo-bruto">Conteúdo bruto lido do QR (texto exato da etiqueta)</p>
      <pre id="qr-bruto-texto"></pre>
      <div class="linha-botoes" style="margin-top:8px">
        <button id="btn-copiar-qr" class="secundario">Copiar</button>
      </div>
    </div>
    <p class="dica">Se a API responder que o formato não é reconhecido, ou que o QR traz só um código de lookup (HTTP 422), <b>copie o conteúdo bruto e mande para o time</b>: o formato do QR da TRAEL ainda está sendo fechado. Não é defeito da peça nem erro seu.</p>
  </section>

  <section id="sec-fotos" data-bloqueado="1">
    <h2><span class="num">3</span> Fotografar a peça</h2>
    <p class="contexto">Em produção a câmera captura sozinha as vistas ao detectar a peça.</p>
    <p class="dica" id="fotos-recorte">Escolha uma etapa no passo 1 para ver quais vistas ela confere.</p>
    <div id="lista-fotos"></div>
    <div id="fotos-aviso" class="aviso neutro" hidden></div>
  </section>

  <section id="sec-conferir" data-bloqueado="1">
    <h2><span class="num">4</span> Extrair e conferir</h2>
    <p class="contexto">Em produção dispara automático na passagem da peça; aqui é um toque porque cada chamada de visão consome crédito AWS (nada roda em loop).</p>
    <div class="linha-botoes">
      <button id="btn-extrair" class="principal largo" disabled>EXTRAIR COM TEXTRACT</button>
    </div>
    <p class="dica" id="extrair-dica">Envie ao menos uma foto no passo 3 para liberar a extração.</p>
    <div id="conferir-aviso" class="aviso neutro" hidden></div>
  </section>

  <section id="sec-veredito" data-bloqueado="1">
    <h2><span class="num">5</span> Veredito</h2>
    <p class="contexto">Esta resposta é exatamente o que a tela final do app vai renderizar — o veredito nasce na API, nunca no navegador.</p>
    <p class="dica" id="veredito-vazio">Ainda sem veredito: conclua o passo 4.</p>
    <div id="resultado"></div>
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

  var FONTES = ['placa', 'serigrafia', 'chumbado-1', 'chumbado-2', 'chumbado-3', 'geral'];

  var CAMPOS = [
    { campo: 'serie-chumbada-1', fonte: 'chumbado-1' },
    { campo: 'serie-chumbada-2', fonte: 'chumbado-2' },
    { campo: 'serie-chumbada-3', fonte: 'chumbado-3' },
    { campo: 'serie-placa', fonte: 'placa' },
    { campo: 'patrimonio-placa', fonte: 'placa' },
    { campo: 'patrimonio-serigrafia', fonte: 'serigrafia' },
    { campo: 'cliente-serigrafia', fonte: 'serigrafia' }
  ];

  var CLIENTE = '143091 - Energisa Rondônia Distribuidora de Energia S.A';

  var PRESET_DEMO = {
    'serie-chumbada-1': ['847233', 0.993],
    'serie-chumbada-2': ['847233', 0.921],
    'serie-chumbada-3': ['847233', 0.967],
    'serie-placa': ['847833', 0.999],
    'patrimonio-placa': ['251328', 0.98],
    'patrimonio-serigrafia': ['251328', 1],
    'cliente-serigrafia': [CLIENTE, 0.972]
  };

  var PRESET_CORRETA = Object.assign({}, PRESET_DEMO, {
    'serie-placa': ['847233', 0.995]
  });

  var PRESET_RUIM = Object.assign({}, PRESET_DEMO, {
    'serie-chumbada-1': ['347233', 0.354]
  });

  // FALLBACK do modo avançado: usado só enquanto a checklist do ProjetoModelo
  // não chegou da API. O recorte de verdade é derivado dos dados (ver
  // carregarRecorte/camposDaEtapa) — esta tabela é a última escolha, nunca a
  // primeira.
  var CAMPOS_POR_ETAPA = {
    'adesivacao': ['serie-chumbada-1', 'serie-chumbada-2', 'serie-chumbada-3'],
    'serigrafia': ['serie-chumbada-1', 'serie-chumbada-2', 'serie-chumbada-3', 'patrimonio-serigrafia', 'cliente-serigrafia'],
    'oleo-conferencia': ['serie-chumbada-1', 'serie-chumbada-2', 'serie-chumbada-3'],
    'fixacao-placa': CAMPOS.map(function (item) { return item.campo; })
  };

  var TEXTO_VEREDITO = {
    divergente: ['DIVERGENTE — peça não pode seguir', 'Corrija a peça antes de liberar a etapa seguinte.'],
    nao_conferivel: ['NÃO CONFERÍVEL — exige conferência humana', 'Algum campo ficou ilegível ou abaixo do limiar de confiança.'],
    conforme: ['CONFORME — peça liberada', 'Todos os campos conferidos batem com a etiqueta.']
  };

  var estado = {
    token: null,
    etapa: null,
    fotos: {},
    // Slot reservado enquanto o upload está em voo: garante que duas capturas
    // seguidas não disputem a mesma fonte canônica.
    enviando: {},
    falhas: {},
    camera: null,
    // Vindos da API depois do login (null = ainda não carregados/falharam):
    checklist: null,      // itens do ProjetoModelo único
    ordemPorCodigo: null, // codigo do Checkpoint -> ordem
    nomePorCodigo: null,  // codigo do Checkpoint -> nome exibido
    mapaFontes: null      // fonteFisica -> { ordem, etapaCodigo, sempre, campos }
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

  function mensagemDeErro(corpo, status) {
    if (corpo && corpo.errors && typeof corpo.errors === 'object') {
      var partes = Object.keys(corpo.errors).map(function (chave) {
        var valor = corpo.errors[chave];
        return chave + ': ' + (typeof valor === 'string' ? valor : JSON.stringify(valor));
      });
      if (partes.length) {
        return 'HTTP ' + status + ' — ' + partes.join(' | ');
      }
    }
    if (corpo && typeof corpo.message === 'string') {
      return 'HTTP ' + status + ' — ' + corpo.message;
    }
    return 'HTTP ' + status + ' — falha na chamada da API.';
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
    el('login-corpo').hidden = true;
    el('login-resumo').hidden = false;
    el('login-quem').textContent = 'Conectado como ' + usuario + '.';
    aviso('login-aviso', '');
  }

  function mostrarLoginAberto() {
    el('login-corpo').hidden = false;
    el('login-resumo').hidden = true;
  }

  el('btn-trocar-login').addEventListener('click', function () {
    estado.token = null;
    liberar(false);
    mostrarLoginAberto();
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
      carregarRecorte();
    }).catch(function (erro) {
      liberar(false);
      mostrarLoginAberto();
      aviso('login-aviso', 'Falha de rede: ' + erro.message, 'erro');
    }).then(function () {
      botao.disabled = false;
    });
  });

  // --- B. Recorte por etapa, derivado dos dados da API ---------------------

  // O que cada etapa confere NÃO é constante desta página: sai da checklist do
  // ProjetoModelo (cada item traz 'etapa' = codigo do Checkpoint em que a
  // marcação passa a existir na peça) cruzada com a ordem dos Checkpoints.
  // A regra é a MESMA da API (cumulativa): a etapa N confere o que ela e as
  // anteriores gravaram. Falhou a busca? mapaFontes fica null e a página
  // mostra tudo sem destaque — nunca bloqueia o upload.
  function carregarRecorte() {
    Promise.all([
      pedir(API + '/checkpoints?page=1&limit=50'),
      pedir(API + '/projetos-modelo?page=1&limit=50')
    ]).then(function (respostas) {
      var pontos = respostas[0];
      var projetos = respostas[1];

      if (!pontos.ok || !pontos.corpo || !pontos.corpo.data ||
          !projetos.ok || !projetos.corpo || !projetos.corpo.data) {
        throw new Error('resposta inesperada da API');
      }

      var ordens = {};
      var nomes = {};
      pontos.corpo.data.forEach(function (ponto) {
        if (ponto && typeof ponto.codigo === 'string' && typeof ponto.ordem === 'number') {
          ordens[ponto.codigo] = ponto.ordem;
          nomes[ponto.codigo] = ponto.nome || ponto.codigo;
        }
      });

      // Mais de um projeto cadastrado: a página NÃO escolhe por conta própria
      // (a API responde projeto-modelo-indeterminado nesse caso). Sem recorte,
      // com todas as fontes visíveis.
      var lista = projetos.corpo.data;
      if (lista.length !== 1) {
        throw new Error(lista.length + ' projeto(s) cadastrado(s) — recorte indeterminado');
      }
      var itens = JSON.parse(lista[0].checklist);
      if (!itens || !itens.length) {
        throw new Error('checklist vazia');
      }

      var mapa = {};
      itens.forEach(function (item) {
        if (!item || typeof item.fonteFisica !== 'string') { return; }
        var registro = mapa[item.fonteFisica] ||
          { ordem: null, etapaCodigo: null, sempre: false, campos: [] };
        registro.campos.push(item.campo);
        var etapa = typeof item.etapa === 'string' ? item.etapa.trim() : '';
        // Item sem etapa (ou com etapa que não existe como Checkpoint) entra
        // em qualquer gate — igual à regra do backend.
        if (!etapa || ordens[etapa] === undefined) {
          registro.sempre = true;
        } else if (registro.ordem === null || ordens[etapa] < registro.ordem) {
          registro.ordem = ordens[etapa];
          registro.etapaCodigo = etapa;
        }
        mapa[item.fonteFisica] = registro;
      });

      estado.checklist = itens;
      estado.ordemPorCodigo = ordens;
      estado.nomePorCodigo = nomes;
      estado.mapaFontes = mapa;
      // atualizarTextoEtapa remonta a lista de fotos com o recorte no lugar.
      atualizarTextoEtapa();
    }).catch(function (erro) {
      estado.mapaFontes = null;
      montarFotos();
      el('fotos-recorte').textContent =
        'Não consegui carregar a checklist do projeto (' + erro.message +
        '): todas as vistas aparecem sem destaque. O upload continua liberado.';
    });
  }

  function ordemDaEtapaAtual() {
    if (!estado.etapa || !estado.ordemPorCodigo) { return undefined; }
    return estado.ordemPorCodigo[estado.etapa];
  }

  // Situação de uma fonte física: 'desta-etapa' | 'fora-etapa' | 'sem-etapa'
  // (etapa não escolhida ou desconhecida) | 'fora-da-checklist' | 'indefinido'
  // (dados da API ausentes).
  function situacaoDaFonte(fonte) {
    if (!estado.mapaFontes) { return { situacao: 'indefinido', campos: [] }; }
    var registro = estado.mapaFontes[fonte];
    if (!registro) { return { situacao: 'fora-da-checklist', campos: [] }; }
    var ordem = ordemDaEtapaAtual();
    if (ordem === undefined) { return { situacao: 'sem-etapa', campos: registro.campos }; }
    if (registro.sempre || (registro.ordem !== null && registro.ordem <= ordem)) {
      return { situacao: 'desta-etapa', campos: registro.campos };
    }
    var nome = registro.etapaCodigo && estado.nomePorCodigo
      ? (estado.nomePorCodigo[registro.etapaCodigo] || registro.etapaCodigo)
      : null;
    return { situacao: 'fora-etapa', campos: registro.campos, entraEm: nome };
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

  // Os 3 chumbados carregam o MESMO número de propósito: pedir ao operador que
  // decida qual é o "1" é convenção arbitrária. A página trata as posições como
  // um grupo e atribui a fonte canônica sozinha — a API continua recebendo
  // chumbado-1..3 exatamente como antes.
  function ehChumbado(fonte) { return /^chumbado-\\d+$/.test(fonte); }

  function fontesChumbadas() {
    return fontesOrdenadas().filter(ehChumbado).sort(function (a, b) {
      return Number(a.split('-')[1]) - Number(b.split('-')[1]);
    });
  }

  // Situação do cartão de grupo: a MELHOR entre as posições (todas nascem na
  // mesma etapa; se um dia divergirem, a foto que ajuda o gate manda) e a
  // união dos campos que elas conferem.
  function situacaoDoGrupo(fontes) {
    var melhor = null;
    var campos = [];
    fontes.forEach(function (fonte) {
      var info = situacaoDaFonte(fonte);
      info.campos.forEach(function (campo) {
        if (campos.indexOf(campo) === -1) { campos.push(campo); }
      });
      if (melhor === null || PESO_SITUACAO[info.situacao] < PESO_SITUACAO[melhor.situacao]) {
        melhor = info;
      }
    });
    return {
      situacao: melhor ? melhor.situacao : 'indefinido',
      campos: campos,
      entraEm: melhor ? melhor.entraEm : null
    };
  }

  function proximoSlotLivre(fontes) {
    for (var i = 0; i < fontes.length; i += 1) {
      if (!estado.fotos[fontes[i]] && !estado.enviando[fontes[i]]) { return fontes[i]; }
    }
    return null;
  }

  // Fontes viram texto de operador: as posições chumbadas aparecem contadas,
  // nunca numeradas (a numeração canônica é assunto da API).
  function resumoDeFontes(lista) {
    var chumbadas = lista.filter(ehChumbado).length;
    var partes = lista.filter(function (fonte) { return !ehChumbado(fonte); });
    if (chumbadas) {
      partes.push(chumbadas + (chumbadas === 1 ? ' posição chumbada' : ' posições chumbadas'));
    }
    return partes.join(', ');
  }

  // Ordem de exibição: primeiro as vistas que a etapa confere.
  function fontesOrdenadas() {
    var lista = FONTES.slice();
    if (estado.mapaFontes) {
      Object.keys(estado.mapaFontes).forEach(function (fonte) {
        if (lista.indexOf(fonte) === -1) { lista.push(fonte); }
      });
    }
    return lista.map(function (fonte, indice) {
      return { fonte: fonte, indice: indice, peso: PESO_SITUACAO[situacaoDaFonte(fonte).situacao] };
    }).sort(function (a, b) {
      return a.peso === b.peso ? a.indice - b.indice : a.peso - b.peso;
    }).map(function (item) { return item.fonte; });
  }

  function atualizarTextoRecorte() {
    var alvo = el('fotos-recorte');
    if (!estado.mapaFontes) { return; }
    if (!estado.etapa) {
      alvo.textContent = 'Escolha uma etapa no passo 1 para ver quais vistas ela confere. Sem etapa, a conferência cobra a checklist inteira do projeto.';
      return;
    }
    var doGate = fontesDesta('desta-etapa');
    if (ordemDaEtapaAtual() === undefined) {
      alvo.textContent = 'A etapa "' + estado.etapa + '" não está cadastrada como checkpoint — sem recorte, todas as vistas aparecem sem destaque.';
      return;
    }
    alvo.textContent = 'Esta etapa confere: ' + resumoDeFontes(doGate) +
      '. A conferência é cumulativa — a etapa confere o que ela e as anteriores gravaram na peça. As demais vistas ainda não existem aqui, mas o upload continua liberado.';
  }

  // --- C. Passo 1: etapa --------------------------------------------------

  function atualizarTextoEtapa() {
    var dica = el('etapa-dica');
    if (!estado.etapa) {
      dica.textContent = 'Nenhuma etapa escolhida — a conferência será registrada sem etapa, cobrando a checklist inteira.';
    } else {
      var nome = estado.nomePorCodigo && estado.nomePorCodigo[estado.etapa]
        ? estado.nomePorCodigo[estado.etapa]
        : estado.etapa;
      dica.textContent = 'Simulando a câmera de: ' + nome + ' (' + estado.etapa + ') — a conferência nasce vinculada a ela.';
    }
    atualizarTextoRecorte();
    montarFotos();
    atualizarBotaoExtrair();
  }

  function selecionarEtapa(codigo) {
    estado.etapa = codigo;
    Array.prototype.forEach.call(document.querySelectorAll('#grade-etapas .etapa'), function (botao) {
      botao.setAttribute('aria-pressed', botao.getAttribute('data-codigo') === estado.etapa ? 'true' : 'false');
    });
    atualizarTextoEtapa();
  }

  Array.prototype.forEach.call(document.querySelectorAll('#grade-etapas .etapa'), function (botao) {
    botao.addEventListener('click', function () {
      var codigo = botao.getAttribute('data-codigo');
      selecionarEtapa(estado.etapa === codigo ? null : codigo);
    });
  });

  // Cada celular abre a URL da SUA etapa (?etapa=serigrafia): é o que, em
  // produção, virá provisionado na câmera fixa.
  function aplicarEtapaDaUrl() {
    var busca = window.location.search || '';
    var achado = /[?&]etapa=([^&]*)/.exec(busca);
    if (!achado) { return; }
    var codigo = decodeURIComponent(achado[1].replace(/\\+/g, ' ')).trim();
    if (!codigo) { return; }
    selecionarEtapa(codigo);
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

  function rotuloDaSituacao(info) {
    if (info.situacao === 'desta-etapa') { return 'desta etapa'; }
    if (info.situacao === 'fora-etapa') {
      return info.entraEm ? 'não é desta etapa — entra em ' + info.entraEm : 'não é desta etapa';
    }
    if (info.situacao === 'fora-da-checklist') { return 'fora da checklist deste projeto'; }
    return '';
  }

  function classeDoCartao(info) {
    var classe = 'item-foto';
    if (info.situacao === 'desta-etapa') { classe += ' desta-etapa'; }
    if (info.situacao === 'fora-etapa') { classe += ' fora-etapa'; }
    return classe;
  }

  function trechoDosCampos(info) {
    return info.campos && info.campos.length
      ? '<span class="estado">confere: ' + esc(info.campos.join(', ')) + '</span>'
      : '';
  }

  function trechoDaMarca(info) {
    var rotulo = rotuloDaSituacao(info);
    return rotulo ? '<span class="marca-etapa">' + esc(rotulo) + '</span>' : '';
  }

  function textoDoEnvio(fonte) {
    if (estado.enviando[fonte]) { return 'enviando...'; }
    if (estado.falhas[fonte]) { return 'falhou'; }
    return estado.fotos[fonte] ? 'enviada' : 'sem foto';
  }

  // Cartão de UMA fonte (placa, serigrafia, geral): inalterado.
  function cartaoSimples(fonte, info) {
    var foto = estado.fotos[fonte];
    return '<div class="' + classeDoCartao(info) + '" data-fonte="' + esc(fonte) + '">' +
      '<img class="miniatura" alt="" ' + (foto && foto.url ? 'src="' + esc(foto.url) + '"' : 'hidden') + '>' +
      '<span class="nome">' + esc(fonte) +
      trechoDaMarca(info) + trechoDosCampos(info) +
      '<span class="estado envio' + (estado.falhas[fonte] ? ' falhou' : '') + '">' +
      esc(textoDoEnvio(fonte)) + '</span></span>' +
      '<label class="botao-foto">' + (foto ? 'Refotografar' : 'Fotografar') +
      '<input type="file" accept="image/*" capture="environment" hidden></label>' +
      '</div>';
  }

  // Cartão ÚNICO das posições chumbadas: um botão de captura, contador e as
  // miniaturas já enviadas. O operador nunca escolhe o número da posição.
  function cartaoChumbados(fontes, info) {
    var enviadas = fontes.filter(function (fonte) { return !!estado.fotos[fonte]; });
    var emVoo = fontes.filter(function (fonte) { return !!estado.enviando[fonte]; });
    var falhadas = fontes.filter(function (fonte) { return !!estado.falhas[fonte]; });
    var contador = enviadas.length + ' de ' + fontes.length + ' posições fotografadas' +
      (emVoo.length ? ' · ' + emVoo.length + ' enviando...' : '') +
      (falhadas.length ? ' · ' + falhadas.length + ' falhou' : '');

    var tiras = enviadas.map(function (fonte, indice) {
      return '<div class="tira" title="' + esc(fonte) + '">' +
        '<img alt="" src="' + esc(estado.fotos[fonte].url || '') + '">' +
        '<span class="rotulo">Posição ' + (indice + 1) + '</span>' +
        '<button type="button" class="remover" data-fonte="' + esc(fonte) + '">Remover</button>' +
        '</div>';
    }).join('');

    var temSlot = proximoSlotLivre(fontes) !== null;
    var captura = temSlot
      ? '<label class="botao-foto grande">Fotografar posição' +
        '<input type="file" accept="image/*" capture="environment" hidden></label>'
      : '<span class="botao-foto grande desativado">' + fontes.length + ' de ' + fontes.length +
        ' — remova uma para refazer</span>';

    return '<div class="' + classeDoCartao(info) + ' grupo" data-grupo="chumbados">' +
      '<div class="cabeca-grupo">' +
      '<span class="nome">Chumbados — ' + fontes.length + ' posições no metal' +
      trechoDaMarca(info) + trechoDosCampos(info) +
      '<span class="estado envio">' + esc(contador) + '</span></span>' +
      captura +
      '</div>' +
      '<p class="dica">Fotografe cada uma das ' + fontes.length + ' posições (topo e laterais). ' +
      'A numeração é automática — o que importa é que sejam posições diferentes.</p>' +
      '<p class="contexto">Em produção, cada posição é uma câmera fixa provisionada — ninguém rotula nada.</p>' +
      (tiras ? '<div class="tiras">' + tiras + '</div>' : '') +
      '</div>';
  }

  function montarFotos() {
    var chumbados = fontesChumbadas();
    var grupoPosto = false;

    var html = fontesOrdenadas().map(function (fonte) {
      if (ehChumbado(fonte)) {
        // O grupo ocupa a posição do primeiro chumbado da lista ordenada.
        if (grupoPosto) { return ''; }
        grupoPosto = true;
        return cartaoChumbados(chumbados, situacaoDoGrupo(chumbados));
      }
      return cartaoSimples(fonte, situacaoDaFonte(fonte));
    }).join('');
    el('lista-fotos').innerHTML = html;

    Array.prototype.forEach.call(el('lista-fotos').querySelectorAll('.item-foto'), function (cartao) {
      var ehGrupo = cartao.getAttribute('data-grupo') === 'chumbados';
      var entrada = cartao.querySelector('input[type=file]');
      if (entrada) {
        entrada.addEventListener('change', function (evento) {
          var arquivos = evento.target.files;
          if (!arquivos || !arquivos.length) { return; }
          Array.prototype.forEach.call(arquivos, function (arquivo) {
            // No grupo, o destino é o menor slot canônico livre — decidido
            // aqui, nunca pelo operador.
            var destino = ehGrupo
              ? proximoSlotLivre(fontesChumbadas())
              : cartao.getAttribute('data-fonte');
            if (!destino) {
              aviso('fotos-aviso', 'As posições chumbadas já estão preenchidas — remova uma para refazer.', 'neutro');
              return;
            }
            enviarFoto(destino, arquivo);
          });
        });
      }
      Array.prototype.forEach.call(cartao.querySelectorAll('.remover'), function (botao) {
        botao.addEventListener('click', function () {
          removerFoto(botao.getAttribute('data-fonte'));
        });
      });
    });
  }

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
    };

    pedir(API + '/fotos-evidencia/upload', { method: 'POST', body: dados })
      .then(function (resposta) {
        if (!resposta.ok || !resposta.corpo || !resposta.corpo.id) {
          estado.falhas[fonte] = true;
          aviso('fotos-aviso', mensagemDeErro(resposta.corpo, resposta.status), 'erro');
          return;
        }
        estado.fotos[fonte] = { id: resposta.corpo.id, url: resposta.corpo.url };
      })
      .catch(function (erro) {
        estado.falhas[fonte] = true;
        aviso('fotos-aviso', 'Falha de rede no envio: ' + erro.message, 'erro');
      })
      .then(encerrar);
  }

  // Remoção é LOCAL: solta o slot para a próxima captura e tira a foto desta
  // conferência. A evidência já enviada continua no storage — nenhuma rota
  // nova, nenhuma mudança de contrato.
  function removerFoto(fonte) {
    delete estado.fotos[fonte];
    delete estado.falhas[fonte];
    montarFotos();
    atualizarBotaoExtrair();
    aviso('fotos-aviso', 'Posição liberada — a próxima foto ocupa o lugar dela.', 'neutro');
  }

  function fotosEnviadas() {
    return fontesOrdenadas().filter(function (fonte) { return !!estado.fotos[fonte]; });
  }

  // --- F. Passo 4: extrair ------------------------------------------------

  function atualizarBotaoExtrair() {
    var enviadas = fotosEnviadas();
    el('btn-extrair').disabled = enviadas.length === 0;
    el('extrair-dica').textContent = enviadas.length === 0
      ? 'Envie ao menos uma foto no passo 3 para liberar a extração.'
      : 'Vai enviar ' + enviadas.length + ' foto(s) (' + resumoDeFontes(enviadas) +
        ') à visão da API. Uma chamada por foto, sem repetição automática.';
  }

  // --- G. Modo avançado: leituras digitadas -------------------------------

  function montarLeituras() {
    var html = CAMPOS.map(function (item) {
      var id = 'leitura-' + item.campo;
      return '<div class="item-leitura" data-campo="' + esc(item.campo) + '" data-fonte="' + esc(item.fonte) + '">' +
        '<div class="cabeca"><label for="' + esc(id) + '">' +
        '<input type="checkbox" id="' + esc(id) + '" checked>' +
        '<span><span class="campo">' + esc(item.campo) + '</span>' +
        '<span class="fonte"> — fonte: ' + esc(item.fonte) + '</span></span>' +
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
    CAMPOS.forEach(function (item) {
      var linha = linhaDoCampo(item.campo);
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

  // Recorte da etapa vindo da checklist da API (mesma regra cumulativa do
  // backend); a tabela local só entra se a checklist não tiver carregado.
  function camposDaEtapa(codigo) {
    var ordemEtapa = estado.ordemPorCodigo ? estado.ordemPorCodigo[codigo] : undefined;
    if (estado.checklist && ordemEtapa !== undefined) {
      var permitidos = [];
      estado.checklist.forEach(function (item) {
        var etapa = typeof item.etapa === 'string' ? item.etapa.trim() : '';
        var ordemItem = etapa && estado.ordemPorCodigo ? estado.ordemPorCodigo[etapa] : undefined;
        if (!etapa || ordemItem === undefined || ordemItem <= ordemEtapa) {
          permitidos.push(item.campo);
        }
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
    CAMPOS.forEach(function (item) {
      linhaDoCampo(item.campo).querySelector('input[type=checkbox]').checked =
        permitidos.indexOf(item.campo) !== -1;
    });
    aviso('avancado-aviso', 'Campos ajustados para a etapa ' + estado.etapa + '.', 'neutro');
  });

  function coletarLeituras() {
    var leituras = [];
    CAMPOS.forEach(function (item) {
      var linha = linhaDoCampo(item.campo);
      if (!linha.querySelector('input[type=checkbox]').checked) { return; }
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

  function formatarConfianca(valor) {
    if (valor === null || valor === undefined) { return 'sem confiança'; }
    return Number(valor).toFixed(3);
  }

  function linhaDaEtapa(resposta) {
    var quantos = typeof resposta.camposAvaliados === 'number' ? resposta.camposAvaliados : (resposta.campos || []).length;
    if (resposta.etapaAvaliada) {
      return 'Etapa: ' + resposta.etapaAvaliada.nome + ' · ' + quantos + ' campos conferíveis nesta etapa';
    }
    return 'Conferência completa · ' + quantos + ' campos';
  }

  function faixaDaExtracao(extracao) {
    if (!extracao) { return ''; }
    // Transparência de custo: fotos fora do recorte da etapa NÃO foram
    // enviadas à visão (dinheiro que deixou de ser gasto) — mostrar para o
    // operador entender por que "mandei 4 fotos e só 2 contaram".
    var fora = extracao.fotosForaDoRecorte > 0
      ? ' · ' + esc(extracao.fotosForaDoRecorte) + ' foto(s) fora desta etapa (não enviadas à visão)'
      : '';
    if (extracao.leiturasProduzidas === 0) {
      return '<div class="faixa-extracao vazia">Extração: driver ' + esc(extracao.driver) +
        ' · ' + esc(extracao.fotos) + ' foto(s) · 0 leitura(s) — nenhuma leitura extraída: ' +
        'verifique enquadramento e iluminação.' + fora + '</div>';
    }
    return '<div class="faixa-extracao">Extração: driver ' + esc(extracao.driver) +
      ' · ' + esc(extracao.fotos) + ' foto(s) · ' + esc(extracao.leiturasProduzidas) + ' leitura(s)' + fora + '</div>';
  }

  function renderizar(resposta) {
    var geral = resposta.conferencia ? resposta.conferencia.vereditoGeral : 'nao_conferivel';
    var textos = TEXTO_VEREDITO[geral] || [String(geral).toUpperCase(), ''];
    var peca = resposta.transformador || {};

    var html = faixaDaExtracao(resposta.extracao);

    html += '<div class="veredito-geral v-' + esc(geral) + '">' +
      '<div class="titulo">' + esc(textos[0]) + '</div>' +
      '<div class="sub">' + esc(textos[1]) + '</div>' +
      '<div class="sub">Peça ' + esc(peca.numeroSerie || '?') + '</div>' +
      '<div class="sub">' + esc(linhaDaEtapa(resposta)) + '</div>' +
      '</div>';

    html += (resposta.campos || []).map(function (campo) {
      var url = urlDaFonte(campo.fonteFisica);
      var bloco = '<div class="cartao-campo v-' + esc(campo.veredito) + '">' +
        '<div class="topo"><span class="nome-campo">' + esc(campo.campo) + '</span>' +
        '<span class="marca">' + esc(campo.veredito) + '</span></div>' +
        '<dl>' +
        '<dt>esperado</dt><dd class="mono">' + esc(campo.valorEsperado === null ? '(sem valor esperado)' : campo.valorEsperado) + '</dd>' +
        '<dt>lido</dt><dd class="mono">' + esc(campo.valorLido === null ? '(sem leitura)' : campo.valorLido) + '</dd>' +
        '<dt>confiança</dt><dd>' + esc(formatarConfianca(campo.confianca)) + '</dd>' +
        '<dt>fonte</dt><dd>' + esc(campo.fonteFisica) + (campo.obrigatorio ? ' (obrigatório)' : ' (opcional)') + '</dd>';
      if (campo.motivo) {
        bloco += '<dt>motivo</dt><dd>' + esc(campo.motivo) + '</dd>';
      }
      bloco += '</dl>';
      if (url) {
        bloco += '<a href="' + esc(url) + '" target="_blank" rel="noopener">ver foto (' + esc(campo.fonteFisica) + ')</a>';
      }
      return bloco + '</div>';
    }).join('');

    html += '<details><summary>Resposta bruta da API</summary><pre>' +
      esc(JSON.stringify(resposta, null, 2)) + '</pre></details>';

    el('veredito-vazio').hidden = true;
    el('resultado').innerHTML = html;
    el('sec-veredito').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  function chamarConferencia(caminho, corpo, botao, avisoId, textoAndamento) {
    botao.disabled = true;
    aviso(avisoId, textoAndamento, 'neutro');
    el('resultado').innerHTML = '';
    el('veredito-vazio').hidden = false;
    el('veredito-vazio').textContent = textoAndamento;

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
    }).catch(function (erro) {
      aviso(avisoId, 'Falha de rede: ' + erro.message, 'erro');
      el('veredito-vazio').textContent = 'Falha de rede — nada foi conferido.';
    }).then(function () {
      botao.disabled = false;
      atualizarBotaoExtrair();
    });
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

    chamarConferencia('/conferencias/executar', corpo, el('btn-conferir'), 'avancado-aviso', 'Conferindo na API...');
  });

  el('btn-extrair').addEventListener('click', function () {
    var enviadas = fotosEnviadas();
    if (!enviadas.length) {
      aviso('conferir-aviso', 'Envie ao menos uma foto no passo 3 para extrair.', 'erro');
      return;
    }
    var payload = payloadAtual('conferir-aviso');
    if (!payload) { return; }

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
      'Lendo as fotos... a visão da API leva alguns segundos por foto.'
    );
  });

  montarFotos();
  montarLeituras();
  aplicarPreset(PRESET_DEMO);
  aplicarEtapaDaUrl();
  atualizarTextoEtapa();
  atualizarBotaoExtrair();
  aviso('conferir-aviso', '');
  aviso('avancado-aviso', '');
})();
</script>
</body>
</html>
`;
