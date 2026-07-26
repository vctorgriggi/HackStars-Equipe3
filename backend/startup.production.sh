#!/usr/bin/env bash
set -e

# ATENÇÃO (armadilha do boilerplate): `npm run migration:run` passa por
# `env-cmd`, que carrega o .env do diretório e SOBRESCREVE as variáveis já
# presentes no ambiente. Num container, isso faz a migration ignorar a
# configuração do serviço e tentar o host do arquivo de exemplo (`postgres`).
# Em produção a fonte da configuração é o AMBIENTE: chamamos o CLI do TypeORM
# direto, sem env-cmd. `seed:run:relational` e `start:prod` já usam o ambiente.
npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js \
  --dataSource=src/database/data-source.ts migration:run

# Seed idempotente (upsert por codigo): roda a cada deploy sem duplicar.
npm run seed:run:relational

npm run start:prod
