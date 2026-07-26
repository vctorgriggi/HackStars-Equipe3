# Deploy — API no ar na AWS

> Como a API do TRAEL Conferência sobe na AWS: arquitetura escolhida, os
> comandos que produzem o ambiente e como refazer o deploy quando o código
> mudar. Atualizar quando a topologia mudar (novo serviço, nova variável).

## Arquitetura

| Serviço | Papel | Por que este |
| --- | --- | --- |
| ECR (`trael-api`) | Registry da imagem Docker | Pré-requisito do App Runner |
| App Runner (`trael-api`) | Roda o container da API | HTTPS gerenciado, escala e deploy sem servidor para administrar; a Fase 3 precisa de HTTPS (câmera do navegador só funciona em origem segura) |
| RDS `database-1` | PostgreSQL da API no ar | Já existia na conta; público, alcançável pelo App Runner |
| S3 `trael` | Fotos de evidência | `FILE_DRIVER=s3`, URL assinada de 1h |
| IAM `TraelApiInstanceRole` | Credencial da app em runtime | S3/Textract/Bedrock **sem chave em variável de ambiente** |
| IAM `TraelAppRunnerECRAccess` | App Runner puxa a imagem | Exigência do serviço para ECR privado |

Descartados: Lambda (NestJS exige adaptação e sofre cold start), ECS Fargate e
Elastic Beanstalk (mais peças móveis sem ganho no prazo do hackathon).

## Artefatos no repositório

- `backend/Dockerfile.production` — imagem de produção. As variáveis vêm da
  configuração do serviço; o `.env` do repo fica fora da imagem porque
  **`backend/.dockerignore` o exclui do contexto de build**.
  Quem garante isso é o `.dockerignore`, não o `rm -f .env` do Dockerfile:
  camada Docker é aditiva, então apagar o arquivo num passo posterior o
  mantém recuperável da camada do `COPY .`. Isso vazou credencial real para
  a imagem até 2026-07-25 (achado da auditoria de documentação; o ECR é
  privado à conta, então a exposição ficou contida, mas as chaves são as de
  root — trocá-las está no hardening pós-demo).
- `backend/startup.production.sh` — `migration:run` → `seed:run:relational`
  (idempotente, upsert por código) → `start:prod`. Sem `wait-for-it`: o banco
  é o RDS; se ele não responder, a migration falha alto e o deploy é marcado
  como falho — melhor que uma API no ar sem schema.

## Primeiro deploy (feito uma vez)

```bash
cd backend
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_DEFAULT_REGION=us-east-1

# 1. Registry
aws ecr create-repository --repository-name trael-api

# 2. Roles (acesso ao ECR + credencial de runtime da app)
aws iam create-role --role-name TraelAppRunnerECRAccess \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"build.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name TraelAppRunnerECRAccess \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess
aws iam create-role --role-name TraelApiInstanceRole \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"tasks.apprunner.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
# política mínima: s3 (bucket trael), textract, bedrock — ver histórico do git
aws iam put-role-policy --role-name TraelApiInstanceRole --policy-name TraelApiAcessoServicos --policy-document '...'

# 3. Imagem (App Runner é x86_64 — build cruzado no Mac ARM).
# As flags NÃO são opcionais: sem elas o deploy falha SEM LOG (armadilhas 2 e 3).
aws ecr get-login-password | docker login --username AWS --password-stdin \
  <conta>.dkr.ecr.us-east-1.amazonaws.com
docker buildx build --platform linux/amd64 --provenance=false --sbom=false \
  --output type=image,name=<conta>.dkr.ecr.us-east-1.amazonaws.com/trael-api:latest,push=true,oci-mediatypes=false \
  -f Dockerfile.production .

# 4. Serviço (config gerada a partir do backend/.env; sem chaves AWS dentro)
aws apprunner create-service --cli-input-json file://apprunner-service.json
```

## Redeploy (a cada mudança de código)

```bash
cd backend
docker buildx build --platform linux/amd64 --provenance=false --sbom=false \
  --output type=image,name=<conta>.dkr.ecr.us-east-1.amazonaws.com/trael-api:latest,push=true,oci-mediatypes=false \
  -f Dockerfile.production .
aws apprunner start-deployment --service-arn <arn-do-servico>
```

As flags do `buildx` são obrigatórias (armadilhas 2 e 3) e o
`start-deployment` é um passo separado do `update-service` (armadilha 5) —
seguir a receita sem elas reproduz exatamente as falhas silenciosas que
custaram 6 tentativas.

`AutoDeploymentsEnabled` está **desligado** de propósito: push acidental de
imagem não derruba a demo; o deploy é sempre um ato explícito.

## O app web/ dentro da mesma imagem (`/app`)

O frontend de produção (`web/`, Next.js) é 100% client-side e viaja DENTRO da
imagem da API como export estático, servido pelo `ServeStaticModule` em
`/app` — mesmo domínio HTTPS (câmera do celular exige origem segura), nenhum
serviço novo. O redeploy da API ganha um pré-passo:

```bash
cd web && NEXT_PUBLIC_API_URL=https://qzat8cp2m8.us-east-1.awsapprunner.com/api/v1 npm run build
rm -rf ../backend/web-app && cp -r out ../backend/web-app   # artefato de build, fora do git
# ...e segue o redeploy normal do backend (buildx + start-deployment acima)
```

