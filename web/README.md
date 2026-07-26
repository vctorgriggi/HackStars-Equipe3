# `web/` — frontend de produção do TRAEL Conferência

App Next.js 16 (React 19, Tailwind 4, TypeScript estrito) que o **operador usa
no celular** para conferir a identidade de um transformador contra o QR da
etiqueta, registrar a passagem da peça pelos checkpoints da linha e consultar o
histórico.

Este documento é a **fundação**: o que já existe, por que existe assim, e o que
as telas podem consumir. As regras do repositório estão no `CLAUDE.md` da raiz —
aqui explicamos como elas viraram código.

---

## A regra que manda em tudo

> **O veredito nasce exclusivamente na API. O front nunca compara campos.**

Consequências práticas, todas verificáveis lendo o código:

| Proibido no front | Onde a coisa acontece de verdade |
| --- | --- |
| Comparar valor esperado × valor lido | engine em `backend/src/conferencias/engine` |
| Aplicar limiar de confiança (0.9) | `conferencia-execucao.service.ts` |
| Decidir quais fotos a etapa exige | `GET /conferencias/plano-de-fotos` |
| Interpretar o payload do QR | parser em `backend/src/transformadores/qr` |
| Falar com a AWS | módulos `extracao` / `evidencias` do backend |

O front **decodifica a imagem** do QR (isso é câmera, não regra) e manda o
**texto cru** para a API. Se uma tela precisa de um dado derivado, o dado nasce
na API — nunca num `useMemo` daqui.

---

## Como rodar

```bash
# a API precisa estar no ar (outra aba):
cd backend && npm run start:dev        # http://localhost:3001/api/v1

cd web
npm install
npm run dev                            # http://localhost:3000
```

No celular, abra `http://<ip-da-sua-maquina>:3000` — o app deriva a API do
mesmo host na porta 3001, sem configuração.

Login: `admin@example.com` / `secret` (admin do seed do boilerplate).

Verificação da fundação:

```bash
npm run lint     # limpo
npm run build    # limpo
```

### Apontar para produção

```bash
echo 'NEXT_PUBLIC_API_URL=https://<sua-api>/api/v1' > .env.local
```

`NEXT_PUBLIC_API_URL` é **só URL**. Nenhuma credencial vai para variável
`NEXT_PUBLIC_*`: ela entra no bundle e fica pública. Modelo em `env-example`.

> **A câmera do navegador só abre em origem segura** (HTTPS ou `localhost`).
> Em rede local por IP, o `QrLeitor` detecta isso e oferece os caminhos
> alternativos (foto do QR e digitação) em vez de ficar girando.

---

## Decisões de arquitetura (e o porquê)

### 1. O navegador fala direto com o NestJS — sem route handlers

Existe `app/`, mas **não existe `app/api/`**. Nenhum route handler, nenhum
proxy, nenhuma regra de negócio no lado servidor do Next. O Next aqui é
**entrega de UI**; a API é o NestJS.

Por quê: um proxy no Next viraria um segundo lugar onde regra de domínio pode se
esconder — e neste projeto a regra de ouro depende de existir **um único** lugar
que decide. Efeito colateral bom: tudo é estático e poderia ser servido por
qualquer CDN.

### 2. O token JWT vive em memória

`components/providers.tsx` guarda o token num objeto de módulo (memória do JS) e
o expõe ao cliente HTTP por um **getter**. Não vai para `localStorage`, nem para
cookie, nem para `sessionStorage`.

Por quê: é decisão documentada do repositório (gap 17 do `CLAUDE.md`). Enquanto
a API roda com CORS `*` e sem rate limit no login, um token fora de storage não
é exfiltrável nem sobrevive ao fechamento da aba. **Não "melhore" isso para
localStorage** — o preço aceito é relogar depois de um refresh.

O que fica guardado é **o e-mail** (em `sessionStorage`, chave `trael-email`),
para o operador digitar só a senha. Senha e token, nunca.

Por que memória de módulo e não `useRef`: o cliente HTTP precisa ler o token de
forma síncrona, inclusive numa consulta disparada no primeiro render. Ler uma
ref durante o render é o que o React desaconselha, e um efeito chegaria tarde —
a chamada sairia sem `Authorization`.

### 3. Todo o app fica atrás de um portão de login

Todos os endpoints de domínio exigem JWT (`AuthGuard('jwt')` no backend). Em vez
de cada tela descobrir isso com um 401, `app/layout.tsx` envolve tudo em
`<PortaoDeAcesso>`: sem sessão, a única coisa na tela é o formulário.

### 4. Erro da API é dado traduzido, não exceção crua

A API responde erro no formato do boilerplate:

```json
{ "status": 422, "errors": { "etapaCodigo": "etapa-desconhecida: serigrafia" } }
```

O prefixo antes do `:` é um **código estável**. `lib/api.ts` normaliza tudo para
`ErroApi { status, codigo, mensagem, detalhe }`:

