/**
 * Spike T2.1 — Textract x Bedrock nas fotos da peca de demo.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register scripts/spike-extracao.ts <dir-fotos> [textract|bedrock|ambos]
 *
 * As fotos sao lidas pelo NOME, que precisa ser a fonte fisica — hoje a VISTA
 * da peca (ver `FonteFisica` em src/extracao/ports/extractor.port.ts):
 *   topo.jpg  frente.jpg  traseira.jpg  lateral-esquerda.jpg
 *   lateral-direita.jpg  base.jpg  placa.jpg  etiqueta.jpg  geral.jpg
 *                                        (aceita .jpg, .jpeg e .png)
 *
 * Roda os adapters DIRETO (sem Nest, sem banco), imprime a tabela comparativa
 * adapter x campo x valorLido x confianca x tempo e fecha com o acerto de cada
 * adapter contra os valores conhecidos da peca de demo.
 *
 * Cada foto vira UMA chamada por adapter — sem retry, sem laco (constraint 4
 * do SPEC). Custo estimado de uma rodada completa esta em docs/aws.md.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { config as carregarDotenv } from 'dotenv';

import {
  BedrockExtractor,
  resolverRegiao,
} from '../src/extracao/adapters/bedrock.extractor';
import { TextractExtractor } from '../src/extracao/adapters/textract.extractor';
import {
  CampoAlvo,
  ExtractorPort,
  FONTES_FISICAS,
  FonteImagem,
  LeituraExtraida,
} from '../src/extracao/ports/extractor.port';

carregarDotenv();

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

/**
 * Valores conhecidos da peca de demo. `modo` diz como o acerto e medido:
 *
 * - 'exato'  — igualdade apos normalizacao (mesma ideia da engine);
 * - 'contem' — basta conter o esperado. A serigrafia traz o cliente com
 *   codigo ('143091 - Energisa Rondonia'); aqui a pergunta e "o adapter leu o
 *   cliente?", nao "o valor bate exatamente" — comparacao estrita e da engine.
 *
 * `potencia-serigrafia-frente` fica fora: a potencia nao vem do QR, entao nao
 * ha valor esperado para conferir nesta rodada (ver ORIGENS_DO_ESPERADO em
 * conferencia-execucao.service.ts).
 */
const ESPERADOS: Record<string, { valor: string; modo: 'exato' | 'contem' }> = {
  'serie-chumbada-topo': { valor: '847233', modo: 'exato' },
  'serie-chumbada-lateral-direita': { valor: '847233', modo: 'exato' },
  'serie-chumbada-traseira': { valor: '847233', modo: 'exato' },
  'patrimonio-serigrafia-topo': { valor: '251328', modo: 'exato' },
  'patrimonio-serigrafia-frente': { valor: '251328', modo: 'exato' },
  'cliente-serigrafia-frente': { valor: 'Energisa', modo: 'contem' },
  'serie-placa': { valor: '847233', modo: 'exato' },
  'patrimonio-placa': { valor: '251328', modo: 'exato' },
};

const EXTENSOES: { sufixo: string; mimeType: string }[] = [
  { sufixo: '.jpg', mimeType: 'image/jpeg' },
  { sufixo: '.jpeg', mimeType: 'image/jpeg' },
  { sufixo: '.png', mimeType: 'image/png' },
];

const ADAPTERS_VALIDOS = ['textract', 'bedrock', 'ambos'] as const;
type AdapterEscolhido = (typeof ADAPTERS_VALIDOS)[number];

interface Linha {
  adapter: string;
  fonteFisica: string;
  campo: string;
  valorLido: string;
  confianca: string;
  tempoMs: string;
  acerto: string;
}

/** Erro previsto de bancada: mensagem amigavel, sem stack trace. */
class SpikeError extends Error {}

function normalizar(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ').toLowerCase();
}

function usoResumido(): string {
  return (
    'Uso: npx ts-node -r tsconfig-paths/register scripts/spike-extracao.ts ' +
    '<dir-fotos> [textract|bedrock|ambos]'
  );
}

/**
 * O boilerplate guarda a credencial como ACCESS_KEY_ID/SECRET_ACCESS_KEY (nomes
 * do modulo files), mas o SDK da AWS le AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.
 * Espelha uma na outra para o spike rodar com o .env que ja existe.
 */
function espelharCredenciaisDoEnv(): void {
  if (!process.env.AWS_ACCESS_KEY_ID && process.env.ACCESS_KEY_ID) {
    process.env.AWS_ACCESS_KEY_ID = process.env.ACCESS_KEY_ID;
  }
  if (!process.env.AWS_SECRET_ACCESS_KEY && process.env.SECRET_ACCESS_KEY) {
    process.env.AWS_SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY;
  }
}

