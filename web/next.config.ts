import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `export` gera o app inteiro como arquivos estáticos em out/ — todas as
  // rotas já são client-side (dados via React Query no navegador), então não
  // há nada de servidor a perder. O out/ é servido pela PRÓPRIA API NestJS em
  // /app (ServeStaticModule): mesmo domínio HTTPS do App Runner, câmera do
  // celular liberada, nenhum serviço novo. (O caminho App Runner dedicado com
  // `standalone` + Dockerfile.production falhou 2x sem log — fica documentado
  // no Dockerfile para retomada futura.)
  output: "export",
  // Cada rota vira pasta/index.html — é o que um servidor estático burro
  // resolve sem regra de rewrite.
  trailingSlash: true,
};

export default nextConfig;
