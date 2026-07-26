// Latência artificial dos acessores mock — sem ela os skeletons nunca
// aparecem em dev e o estado de loading é shipado sem teste.
export function delay(ms = 120): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
