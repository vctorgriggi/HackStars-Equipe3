/**
 * Spike do DISCRIMINADOR TINTA x RELEVO — calibracao com as fotos reais.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/spike-contraste.ts <dir-fotos>
 *
 * O que ele faz, por foto:
 *   1. UMA chamada `detect-document-text` (cacheavel: `SPIKE_CACHE_DIR=<dir>`
 *      guarda e reusa a resposta, para recalibrar limiar sem pagar de novo);
 *   2. mede a luminancia DENTRO de cada bounding box e no ANEL em volta
 *      (`ImagemRecortavel.medirRegiao`, o mesmo codigo que roda em producao);
 *   3. classifica com `classificarMarcacao` e imprime a tabela que sustenta os
 *      limiares de `src/extracao/adapters/contraste.ts`;
 *   4. roda o adapter INTEIRO com os alvos da checklist do seed para aquela
 *      vista, mostrando o que a foto resolve de verdade.
 *
 * Os numeros da tabela de calibracao vivem em `contraste.ts` e em
 * docs/visao-ocr.md; este script e como se reproduz os dois.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { config as carregarDotenv } from 'dotenv';
import {
  Block,
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract';

import {
  ClasseDeContraste,
  claridadeRelativa,
  classificarMarcacao,
  escuridaoRelativa,
} from '../src/extracao/adapters/contraste';
import { abrirImagem, lerCaixa } from '../src/extracao/adapters/recorte';
import { TextractExtractor } from '../src/extracao/adapters/textract.extractor';
import { resolverRegiao } from '../src/extracao/adapters/bedrock.extractor';
import { CampoAlvo, FonteImagem } from '../src/extracao/ports/extractor.port';

carregarDotenv();

/**
 * O boilerplate guarda a credencial como ACCESS_KEY_ID/SECRET_ACCESS_KEY (nomes
 * do modulo files), mas o SDK da AWS le AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.
 */
function alinharCredenciais(): void {
  if (!process.env.AWS_ACCESS_KEY_ID && process.env.ACCESS_KEY_ID) {
    process.env.AWS_ACCESS_KEY_ID = process.env.ACCESS_KEY_ID;
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY && process.env.SECRET_ACCESS_KEY) {
    process.env.AWS_SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY;
  }
}

/**
 * Fotos da peca de demo -> vista. As fotos de `fotos-demo/` vieram do celular
 * com o nome da tomada, nao com o nome canonico da `FonteFisica`.
 */
const VISTA_POR_ARQUIVO: { padrao: RegExp; vista: string }[] = [
  { padrao: /^topo/i, vista: 'topo' },
  { padrao: /^frente/i, vista: 'frente' },
  { padrao: /^diagonal-traseira/i, vista: 'traseira' },
  { padrao: /^traseira/i, vista: 'traseira' },
  { padrao: /^lateral-direita/i, vista: 'lateral-direita' },
  { padrao: /^lateral-esquerda/i, vista: 'lateral-esquerda' },
  { padrao: /^base/i, vista: 'base' },
  { padrao: /^placa/i, vista: 'placa' },
  { padrao: /^etiqueta/i, vista: 'etiqueta' },
];

/** Checklist da peca de demo (mesma do seed do ProjetoModelo EPT-163-PI-676). */
const CHECKLIST: { campo: string; fonteFisica: string }[] = [
  { campo: 'serie-chumbada-topo', fonteFisica: 'topo' },
  { campo: 'serie-chumbada-lateral-direita', fonteFisica: 'lateral-direita' },
  { campo: 'serie-chumbada-traseira', fonteFisica: 'traseira' },
  { campo: 'patrimonio-serigrafia-topo', fonteFisica: 'topo' },
  { campo: 'patrimonio-serigrafia-frente', fonteFisica: 'frente' },
  { campo: 'cliente-serigrafia-frente', fonteFisica: 'frente' },
  { campo: 'potencia-serigrafia-frente', fonteFisica: 'frente' },
  { campo: 'serie-placa', fonteFisica: 'placa' },
  { campo: 'patrimonio-placa', fonteFisica: 'placa' },
];

function vistaDe(arquivo: string): string {
  return (
    VISTA_POR_ARQUIVO.find((item) => item.padrao.test(arquivo))?.vista ??
    'geral'
  );
}

function alvosDa(vista: string): CampoAlvo[] {
  return CHECKLIST.filter((item) => item.fonteFisica === vista).map((item) => ({
    campo: item.campo,
  }));
}

