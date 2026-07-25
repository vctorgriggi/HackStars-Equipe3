# DESIGN.md

> Tokens e convenções visuais do `frontend`. Fonte única dos tokens é
> `app/globals.css` (bloco `@theme`); este arquivo documenta o porquê e como
> usar — não duplica valor, referencia o nome do token.

Lido junto com @AGENTS.md no início de toda sessão neste diretório.

## Princípio: mobile-first de verdade

O usuário real é o operador de linha com o celular numa mão e a peça (ou a
câmera) na outra, em chão de fábrica. Escrever a classe sem prefixo pensando
no celular; `sm:`/`md:`/`lg:` só entram se uma tela realmente precisar de
layout diferente em desktop — não escrever "pensando grande e encolhendo".

- **Alvo de toque mínimo 48px** (`h-12`/`min-h-12` ou padding equivalente,
  `py-3` com texto) em qualquer elemento tocável — o operador pode estar com
  luva ou o dedo suado.
- **Ação primária de cada tela é `w-full`**, alto contraste, e fica perto do
  polegar (fim do fluxo vertical, não escondida no topo).
- **Coluna única.** Nada de grid/multi-coluna abaixo de `sm` — o layout é uma
  sequência vertical de passos (ler QR → fotografar → veredito).

## Cores semânticas do veredito

O front nunca calcula veredito (regra de ouro, CLAUDE.md raiz) — só mapeia as
3 strings que a API devolve para uma cor. Os tokens abaixo são a ÚNICA fonte
de cor para esse mapeamento; nunca usar `text-green-600`/`text-red-600` etc.
soltos num componente novo — isso é o que este arquivo existe para evitar.

| Veredito (valor da API) | Token CSS         | Utilities Tailwind                          | Uso                                  |
| ------------------------ | ------------------ | -------------------------------------------- | ------------------------------------- |
| `conforme`                | `--color-conforme`         | `bg-conforme`, `text-conforme`, `border-conforme`         | campo/veredito ok                    |
| `divergente`               | `--color-divergente`       | `bg-divergente`, `text-divergente`, `border-divergente`   | alerta — precisa ser inconfundível (SPEC critério 6) |
| `nao_conferivel`           | `--color-nao-conferivel`   | `bg-nao-conferivel`, `text-nao-conferivel`, `border-nao-conferivel` | ilegível/baixa confiança — nunca vira `conforme` |

Se a API algum dia devolver um 4º valor, é bug do contrato, não caso novo de
cor a inventar no front.

## Tipografia

- `font-sans` (Geist, já configurado) é o padrão; não introduzir outra
  família sem necessidade.
- `text-base` (16px) é o mínimo para qualquer texto que o operador precisa
  ler para decidir uma ação — nada abaixo de `text-sm` em conteúdo decisório
  (veredito, alerta). `text-sm`/`text-xs` só para metadado auxiliar (timestamp,
  status técnico).

## Dark mode

`globals.css` já resolve automaticamente via `prefers-color-scheme` — todo
token novo (como os de veredito) precisa de valor claro E escuro no mesmo
lugar. Nunca fixar um hex direto num componente; se a cor não existe como
token, ela entra em `globals.css` antes de ser usada.

## Convenções de componente (ainda não uma biblioteca)

Não estamos criando `components/ui` antecipadamente — três telas não
justificam isso ainda (ver CLAUDE.md raiz, "não desenhar para requisito
hipotético"). Os padrões abaixo são para repetir por convenção manual até um
padrão real emergir na Fase 3:

- **Indicador de status** (como o `apiStatus` em `app/conferencia/page.tsx`):
  texto colorido pelo token semântico correspondente, nunca cor ad-hoc.
- **Botão de ação primária**: `w-full`, `min-h-12`, texto `text-base` ou
  maior.
- **Estado de carregamento/indisponível**: mesmo padrão de 3 estados já usado
  (`verificando`/`online`/`offline`) — reaproveitar para permissão de
  câmera, upload em andamento, etc.

Se a Fase 3 repetir o mesmo JSX de badge/botão em 3+ telas, aí sim vira
componente em `components/` — não antes.
