/**
 * PÁGINA DE DEMONSTRAÇÃO TEMPORÁRIA — ver demo.controller.ts.
 *
 * Uma única template string: HTML + CSS + JS inline, zero dependência externa
 * (nenhum CDN — a página tem de abrir no celular do time dentro da rede da
 * fábrica). Todo fetch usa caminho relativo, então a página funciona em
 * qualquer host/porta onde a API estiver servindo.
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
    margin: 0 0 10px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--tinta-fraca);
  }
  section[data-bloqueado="1"] { opacity: .45; pointer-events: none; }
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
  button.principal {
    background: var(--acento);
    border-color: var(--acento);
    font-size: 19px;
    min-height: 60px;
    letter-spacing: .06em;
    text-transform: uppercase;
  }
  button.principal.alternativa { background: var(--aco); border-color: var(--aco); font-size: 17px; }
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
    padding: 10px 0;
    border-bottom: 1px solid var(--borda);
  }
  .item-foto:last-child { border-bottom: 0; }
  .item-foto .nome { flex: 1 1 auto; font-size: 15px; font-family: ui-monospace, Menlo, Consolas, monospace; }
  .item-foto .estado { display: block; font-size: 13px; color: var(--tinta-fraca); font-family: inherit; }
  .item-foto .estado.falhou { color: var(--vermelho); }
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
  .miniatura {
    width: 46px; height: 46px; object-fit: cover;
    border: 1px solid var(--borda); border-radius: 4px; background: #e6e9ec;
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
  details { margin-top: 12px; border: 1px solid var(--borda); border-radius: 4px; background: #fff; }
  summary { padding: 12px; font-size: 14px; color: var(--tinta-fraca); cursor: pointer; min-height: 44px; }
  pre {
    margin: 0; padding: 12px; background: #1c2430; color: #dde6ef;
    font-size: 12px; overflow-x: auto; border-radius: 0 0 4px 4px;
  }
  video { width: 100%; max-height: 300px; background: #000; border-radius: 4px; margin-top: 10px; }
  #camera-area[hidden] { display: none; }
  .dica { font-size: 13px; color: var(--tinta-fraca); margin: 6px 0 0; }
  .rodape { font-size: 12px; color: var(--tinta-fraca); text-align: center; padding: 4px 0 24px; }
</style>
</head>
<body>
<header>
  <h1>TRAEL — conferência de peça</h1>
  <p>Página de demonstração temporária. O veredito é sempre calculado pela API.</p>
</header>
<main>

  <section id="sec-login">
    <h2>1. Acesso</h2>
    <label class="rotulo" for="email">E-mail</label>
    <input type="email" id="email" value="admin@example.com" autocomplete="username" autocapitalize="none" spellcheck="false">
    <label class="rotulo" for="senha">Senha</label>
    <input type="password" id="senha" value="secret" autocomplete="current-password">
    <div class="linha-botoes" style="margin-top:12px">
      <button id="btn-login" class="largo">Entrar</button>
    </div>
    <div id="login-aviso" class="aviso neutro" hidden></div>
  </section>

  <section id="sec-etapa" data-bloqueado="1">
    <h2>2. Etapa da linha (câmera que você simula)</h2>
    <div class="grade-etapas" id="grade-etapas">
      <button class="secundario etapa" data-codigo="adesivacao" aria-pressed="false">Adesivação</button>
      <button class="secundario etapa" data-codigo="serigrafia" aria-pressed="false">Serigrafia</button>
      <button class="secundario etapa" data-codigo="oleo-conferencia" aria-pressed="false">Óleo e conferência</button>
      <button class="secundario etapa" data-codigo="fixacao-placa" aria-pressed="false">Fixação da placa</button>
    </div>
    <p class="dica" id="etapa-dica">Nenhuma etapa escolhida — a conferência será registrada sem etapa.</p>
  </section>

  <section id="sec-qr" data-bloqueado="1">
    <h2>3. Etiqueta (QR)</h2>
    <label class="rotulo" for="payload">Conteúdo da etiqueta</label>
    <textarea id="payload" spellcheck="false" autocapitalize="none">Pedido: 68202\nNúm. Série: 847233\nSeq: 86\nPatrimônio: 251328\nCliente: 143091 - Energisa Rondônia Distribuidora de Energia S.A\nTPD-408136</textarea>
    <div class="linha-botoes" style="margin-top:10px">
      <button id="btn-camera" class="secundario">Ler QR com a câmera</button>
    </div>
    <div id="qr-aviso" class="aviso neutro" hidden></div>
    <div id="camera-area" hidden>
      <video id="video" playsinline muted></video>
      <div class="linha-botoes" style="margin-top:8px">
        <button id="btn-parar-camera" class="secundario">Parar câmera</button>
      </div>
    </div>
    <div id="qr-bruto" class="bloco-bruto" hidden>
      <p class="titulo-bruto">Conteúdo bruto lido do QR (texto exato da etiqueta)</p>
      <pre id="qr-bruto-texto"></pre>
      <div class="linha-botoes" style="margin-top:8px">
        <button id="btn-copiar-qr" class="secundario">Copiar</button>
      </div>
    </div>
  </section>

  <section id="sec-fotos" data-bloqueado="1">
    <h2>4. Fotos por fonte física</h2>
    <div id="lista-fotos"></div>
    <div id="fotos-aviso" class="aviso neutro" hidden></div>
  </section>

  <section id="sec-leituras" data-bloqueado="1">
    <h2>5. Leituras da peça</h2>
    <p class="dica">Enquanto a extração automática não está plugada ao fluxo, os valores lidos entram aqui à mão. Os presets usam os números medidos pelo Textract nas fotos reais.</p>
    <div class="linha-botoes" style="margin:10px 0">
      <button class="secundario" id="preset-demo">Peça de demo (defeito real)</button>
      <button class="secundario" id="preset-correta">Peça correta</button>
      <button class="secundario" id="preset-ruim">Foto ruim (baixa confiança)</button>
    </div>
    <div class="linha-botoes" style="margin:0 0 10px">
      <button class="secundario" id="btn-campos-etapa">Só os campos desta etapa</button>
    </div>
    <p class="dica">A etapa escolhida define quais campos são cobrados — os que ainda não existem na peça (ex.: placa na adesivação) ficam de fora do recorte.</p>
    <div id="lista-leituras"></div>
  </section>

  <section id="sec-conferir" data-bloqueado="1">
    <h2>6. Conferência</h2>
    <div class="linha-botoes">
      <button id="btn-extrair" class="principal" disabled>EXTRAIR COM TEXTRACT</button>
      <button id="btn-conferir" class="principal alternativa">CONFERIR AGORA</button>
    </div>
    <p class="dica" id="extrair-dica">Extrair com Textract usa as fotos da seção 4 e a visão real da API — envie ao menos uma foto para liberar. "Conferir agora" usa as leituras digitadas da seção 5.</p>
    <div id="conferir-aviso" class="aviso neutro" hidden></div>
    <div id="resultado"></div>
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

  // Quais campos cada etapa consegue enxergar na linha real.
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
    camera: null
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
    ['sec-etapa', 'sec-qr', 'sec-fotos', 'sec-leituras', 'sec-conferir'].forEach(function (id) {
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

  // --- A. Login -----------------------------------------------------------

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
        aviso('login-aviso', mensagemDeErro(resposta.corpo, resposta.status), 'erro');
        return;
      }
      estado.token = resposta.corpo.token;
      liberar(true);
      var usuario = resposta.corpo.user && resposta.corpo.user.email ? resposta.corpo.user.email : el('email').value;
      aviso('login-aviso', 'Conectado como ' + usuario + '.', 'ok');
    }).catch(function (erro) {
      liberar(false);
      aviso('login-aviso', 'Falha de rede: ' + erro.message, 'erro');
    }).then(function () {
      botao.disabled = false;
    });
  });

  // --- B. Etapa -----------------------------------------------------------

  Array.prototype.forEach.call(document.querySelectorAll('#grade-etapas .etapa'), function (botao) {
    botao.addEventListener('click', function () {
      var codigo = botao.getAttribute('data-codigo');
      var jaEscolhida = estado.etapa === codigo;
      estado.etapa = jaEscolhida ? null : codigo;
      Array.prototype.forEach.call(document.querySelectorAll('#grade-etapas .etapa'), function (outro) {
        outro.setAttribute('aria-pressed', outro.getAttribute('data-codigo') === estado.etapa ? 'true' : 'false');
      });
      el('etapa-dica').textContent = estado.etapa
        ? 'Etapa: ' + estado.etapa + ' — a conferência nasce vinculada a ela.'
        : 'Nenhuma etapa escolhida — a conferência será registrada sem etapa.';
    });
  });

  // --- C. QR --------------------------------------------------------------

  var suportaQr = 'BarcodeDetector' in window;
  if (!suportaQr) {
    el('btn-camera').hidden = true;
    aviso('qr-aviso', 'Seu navegador não suporta leitura de QR — use o texto acima.', 'neutro');
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
        aviso('qr-aviso', 'Não foi possível abrir a câmera: ' + erro.message + '. Use o texto acima.', 'erro');
      });
  });

  // --- D. Fotos -----------------------------------------------------------

  function montarFotos() {
    var html = FONTES.map(function (fonte) {
      return '<div class="item-foto" data-fonte="' + esc(fonte) + '">' +
        '<img class="miniatura" alt="" hidden>' +
        '<span class="nome">' + esc(fonte) +
        '<span class="estado">sem foto</span></span>' +
        '<label class="botao-foto">Fotografar' +
        '<input type="file" accept="image/*" capture="environment" hidden></label>' +
        '</div>';
    }).join('');
    el('lista-fotos').innerHTML = html;

    Array.prototype.forEach.call(el('lista-fotos').querySelectorAll('.item-foto'), function (linha) {
      var fonte = linha.getAttribute('data-fonte');
      linha.querySelector('input[type=file]').addEventListener('change', function (evento) {
        var arquivo = evento.target.files && evento.target.files[0];
        if (!arquivo) { return; }
        enviarFoto(fonte, arquivo, linha);
      });
    });
  }

  function enviarFoto(fonte, arquivo, linha) {
    var estadoTexto = linha.querySelector('.estado');
    var miniatura = linha.querySelector('.miniatura');
    estadoTexto.className = 'estado';
    estadoTexto.textContent = 'enviando...';
    aviso('fotos-aviso', '');

    var dados = new FormData();
    dados.append('file', arquivo);
    dados.append('fonteFisica', fonte);

    pedir(API + '/foto-evidencia/upload', { method: 'POST', body: dados })
      .then(function (resposta) {
        if (!resposta.ok || !resposta.corpo || !resposta.corpo.id) {
          estadoTexto.className = 'estado falhou';
          estadoTexto.textContent = 'falhou';
          aviso('fotos-aviso', fonte + ' — ' + mensagemDeErro(resposta.corpo, resposta.status), 'erro');
          return;
        }
        estado.fotos[fonte] = { id: resposta.corpo.id, url: resposta.corpo.url };
        estadoTexto.textContent = 'enviada';
        if (resposta.corpo.url) {
          miniatura.src = resposta.corpo.url;
          miniatura.hidden = false;
        }
        atualizarBotaoExtrair();
      })
      .catch(function (erro) {
        estadoTexto.className = 'estado falhou';
        estadoTexto.textContent = 'falhou';
        aviso('fotos-aviso', fonte + ' — falha de rede: ' + erro.message, 'erro');
      });
  }

  function fotosEnviadas() {
    return FONTES.filter(function (fonte) { return !!estado.fotos[fonte]; });
  }

  function atualizarBotaoExtrair() {
    var enviadas = fotosEnviadas();
    el('btn-extrair').disabled = enviadas.length === 0;
    el('extrair-dica').textContent = enviadas.length === 0
      ? 'Extrair com Textract usa as fotos da seção 4 e a visão real da API — envie ao menos uma foto para liberar. "Conferir agora" usa as leituras digitadas da seção 5.'
      : 'Extrair com Textract vai enviar ' + enviadas.length + ' foto(s) (' + enviadas.join(', ') + ') ao extrator da API. "Conferir agora" continua usando as leituras digitadas da seção 5.';
  }

  // --- E. Leituras --------------------------------------------------------

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
    aviso('conferir-aviso', '');
  }

  el('preset-demo').addEventListener('click', function () { aplicarPreset(PRESET_DEMO); });
  el('preset-correta').addEventListener('click', function () { aplicarPreset(PRESET_CORRETA); });
  el('preset-ruim').addEventListener('click', function () { aplicarPreset(PRESET_RUIM); });

  el('btn-campos-etapa').addEventListener('click', function () {
    if (!estado.etapa) {
      aviso('conferir-aviso', 'Escolha uma etapa na seção 2 antes de filtrar os campos.', 'erro');
      return;
    }
    var permitidos = CAMPOS_POR_ETAPA[estado.etapa] || [];
    CAMPOS.forEach(function (item) {
      linhaDoCampo(item.campo).querySelector('input[type=checkbox]').checked =
        permitidos.indexOf(item.campo) !== -1;
    });
    aviso('conferir-aviso', 'Campos ajustados para a etapa ' + estado.etapa + '.', 'neutro');
  });

  // --- F. Conferir --------------------------------------------------------

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
    if (extracao.leiturasProduzidas === 0) {
      return '<div class="faixa-extracao vazia">Extração: driver ' + esc(extracao.driver) +
        ' · ' + esc(extracao.fotos) + ' foto(s) · 0 leitura(s) — nenhuma leitura extraída: ' +
        'verifique enquadramento e iluminação.</div>';
    }
    return '<div class="faixa-extracao">Extração: driver ' + esc(extracao.driver) +
      ' · ' + esc(extracao.fotos) + ' foto(s) · ' + esc(extracao.leiturasProduzidas) + ' leitura(s)</div>';
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

    el('resultado').innerHTML = html;
    el('resultado').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function payloadAtual() {
    var payload = el('payload').value.trim();
    if (!payload) {
      aviso('conferir-aviso', 'A etiqueta (seção 3) está vazia.', 'erro');
      return null;
    }
    return payload;
  }

  // Uma só rotina de chamada: as duas ações mandam corpos diferentes para
  // rotas diferentes e recebem a MESMA resposta — quem decide o veredito é a
  // API nos dois casos.
  function chamarConferencia(caminho, corpo, botao, textoAndamento) {
    botao.disabled = true;
    aviso('conferir-aviso', textoAndamento, 'neutro');
    el('resultado').innerHTML = '';

    pedir(API + caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    }).then(function (resposta) {
      if (!resposta.ok || !resposta.corpo) {
        aviso('conferir-aviso', mensagemDeErro(resposta.corpo, resposta.status), 'erro');
        if (resposta.corpo) {
          el('resultado').innerHTML = '<details open><summary>Resposta bruta da API</summary><pre>' +
            esc(JSON.stringify(resposta.corpo, null, 2)) + '</pre></details>';
        }
        return;
      }
      aviso('conferir-aviso', '');
      renderizar(resposta.corpo);
    }).catch(function (erro) {
      aviso('conferir-aviso', 'Falha de rede: ' + erro.message, 'erro');
    }).then(function () {
      botao.disabled = false;
      atualizarBotaoExtrair();
    });
  }

  el('btn-conferir').addEventListener('click', function () {
    var leituras = coletarLeituras();
    if (!leituras.length) {
      aviso('conferir-aviso', 'Marque ao menos um campo na seção 5.', 'erro');
      return;
    }
    var payload = payloadAtual();
    if (!payload) { return; }

    var corpo = { payloadQr: payload, leituras: leituras };
    if (estado.etapa) {
      corpo.etapaCodigo = estado.etapa;
    }

    chamarConferencia('/conferencia/executar', corpo, el('btn-conferir'), 'Conferindo na API...');
  });

  el('btn-extrair').addEventListener('click', function () {
    var enviadas = fotosEnviadas();
    if (!enviadas.length) {
      aviso('conferir-aviso', 'Envie ao menos uma foto na seção 4 para extrair.', 'erro');
      return;
    }
    var payload = payloadAtual();
    if (!payload) { return; }

    var corpo = {
      payloadQr: payload,
      fotoEvidenciaIds: enviadas.map(function (fonte) { return estado.fotos[fonte].id; })
    };
    if (estado.etapa) {
      corpo.etapaCodigo = estado.etapa;
    }

    chamarConferencia(
      '/conferencia/executar-com-fotos',
      corpo,
      el('btn-extrair'),
      'Lendo as fotos... a visão da API leva alguns segundos por foto.'
    );
  });

  montarFotos();
  montarLeituras();
  aplicarPreset(PRESET_DEMO);
  atualizarBotaoExtrair();
  aviso('conferir-aviso', '');
})();
</script>
</body>
</html>
`;
