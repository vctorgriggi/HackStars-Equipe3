"use client";

/**
 * O que faz o painel parecer VIVO — e as três honestidades que isso exige.
 *
 * Esta tela é de telão: fica aberta na parede, ninguém toca nela, e ela se
 * atualiza sozinha. Isso cria um risco novo, que não existe numa tela que só
 * carrega quando alguém pede: **número parado parecendo número de agora**. As
 * peças abaixo existem para fechar esse buraco, nenhuma delas decide nada.
 *
 * 1. `PontoAoVivo` — diz que o relógio está andando. Quando a atualização
 *    automática para (a última tentativa falhou), o ponto para de pulsar e
 *    muda de cor: a faixa âmbar continua sendo quem manda na mensagem, o ponto
 *    só não pode ficar mentindo "ao vivo" em cima dela;
 * 2. `useDestaqueDeMudanca` + `DestaqueDeMudanca` — quando um número MUDA, ele
 *    pisca. Sem isso, uma tela que se atualiza sozinha é indistinguível de uma
 *    tela congelada, e a mudança que importa (uma divergência a mais) passa
 *    despercebida por quem estava olhando para outro tile;
 * 3. `prefers-reduced-motion` desliga as duas animações. O dado nunca depende
 *    do movimento: o ponto continua lá, o número continua lá.
 *
 * REGRA DE OURO: a comparação daqui é de **texto exibido**, não de negócio.
 * O hook recebe a string que o tile já mostra (`"1.284"`) e responde "mudou ou
 * não mudou" — ele não sabe o que o número conta, não soma, não compara campo
 * e não deriva veredito nenhum. Trocar isso por "comparar o valor anterior e
 * decidir se piorou" seria regra de negócio nascendo no cliente.
 */

import { useEffect, useRef, useState } from "react";

import { juntarClasses } from "@/lib/classes";

/* ------------------------------------------------------------------ *
 * Estilos das animações
 * ------------------------------------------------------------------ */

/**
 * O keyframe do destaque mora aqui, e não no `globals.css`, de propósito: é a
 * única animação do app que pertence a UM componente. Colocada com
 * `href` + `precedence`, o React 19 içá a tag para o `<head>` e a deduplica —
 * seis tiles renderizando o mesmo `<style>` produzem uma regra só.
 *
 * O `ease-out` importa: o pico do destaque é instantâneo (o olho é atraído no
 * quadro em que o número trocou) e o esmaecer é longo, para quem olhou meio
 * segundo depois ainda ver que ali mexeu.
 */
const CSS_DAS_ANIMACOES = `
@keyframes trael-destaque {
  from { opacity: 0.32; }
  to   { opacity: 0; }
}
.trael-destaque {
  animation: trael-destaque 1500ms ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .trael-destaque { animation: none; opacity: 0; }
}
`;

export function EstilosAoVivo() {
  return (
    <style href="trael-ao-vivo" precedence="medium">
      {CSS_DAS_ANIMACOES}
    </style>
  );
}

/* ------------------------------------------------------------------ *
 * Ponto "ao vivo"
 * ------------------------------------------------------------------ */

/**
 * Ponto pulsante ao lado da hora da última carga.
 *
 * Pulso em CSS puro (`animate-ping` do Tailwind sobre um halo, com o ponto
 * sólido por cima) — nenhuma lib e nenhum timer em JS para uma decoração.
 * O halo some inteiro em `motion-reduce`: parado, ele viraria um anel estático
 * que parece outro estado.
 */
export function PontoAoVivo({
  ativo,
  className,
}: {
  /** `false` quando a atualização automática não está entregando (erro). */
  ativo: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={juntarClasses(
        "relative inline-flex size-2 shrink-0 items-center justify-center",
        className,
      )}
    >
      {ativo ? (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-acento opacity-70 motion-reduce:hidden" />
      ) : null}
      <span
        className={juntarClasses(
          "relative inline-flex size-2 rounded-full",
          ativo ? "bg-acento" : "bg-nao-conferivel",
        )}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Destaque de mudança
 * ------------------------------------------------------------------ */

/**
 * Devolve uma GERAÇÃO que incrementa toda vez que o texto exibido muda.
 *
 * `0` = nada a destacar (primeira carga inclusive: a chegada do dado não é
 * "mudança", é a tela nascendo — piscar tudo na abertura ensinaria o olho a
 * ignorar o destaque). A geração serve de `key` do elemento de destaque, e é o
 * remount que reinicia a animação — a alternativa (alternar classe) não
 * reinicia um keyframe que já rodou.
 *
 * A comparação usa uma `ref` e acontece em efeito, nunca no corpo do render:
 * render tem de ser puro, e comparar-e-gravar durante ele quebraria no
 * StrictMode (duas execuções) exatamente onde o bug seria invisível.
 */
export function useDestaqueDeMudanca(textoExibido: string): number {
  const anterior = useRef<string | null>(null);
  const [geracao, setGeracao] = useState(0);

  useEffect(() => {
    if (anterior.current === null) {
      anterior.current = textoExibido;
      return;
    }
    if (anterior.current === textoExibido) return;

    anterior.current = textoExibido;
    setGeracao((atual) => atual + 1);
  }, [textoExibido]);

  return geracao;
}

/** Tons do destaque: a cor do próprio estado, nunca uma cor "de sistema". */
export type TomDoDestaque =
  | "neutro"
  | "divergente"
  | "nao_conferivel"
  | "conforme";

const COR: Record<TomDoDestaque, string> = {
  neutro: "bg-acento",
  divergente: "bg-divergente",
  nao_conferivel: "bg-nao-conferivel",
  conforme: "bg-conforme",
};

/**
 * A camada que pisca. Fica ATRÁS do conteúdo (`-z-10` dentro de um `isolate`
 * do pai): tingir o número por 1,5 s deixaria ilegível justamente o número que
 * o destaque quer mostrar.
 *
 * O pai precisa ser `relative isolate overflow-hidden`.
 */
export function DestaqueDeMudanca({
  geracao,
  tom = "neutro",
  className,
}: {
  /** Vindo de `useDestaqueDeMudanca`; `0` não desenha nada. */
  geracao: number;
  tom?: TomDoDestaque;
  className?: string;
}) {
  if (geracao === 0) return null;

  return (
    <span
      key={geracao}
      aria-hidden
      className={juntarClasses(
        "trael-destaque pointer-events-none absolute inset-0 -z-10",
        COR[tom],
        className,
      )}
    />
  );
}