async function blocosDe(
  cliente: TextractClient,
  arquivo: string,
  imagem: Buffer,
): Promise<Block[]> {
  const cacheDir = process.env.SPIKE_CACHE_DIR;
  const cache =
    cacheDir === undefined ? null : join(cacheDir, `textract-${arquivo}.json`);

  if (cache !== null && existsSync(cache)) {
    return JSON.parse(readFileSync(cache, 'utf8')).Blocks as Block[];
  }

  const resposta = await cliente.send(
    new DetectDocumentTextCommand({
      Document: { Bytes: new Uint8Array(imagem) },
    }),
  );

  if (cache !== null) {
    mkdirSync(cacheDir as string, { recursive: true });
    writeFileSync(cache, JSON.stringify(resposta));
  }

  return resposta.Blocks ?? [];
}

/** Linhas com numero de 6+ digitos: as unicas que o passo 3 pode disputar. */
const PADRAO_NUMERO = /\d{6,}/;

interface LinhaMedida {
  texto: string;
  confianca: number;
  escuridao: number;
  claridade: number;
  desvio: number;
  pixels: number;
  classe: ClasseDeContraste;
}

async function medirLinhas(
  imagem: Buffer,
  blocos: Block[],
  soNumericas: boolean,
): Promise<LinhaMedida[]> {
  const recortavel = await abrirImagem(imagem);
  if (recortavel === null) {
    throw new Error('sharp indisponivel: nao da para calibrar sem ler pixel');
  }

  const medidas: LinhaMedida[] = [];

  for (const bloco of blocos) {
    if (bloco.BlockType !== 'LINE') {
      continue;
    }
    const texto = (bloco.Text ?? '').trim();
    if (soNumericas && !PADRAO_NUMERO.test(texto)) {
      continue;
    }

    const caixaBruta = bloco.Geometry?.BoundingBox;
    const caixa =
      caixaBruta === undefined ? null : lerCaixa(JSON.stringify(caixaBruta));
    if (caixa === null) {
      continue;
    }

    const estatisticas = await recortavel.medirRegiao(caixa);
    if (estatisticas === null) {
      continue;
    }

    medidas.push({
      texto,
      confianca: (bloco.Confidence ?? 0) / 100,
      escuridao: escuridaoRelativa(estatisticas),
      claridade: claridadeRelativa(estatisticas),
      desvio: estatisticas.dentro.desvio,
      pixels: estatisticas.dentro.pixels,
      classe: classificarMarcacao(estatisticas),
    });
  }

  return medidas;
}

function imprimirTabela(arquivo: string, medidas: LinhaMedida[]): void {
  console.log(`\n### ${arquivo}`);
  console.log(
    '| texto | conf | escuridao | claridade | desvio | px | classe |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const medida of medidas) {
    console.log(
      `| ${medida.texto} | ${(medida.confianca * 100).toFixed(1)}% | ` +
        `${medida.escuridao.toFixed(3)} | ${medida.claridade.toFixed(3)} | ` +
        `${medida.desvio.toFixed(1)} | ${medida.pixels} | ${medida.classe} |`,
    );
  }
}

async function main(): Promise<void> {
  const dir = process.argv[2];
  if (dir === undefined) {
    console.error(
      'uso: npx ts-node -r tsconfig-paths/register ' +
        'scripts/spike-contraste.ts <dir-fotos>',
    );
    process.exit(1);
  }

  alinharCredenciais();
  const soNumericas = process.env.SPIKE_TODAS_AS_LINHAS !== 'sim';
  const cliente = new TextractClient({ region: resolverRegiao() });
  const extrator = new TextractExtractor(resolverRegiao());
  const { readdirSync } = await import('node:fs');
  const arquivos = readdirSync(dir)
    .filter((arquivo) => /\.(jpe?g|png)$/i.test(arquivo))
    .sort();

  for (const arquivo of arquivos) {
    const imagem = readFileSync(join(dir, arquivo));
    const vista = vistaDe(arquivo);
    const blocos = await blocosDe(cliente, arquivo, imagem);

    imprimirTabela(
      `${arquivo} (vista: ${vista})`,
      await medirLinhas(imagem, blocos, soNumericas),
    );

    const alvos = alvosDa(vista);
    if (alvos.length === 0) {
      console.log(`  (a checklist do seed nao pede campo nenhum em ${vista})`);
      continue;
    }

    const fonte: FonteImagem = {
      fotoEvidenciaId: arquivo,
      fonteFisica: vista,
      imagem,
      mimeType: 'image/jpeg',
    };
    const { leituras } = await extrator.extrair(fonte, alvos);
    console.log('  leituras do adapter:');
    for (const leitura of leituras) {
      const confianca =
        leitura.confianca === null
          ? '—'
          : `${(leitura.confianca * 100).toFixed(1)}%`;
      console.log(
        `    ${leitura.campo} = ${leitura.valorLido ?? 'null'} ` +
          `(${confianca}${
            leitura.corroboracao === undefined
              ? ''
              : `, ${leitura.corroboracao}`
          })`,
      );
    }
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
