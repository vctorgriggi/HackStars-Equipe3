/**
 * Junta classes do Tailwind ignorando `false`/`null`/`undefined`.
 *
 * Deliberadamente minúsculo: não é `clsx` nem faz merge de conflito. O kit em
 * `components/ui` já resolve variantes, então o que sobra aqui é concatenação.
 */
export function juntarClasses(
  ...partes: Array<string | false | null | undefined>
): string {
  return partes.filter(Boolean).join(" ");
}