function temCredencialAws(): boolean {
  const env = process.env;

  return Boolean(
    (env.AWS_ACCESS_KEY_ID?.trim() && env.AWS_SECRET_ACCESS_KEY?.trim()) ||
    env.AWS_PROFILE?.trim() ||
    env.AWS_BEARER_TOKEN_BEDROCK?.trim() ||
    env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI?.trim() ||
    env.AWS_WEB_IDENTITY_TOKEN_FILE?.trim(),
  );
}

function lerArgumentos(argv: string[]): {
  diretorio: string;
  adapter: AdapterEscolhido;
} {
  const [diretorio, adapterBruto] = argv;

  if (!diretorio) {
    throw new SpikeError(`diretorio de fotos nao informado.\n${usoResumido()}`);
  }

  const adapter = (adapterBruto ?? 'ambos').toLowerCase();
  if (!(ADAPTERS_VALIDOS as readonly string[]).includes(adapter)) {
    throw new SpikeError(
      `adapter invalido: "${adapterBruto}". Use ${ADAPTERS_VALIDOS.join(' | ')}.\n` +
        usoResumido(),
    );
  }

  return { diretorio, adapter: adapter as AdapterEscolhido };
}

function carregarFotos(diretorio: string): FonteImagem[] {
  if (!existsSync(diretorio) || !statSync(diretorio).isDirectory()) {
    throw new SpikeError(`diretorio de fotos nao encontrado: ${diretorio}`);
  }

  const fotos: FonteImagem[] = [];

  for (const fonteFisica of FONTES_FISICAS) {
    for (const extensao of EXTENSOES) {
      const caminho = join(diretorio, `${fonteFisica}${extensao.sufixo}`);
      if (!existsSync(caminho)) {
        continue;
      }

      fotos.push({
        // Spike roda fora do banco: nao ha FotoEvidencia persistida ainda.
        fotoEvidenciaId: null,
        fonteFisica,
        imagem: readFileSync(caminho),
        mimeType: extensao.mimeType,
      });
      break;
    }
  }

  if (fotos.length === 0) {
    const esperados = FONTES_FISICAS.map((fonte) => `${fonte}.jpg`).join(', ');
    throw new SpikeError(
      `nenhuma foto encontrada em ${diretorio}.\n` +
        `Nomeie cada arquivo pela fonte fisica: ${esperados} ` +
        `(aceita .jpg, .jpeg e .png).`,
    );
  }

  return fotos;
}

function acertoDe(campo: string, valorLido: string | null): string {
  const esperado = ESPERADOS[campo];
  if (esperado === undefined) {
    return '—';
  }
  if (valorLido === null) {
    return 'nao';
  }

  const lido = normalizar(valorLido);
  const alvo = normalizar(esperado.valor);
  const bateu = esperado.modo === 'exato' ? lido === alvo : lido.includes(alvo);

  return bateu ? 'sim' : 'nao';
}

async function rodarAdapter(
  extractor: ExtractorPort,
  fotos: FonteImagem[],
): Promise<Linha[]> {
  const linhas: Linha[] = [];

  for (const foto of fotos) {
    const alvos: CampoAlvo[] = CHECKLIST.filter(
      (item) => item.fonteFisica === foto.fonteFisica,
    ).map((item) => ({ campo: item.campo }));

    if (alvos.length === 0) {
      // Foto sem campo no checklist (tipicamente 'geral'): nao se paga visao
      // por foto que ninguem vai conferir.
      continue;
    }

    const inicio = Date.now();
    let leituras: LeituraExtraida[];

    try {
      // `achadosLivres` do retorno nao entra na tabela do spike de proposito:
      // o que o spike mede e acerto por campo alvo. Os achados alimentam o
      // alarme de consistencia, verificavel pelo endpoint.
      ({ leituras } = await extractor.extrair(foto, alvos));
    } catch (erro) {
      const tempoMs = String(Date.now() - inicio);
      const motivo = erro instanceof Error ? erro.message : String(erro);

      for (const alvo of alvos) {
        linhas.push({
          adapter: extractor.nome,
          fonteFisica: foto.fonteFisica,
          campo: alvo.campo,
          valorLido: `ERRO: ${motivo}`,
          confianca: '—',
          tempoMs,
          acerto: 'nao',
        });
      }
      continue;
    }

    const tempoMs = String(Date.now() - inicio);

    for (const leitura of leituras) {
      linhas.push({
        adapter: extractor.nome,
        fonteFisica: foto.fonteFisica,
        campo: leitura.campo,
        valorLido: leitura.valorLido ?? '(null)',
        confianca:
          leitura.confianca === null ? '—' : leitura.confianca.toFixed(2),
        tempoMs,
        acerto: acertoDe(leitura.campo, leitura.valorLido),
      });
    }
  }

  return linhas;
}

