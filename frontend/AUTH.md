# AUTH.md

> Convenções de autenticação da plataforma administrativa (`/login`,
> `/admin/**`). Lido junto com @AGENTS.md e @DESIGN.md no início de toda
> sessão neste diretório. Escopo: só login + proteção de rota; painel
> administrativo de verdade é trabalho futuro.

## Por que BFF em vez de o Next chamar o backend do browser

O backend (`backend/src/auth`) fala Bearer-token-no-corpo-da-resposta — não
seta cookie, e o CORS em `backend/src/main.ts` (`cors: true`, padrão do Nest)
não é credentialed. Ou seja, o Nest não consegue setar cookie httpOnly
cross-origin para o front, e o browser não pode mandar cookie cross-origin
credentialed pra ele sem mudar o backend (fora de escopo).

Solução: os Route Handlers em `app/api/auth/*` chamam os endpoints do Nest
**server-side** (server-to-server, sem CORS envolvido) e o **próprio Next**
seta cookies httpOnly de primeira parte pro navegador. O browser nunca vê o
JWT — só fala com `/api/auth/*` do próprio Next, sempre same-origin.

```
browser --(cookie httpOnly, same-origin)--> Next Route Handler --(Bearer, server-to-server)--> NestJS
```

Não mexer no backend pra "resolver" isso de outro jeito (ex. CORS
credentialed + cookie no Nest) sem decisão explícita — o BFF já resolve sem
tocar lá.

## Cookies

- `trael_at` (access token) e `trael_rt` (refresh token): `httpOnly`,
  `sameSite: 'lax'`, `secure` só em produção, `path: '/'`. Nomes e opções em
  `lib/server/auth-cookies.ts` — única fonte, não duplicar em outro lugar.
- `sameSite: 'lax'`, não `'strict'`: `strict` quebraria abrir um link pra
  `/admin/...` vindo de fora (ex. colado no Slack) mesmo já logado — o cookie
  não seria enviado na navegação top-level cross-site.
- `maxAge` de `trael_at` vem do `tokenExpires` (epoch ms) que a API devolve.
  `trael_rt` usa um teto **próprio** de 30 dias — independente da validade
  real do JWT de refresh no backend (3650 dias em dev). Não ler o `maxAge` do
  cookie como "quanto tempo o token dura": é só política de quando o browser
  para de mandar o cookie.

## Estratégia de refresh: client-driven, não Server Component

Server Component não consegue setar cookie (só Server Action ou Route
Handler podem). Por isso:

- `app/admin/page.tsx` faz uma tentativa simples com o `trael_at` atual e
  redireciona pra `/login` se expirado — **sem** tentar refresh nessa camada.
- Quem tenta refresh é `lib/auth/use-session.ts` no client: `GET
  /api/auth/me` → 401 → `POST /api/auth/refresh` → repete `GET
  /api/auth/me` uma vez → se ainda falhar, é deslogado (retorna `null`, não
  lança erro — deslogado é um estado válido, não uma falha).
- Tradeoff aceito: com token de 15 min, o pior caso é `/admin` pedir login de
  novo num hard-reload fora da janela de 15 min. Não é uma experiência
  quebrada, só sub-ótima nesse extremo — mesmo padrão dos "Gaps conhecidos"
  do `CLAUDE.md` raiz. Se isso incomodar no futuro, a saída é mover o
  primeiro fetch de `/admin` para um Client Component que usa
  `useSession()`, não reimplementar refresh em Server Component.

## CSRF

`sameSite=lax` já neutraliza CSRF cross-site contra `logout`/`refresh` (sem
cookie enviado, a rota não faz nada). `login` não depende de cookie
existente, então um POST cross-site ainda seria aceito e o `Set-Cookie` da
resposta seria honrado (`SameSite` não filtra `Set-Cookie` de resposta, só
envio de cookie já existente) — "login CSRF" clássico. Mitigação: os três
Route Handlers POST (`login`, `logout`, `refresh`) checam o header `Origin`
(quando presente) contra a própria origem via `isSameOriginRequest` em
`lib/server/auth-cookies.ts`. Não é um token CSRF dedicado — seria
over-engineering pra esse risco (nenhum dado cross-origin é exfiltrado,
só força uma sessão logada indesejada).

## Cor do erro de login

Estado de erro do formulário de login usa `reading-mismatch`/
`reading-mismatch-soft` (design system TRAEL Vision, ver `DESIGN.md`) — não
`--color-divergente`. `divergente` é reservado pelo `DESIGN.md` para o
significado específico de veredito de conferência; `reading-mismatch` é o
vocabulário genérico do design system para "vermelho de problema", o mesmo
raciocínio de não reaproveitar um token de propósito específico para outro
significado. Antes do design system existir, esse gap era coberto por um
token próprio (`--color-erro`) — retirado quando `reading-mismatch` passou a
cobrir exatamente o mesmo caso, para não manter dois tokens vermelhos
paralelos com o mesmo significado.

## Exceção ao mobile-first "sem breakpoint"

`DESIGN.md` diz pra não usar breakpoint a menos que uma tela realmente
precise de layout diferente em desktop. `/login` é a primeira exceção
documentada: ao contrário do operador de linha (só celular), quem usa a
plataforma administrativa também usa desktop/laptop com frequência — um
formulário de login esticado `100vw` numa tela grande é genuinely pior que um
cartão centralizado. Por isso `app/login/page.tsx` e `login-form.tsx` usam
`sm:mx-auto sm:max-w-sm` (cartão) por cima da base mobile de coluna única.
Não generalizar essa exceção pra outras telas sem o mesmo raciocínio.

## Proteção de rota: `proxy.ts`

Next 16 renomeou `middleware.ts` → `proxy.ts` (export `proxy`, sempre runtime
Node). `frontend/proxy.ts` faz só a checagem **otimista**: `/admin/**` sem
`trael_at` → redireciona pra `/login?next=<path>`; `/login` com `trael_at` →
redireciona pra `/admin`. Não chama o backend nem decodifica o JWT — a
checagem real é o fetch em `app/admin/page.tsx` e a dança de `useSession`.

## Escopo explicitamente fora

Sem RolesGuard (gap #1 do `CLAUDE.md` raiz continua aberto — qualquer JWT
ainda edita/deleta tudo no CRUD de domínio), sem registro/esqueci-senha, sem
dashboard/CRUD administrativo de verdade — `/admin` é só a prova de que a
proteção funciona.