- `mensagem` — chão de fábrica: *"Esta etapa não existe no sistema. Confira o
  código da etapa configurado neste aparelho."*
- `detalhe` — o texto cru (`HTTP 422 — etapaCodigo: etapa-desconhecida:
  serigrafia`), exibido pequeno para o suporte.

`<AvisoDeErro erro={...} />` desenha os dois. Códigos traduzidos: etapa,
projeto, QR, evidência, peça e os genéricos do boilerplate — ver o mapa
`MENSAGENS` em `lib/api.ts`. Código sem tradução cai num texto honesto em vez de
inventar explicação.

### 5. A etapa é do APARELHO, não da tela

`lib/etapa.ts` resolve a etapa provisionada: `?etapa=<codigo>` na URL **vence** e
vira o padrão salvo em `localStorage`; sem ela, vale o que estiver salvo. É o
MVP da câmera fixa — cada celular é "o aparelho da serigrafia".

Implementado como **store externo** (`useSyncExternalStore`) e não
`useState` + efeito: `localStorage` e `location` não existem no render do
servidor, e o snapshot de servidor (`null`) casa com o primeiro render do
cliente, sem erro de hidratação. Como a fonte da verdade é o aparelho, trocar a
etapa numa tela atualiza todas.

A etapa é um **código** (`serigrafia`, `fixacao-placa`), nunca nome nem posição:
nome e ordem mudam, `codigo` não.

### 6. Cache de dados: React Query

`@tanstack/react-query` com `retry: 1` nas consultas e **`retry: 0` nas
mutations**. Isso é regra de negócio disfarçada de configuração: repetir a
conferência sozinho gastaria chamada paga de visão (constraint 4 do SPEC).
Nenhuma chamada de visão acontece fora de ação explícita do operador.

### 7. Cores semânticas fixas

As quatro cores do veredito são as mesmas da página `/demo` servida pela API —
quem viu a demo reconhece o estado antes de ler:

| Estado | Claro | Significado |
| --- | --- | --- |
| `conforme` | verde `#1e6b41` / `#e8f5ed` | bate com a etiqueta |
| `divergente` | vermelho `#b3261e` / `#fdecea` | a peça está gravada errada — pare a produção |
| `nao_conferivel` | âmbar `#8a5a00` / `#fff5e0` | não dá para afirmar; olho humano |
| `incoerencia` | violeta `#553091` / `#f1ecfb` | posições irmãs discordam entre si |

No tema escuro muda o **tom**, nunca a semântica. Tudo mora em `app/globals.css`
como CSS vars expostas ao Tailwind 4 via `@theme inline` — as telas usam
`bg-conforme-fundo`, `text-divergente` etc., nunca hex literal.

`divergente` ganha peso extra (borda dupla no selo): a divergência tem de ser
inconfundível a três metros.

### 8. Mobile-first de verdade

Alvo de toque mínimo 48px em todo botão; campos com `text-base` (abaixo de 16px
o Safari dá zoom ao focar e o operador perde o enquadramento); números em
`tabular-nums` (comparar `847233` × `847833` é o trabalho); tema claro/escuro
automático por `prefers-color-scheme`; `env(safe-area-inset-bottom)` no body.

---

## Mapa de arquivos

```
web/
├── app/
│   ├── layout.tsx          cabeçalho + provedores + portão de login
│   ├── page.tsx            home: 3 cartões + seletor de etapa
│   ├── globals.css         design tokens (cores, tema, tipografia)
│   ├── conferencia/        STUB — tela de conferência (T3.1–T3.3)
│   ├── passagem/           STUB — scan de passagem (T4.4, T4.6)
│   └── peca/               STUB — busca e histórico da peça (T4.5)
├── components/
│   ├── providers.tsx         QueryClientProvider + autenticação (token em memória)
│   ├── portao-de-acesso.tsx  gate de login + formulário
│   ├── cabecalho.tsx         logo, chip da etapa, sair
│   ├── seletor-de-etapa.tsx  provisionamento do aparelho
│   ├── qr-leitor.tsx         leitor de QR compartilhado
│   └── ui/                   kit: botão, cartão, selo, aviso, carregando, campo, chip
└── lib/
    ├── api.ts              cliente único da API (endpoints + erros traduzidos)
    ├── tipos.ts            tipos espelhando os DTOs reais do backend
    ├── etapa.ts            etapa provisionada do aparelho
    └── classes.ts          `juntarClasses`
```

---

## Contrato com a API

Base: `NEXT_PUBLIC_API_URL` ou `http://<host-da-página>:3001/api/v1`.
Autenticação: `Authorization: Bearer <token>` em tudo, menos no login.