ATENÇÃO: `NEXT_PUBLIC_*` é embutido NO BUILD do Next — trocar a URL da API
exige rebuildar o `web/`, não adianta mexer em variável do serviço. Histórico:
um App Runner dedicado (`trael-web`, imagem em `web/Dockerfile.production`)
falhou DUAS vezes na criação sem uma linha de log de aplicação, com a mesma
imagem rodando localmente — serviço deletado; o Dockerfile fica para retomada
futura com mais calma.

## Variáveis do serviço

Vêm do `backend/.env` local pelo script de montagem da config e ficam na
configuração do App Runner. Diferenças em relação ao ambiente de dev:

| Variável | Valor no ar | Motivo |
| --- | --- | --- |
| `DATABASE_HOST` | endpoint do RDS | banco compartilhado |
| `DATABASE_SSL_ENABLED` | `true` | RDS exige TLS (local, `false`) |
| `FILE_DRIVER` | `s3` | evidências no bucket |
| `EXTRACTOR_DRIVER` | `textract` | escolhido no spike T2.1; `mock` continua sendo o default do código |
| `EXTRACAO_RECORTE` | ausente (= ligado) | `off` desliga a corroboração por recorte da série chumbada sem rebuild — botão de pânico se a lib nativa (`sharp`) se comportar mal no ar. Desligado, o adapter volta a 1 chamada por foto e a leitura em relevo deixa de poder acusar `divergente` (vira `nao_conferivel`) |
| `ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` | **ausentes** | credencial vem da instance role |
| `NODE_ENV` | `production` | |

`BACKEND_DOMAIN` nasce apontando para localhost porque a URL pública só existe
depois do primeiro deploy; com `FILE_DRIVER=s3` a URL de evidência é assinada
e não depende dele. Ao ajustar, use `aws apprunner update-service`.

## URL no ar

**https://qzat8cp2m8.us-east-1.awsapprunner.com** — verificada em 2026-07-25:
health 200, login do admin seed, Swagger em `/docs`, cenário-âncora
respondendo `divergente` só em `serie-placa` (7 campos no RDS) e upload de
foto com URL assinada do S3 abrindo no navegador.

Com `EXTRACTOR_DRIVER=textract` (mesma data), o ciclo completo no ar: upload de
`PLACA-4.jpg` → `POST /conferencias/executar-com-fotos` → Textract leu `847833`
com 99,87% de confiança contra o `847233` da etiqueta, veredito `divergente`
só em `serie-placa` e os campos sem foto em `nao_conferivel`. É o critério de
aceitação 2 do SPEC passando com visão real, sem leitura digitada.

## Cinco armadilhas do caminho (custaram 6 tentativas)

1. **`env-cmd` sobrescreve a configuração do serviço.** `npm run
   migration:run` carrega o `.env` do diretório e ele VENCE as variáveis de
   ambiente — a migration ia para o host `postgres` do arquivo de exemplo.
   Correção: chamar o CLI do TypeORM direto e remover o `.env` da imagem.
2. **Atestações do buildx.** O `buildx` publica provenance/SBOM junto com a
   imagem; o App Runner puxa e falha sem log. Correção: `--provenance=false
   --sbom=false`.
3. **Media type OCI.** O App Runner exige manifest `docker.v2`; o buildx
   publica OCI por padrão. Correção: `--output type=registry,oci-mediatypes=false`.
4. **Config do boilerplate exige as chaves AWS.** Com `FILE_DRIVER=s3`,
   `files/config/file.config.ts` valida `ACCESS_KEY_ID`/`SECRET_ACCESS_KEY`
   como obrigatórias — sem elas o boot morre ANTES do primeiro log (o que
   explica as tentativas sem nenhum log de aplicação). Correção: as chaves
   entram na configuração do serviço. Dívida registrada: para o S3 usar a
   instance role como Textract/Bedrock já usam, é preciso tornar as
   credenciais opcionais no boilerplate (4 arquivos).
5. **`update-service` redeploya o digest antigo.** Mudar variável de ambiente
   dispara um deploy, mas ele **reusa a imagem já resolvida** — o serviço
   volta a `RUNNING` com código velho e sem erro nenhum. Sintoma: a env nova
   está aplicada e o comportamento não mudou. Correção: `update-service` e
   `start-deployment` são passos distintos; depois de subir imagem, sempre
   `start-deployment` (é o único que puxa a tag `:latest` de novo).

## Verificação pós-deploy

```bash
BASE=https://qzat8cp2m8.us-east-1.awsapprunner.com
curl -s $BASE/                                   # {"name":"NestJS API"}
TOKEN=$(curl -s -X POST $BASE/api/v1/auth/email/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"secret"}' | jq -r .token)
curl -s $BASE/api/v1/checkpoints -H "Authorization: Bearer $TOKEN"   # 4 etapas
# cenário-âncora completo: ver README.md
```

## Custo e higiene

- App Runner cobra por vCPU/memória ativos — **pausar o serviço**
  (`aws apprunner pause-service`) fora das janelas de trabalho economiza
  crédito; retomar leva ~1 min.
- RDS `database-1` é `db.r7g.large`, porte alto para o hackathon: reduzir para
  `db.t4g.micro` ou parar quando não estiver em uso.
- Existe uma instância Aurora órfã parada (`database-1-instance-1`) que pode
  ser deletada — cobra storage sem uso.
- A chave root nas variáveis locais deve ser trocada por um IAM user de
  aplicação antes de qualquer uso fora do hackathon (a app no ar já não usa
  chave nenhuma).
