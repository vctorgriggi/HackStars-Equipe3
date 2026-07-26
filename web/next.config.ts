import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` produz um servidor autocontido em .next/standalone — é o que
  // o Dockerfile.production copia. Sem isso a imagem precisaria do
  // node_modules inteiro (~10x o tamanho) para servir a mesma coisa.
  output: "standalone",
};

export default nextConfig;