| Função de `lib/api.ts` | Endpoint | Para quê |
| --- | --- | --- |
| `entrar` | `POST /auth/email/login` | sessão |
| `listarCheckpoints` | `GET /checkpoints` | etapas da linha, ordenadas |
| `obterPlanoDeFotos` | `GET /conferencias/plano-de-fotos` | **quais fotos tirar** nesta etapa |
| `enviarFotoEvidencia` | `POST /fotos-evidencia/upload` | multipart `file` + `fonteFisica` (com progresso) |
| `executarConferenciaComFotos` | `POST /conferencias/executar-com-fotos` | dispara a visão e o veredito |
| `executarConferencia` | `POST /conferencias/executar` | modo avançado, leituras digitadas |
| `lerVeredito` | `GET /conferencias/:id/campos` | releitura do veredito campo a campo |
| `registrarPassagem` | `POST /passagens/registrar` | scan no checkpoint (**devolve o alerta**) |
| `buscarPecaPorNumeroSerie` / `listarPecas` | `GET /transformadores` | achar a peça |
| `historicoDePassagens` | `GET /transformadores/:id/passagens` | ordem cronológica (critério 5) |
| `historicoDeConferencias` | `GET /transformadores/:id/conferencias` | mais recente primeiro (o alerta) |

Detalhes que **mudam a tela** e não são óbvios:

- **A URL da foto expira em 1 hora** sob `FILE_DRIVER=s3`. Não guarde em store
  de longa duração: recarregue a conferência para obter uma nova.
- **`motivo`, `incoerencias` e `achadosInconsistentes` só existem na resposta do
  POST** — a releitura não os traz (gap 22). Se a tela precisa mostrar o porquê,
  guarde a resposta do POST em estado.
- **Conferência parcial**: com `etapaAvaliada` preenchida, o `conforme` cobre só
  o recorte daquele gate — não atesta a peça inteira (gap 14). Exiba **sempre** a
  etapa junto do veredito.
- **`camposAvaliados` pode ser maior que `campos.length`**: item opcional sem
  valor esperado no QR é omitido pela engine.
- **`achadosInconsistentes` é alarme âmbar, nunca vermelho** — vermelho é do
  `divergente`.
- **Uma foto pode cobrir vários campos** (o topo tem série chumbada e patrimônio
  serigrafado): agrupe a captura por **vista**, como o plano de fotos manda.
- **Teto de 10 fotos por conferência** (`MAX_FOTOS_POR_CONFERENCIA`).

---

## O que as telas importam

```ts
// dados
import {
  entrar, listarCheckpoints, obterPlanoDeFotos, enviarFotoEvidencia,
  executarConferenciaComFotos, executarConferencia, lerVeredito,
  registrarPassagem, buscarPecaPorNumeroSerie, listarPecas,
  historicoDePassagens, historicoDeConferencias,
  ErroApi, ehErroApi, traduzirCodigo, baseDaApi,
} from "@/lib/api";

import type {
  Veredito, MotivoCampo, FonteFisica, TipoDeMarcacao,
  CampoExecutado, ResultadoExecucaoComExtracao, VereditoConferencia,
  PlanoDeFotos, ResultadoRegistroPassagem, PassagemResumo, ConferenciaResumo,
  Transformador, FotoEvidenciaEnviada,
} from "@/lib/tipos";
import {
  interpretarRegiaoLeitura, comoVeredito,
  ROTULO_FONTE_FISICA, FONTES_FISICAS, MAX_FOTOS_POR_CONFERENCIA,
} from "@/lib/tipos";

// estado de sessão e de aparelho
import { useAutenticacao, EMAIL_PADRAO } from "@/components/providers";
import { useEtapa } from "@/lib/etapa";

// UI
import {
  Botao, BotaoLink, Cartao, CabecalhoCartao, CartaoAcao,
  SeloVeredito, SeloIncoerencia, EXPLICACAO_VEREDITO,
  Aviso, AvisoDeErro, Carregando, CarregandoAcao, Esqueleto, BarraDeProgresso,
  CampoTexto, AreaTexto, Chip,
} from "@/components/ui";
import { QrLeitor } from "@/components/qr-leitor";
import { juntarClasses } from "@/lib/classes";
```

Regras de convivência entre os agentes de tela: **crie arquivos novos**, não
edite os da fundação. Precisa de um componente compartilhado novo? Coloque em
`components/` com nome próprio. Precisa de um endpoint que não está em
`lib/api.ts`? Ele provavelmente não deveria ser chamado direto — confira o DTO
no backend antes.

---

## O leitor de QR

`<QrLeitor aoLer={(payloadCru) => ...} />` — quatro caminhos, do melhor para o
mais teimoso, porque a etiqueta fica em peça suja sob luz ruim:

1. `BarcodeDetector` nativo (Android/Chrome) — decodifica no browser;
2. `jsQR` sobre frames do `<video>` (iOS/Safari), baixado **sob demanda**;
3. **foto** do QR pelo seletor de arquivo, decodificada pelo mesmo `jsQR` —
   quando a câmera é negada ou não existe;
4. **digitar/colar** o texto — sempre disponível.

Permissão negada, ausência de câmera e origem insegura têm mensagem específica
com o que fazer. A câmera é desligada ao desmontar e ao ler.

O componente entrega o **texto cru**. Ele não sabe (nem deve saber) o que é
número de série.