function imprimirTabela(linhas: Linha[]): void {
  const cabecalho: Linha = {
    adapter: 'ADAPTER',
    fonteFisica: 'FONTE',
    campo: 'CAMPO',
    valorLido: 'VALOR LIDO',
    confianca: 'CONF.',
    tempoMs: 'MS',
    acerto: 'ACERTO',
  };

  const colunas: (keyof Linha)[] = [
    'adapter',
    'fonteFisica',
    'campo',
    'valorLido',
    'confianca',
    'tempoMs',
    'acerto',
  ];

  const larguras = colunas.map((coluna) =>
    [cabecalho, ...linhas].reduce(
      (maior, linha) => Math.max(maior, linha[coluna].length),
      0,
    ),
  );

  const formatar = (linha: Linha): string =>
    colunas
      .map((coluna, indice) => linha[coluna].padEnd(larguras[indice]))
      .join('  ')
      .trimEnd();

  console.log(formatar(cabecalho));
  console.log(larguras.map((largura) => '-'.repeat(largura)).join('  '));
  for (const linha of linhas) {
    console.log(formatar(linha));
  }
}

function imprimirPlacar(linhas: Linha[]): void {
  console.log('');
  console.log('Valores esperados da peca de demo (EPT-163-PI-676):');
  for (const [campo, esperado] of Object.entries(ESPERADOS)) {
    const regra = esperado.modo === 'contem' ? ' (basta conter)' : '';
    console.log(`  ${campo}: ${esperado.valor}${regra}`);
  }
  console.log(
    '  potencia-serigrafia: sem valor esperado nesta rodada (nao vem do QR)',
  );

  console.log('');
  console.log('Acerto por adapter (so campos com valor esperado):');

  const adapters = [...new Set(linhas.map((linha) => linha.adapter))];
  for (const adapter of adapters) {
    const conferiveis = linhas.filter(
      (linha) => linha.adapter === adapter && linha.acerto !== '—',
    );
    const acertos = conferiveis.filter(
      (linha) => linha.acerto === 'sim',
    ).length;
    const percentual =
      conferiveis.length === 0
        ? 0
        : Math.round((acertos / conferiveis.length) * 100);

    console.log(
      `  ${adapter}: ${acertos}/${conferiveis.length} (${percentual}%)`,
    );
  }

  console.log('');
  console.log(
    'Registrar a decisao (servico escolhido, modelo, prompts que funcionaram) ' +
      'em docs/aws.md.',
  );
}

async function main(): Promise<void> {
  const { diretorio, adapter } = lerArgumentos(process.argv.slice(2));

  espelharCredenciaisDoEnv();
  if (!temCredencialAws()) {
    throw new SpikeError(
      'credencial AWS ausente. O spike chama Textract/Bedrock de verdade e ' +
        'nao tem como rodar sem ela.\n' +
        'Configure ACCESS_KEY_ID e SECRET_ACCESS_KEY (ou AWS_ACCESS_KEY_ID / ' +
        'AWS_SECRET_ACCESS_KEY / AWS_PROFILE) em backend/.env.\n' +
        'Checklist de setup (IAM, model access do Bedrock, regiao): docs/aws.md.',
    );
  }

  const fotos = carregarFotos(diretorio);
  const regiao = resolverRegiao();

  console.log(
    `Spike de extracao — ${fotos.length} foto(s) em ${diretorio}, regiao ${regiao}`,
  );
  console.log(
    `Fontes fisicas: ${fotos.map((foto) => foto.fonteFisica).join(', ')}`,
  );
  console.log('');

  const extractors: ExtractorPort[] = [];
  if (adapter === 'textract' || adapter === 'ambos') {
    extractors.push(new TextractExtractor(regiao));
  }
  if (adapter === 'bedrock' || adapter === 'ambos') {
    extractors.push(new BedrockExtractor(regiao));
  }

  const linhas: Linha[] = [];
  for (const extractor of extractors) {
    linhas.push(...(await rodarAdapter(extractor, fotos)));
  }

  imprimirTabela(linhas);
  imprimirPlacar(linhas);
}

void main().catch((erro: unknown) => {
  if (erro instanceof SpikeError) {
    console.error(`\nspike-extracao: ${erro.message}\n`);
  } else {
    console.error('\nspike-extracao: falha inesperada.');
    console.error(erro);
  }
  process.exitCode = 1;
});
