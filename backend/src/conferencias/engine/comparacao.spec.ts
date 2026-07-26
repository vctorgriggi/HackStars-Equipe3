import { conferir } from './engine-conformidade';
import { ItemChecklist, LeituraCampo, OpcoesEngine } from './tipos';

// Nota de lint: a regra `no-restricted-syntax` do projeto exige que todo `it`
// comece com "should"; o restante da frase segue o vocabulario de dominio.
//
// POR QUE ESTE MODO EXISTE (medido em 2026-07-26, Textract real no ar, gap 21):
// `POST /conferencias/executar-com-fotos` com as 5 fotos da peca saiu
// `divergente` em `cliente-serigrafia-frente` — lido `energisa` @ 0.9967 contra
// o esperado `143091 - Energisa Rondonia Distribuidora de Energia S.A` que veio
// do QR. A peca esta CORRETA: a serigrafia carrega a MARCA (e o projeto manda
// exatamente isso), enquanto a etiqueta carrega a RAZAO SOCIAL com o codigo do
// cliente. Igualdade exata acusava a peca certa e quebrava o criterio 2 do SPEC
// ("o unico campo divergente e a serie da placa"), sempre, com QR real.
//
// O QUE O MODO NAO E: fuzzy match. Nao ha similaridade, distancia de edicao nem
// percentual — o lido tem de ser TOKEN INTEIRO (ou sequencia de tokens inteiros
// consecutivos) do esperado. Pedaco de palavra continua divergente, e a regua
// de confianca (limiar, corroboracao, coerencia) segue intacta: o modo muda o
// criterio de IGUALDADE TEXTUAL, nunca o de lastro.

const RAZAO_SOCIAL = '143091 - Energisa Rondônia Distribuidora de Energia S.A';
const CLIENTE = 'cliente-serigrafia-frente';

const MODO_CLIENTE: OpcoesEngine = {
  limiarConfianca: 0.9,
  modosPorCampo: { [CLIENTE]: 'contem-token' },
};

function item(campo: string, fonteFisica = 'frente'): ItemChecklist {
  return { campo, fonteFisica, obrigatorio: true };
}

function leitura(
  campo: string,
  valorLido: string | null,
  confianca: number | null = 0.9967,
): LeituraCampo {
  return { campo, valorLido, confianca };
}

function vereditoDoCliente(
  valorLido: string,
  confianca = 0.9967,
  esperado = RAZAO_SOCIAL,
  opcoes: OpcoesEngine = MODO_CLIENTE,
) {
  const resultado = conferir(
    [item(CLIENTE)],
    { [CLIENTE]: esperado },
    [leitura(CLIENTE, valorLido, confianca)],
    opcoes,
  );

  return resultado.campos[0];
}

describe('conferir — modo contem-token: a marca lida dentro da razao social', () => {
  it('should aceitar a MARCA serigrafada contra a razao social do QR', () => {
    // O caso medido: este era o divergente FALSO do ambiente no ar.
    expect(vereditoDoCliente('energisa').veredito).toBe('conforme');
  });

  it('should aceitar o esperado inteiro como lido (o preset digitado da /demo)', () => {
    // O modo avancado da /demo digita a razao social completa; contencao
    // trivial (todo o esperado e sequencia dele mesmo) mantem o resultado de
    // antes desta mudanca.
    expect(vereditoDoCliente(RAZAO_SOCIAL).veredito).toBe('conforme');
  });

  it('should aceitar sequencia de tokens CONSECUTIVOS do esperado', () => {
    expect(vereditoDoCliente('Energisa Rondônia').veredito).toBe('conforme');
  });

  it('should ignorar caixa alta e baixa', () => {
    expect(vereditoDoCliente('ENERGISA').veredito).toBe('conforme');
  });

  it('should ignorar acento (a serigrafia perde o til que a razao social tem)', () => {
    expect(vereditoDoCliente('energísa').veredito).toBe('conforme');
    expect(vereditoDoCliente('RONDONIA').veredito).toBe('conforme');
  });

  it('should acusar divergente quando a marca lida nao esta no esperado', () => {
    // Peca de outro cliente na esteira: continua sendo nao conformidade.
    expect(vereditoDoCliente('cemig').veredito).toBe('divergente');
  });

  it('should acusar divergente para PEDACO de token (nao e fuzzy match)', () => {
    expect(vereditoDoCliente('ener').veredito).toBe('divergente');
    expect(vereditoDoCliente('energisas').veredito).toBe('divergente');
  });

  it('should exigir que os tokens venham na ordem do esperado', () => {
    // 'rondonia energisa' contem as duas palavras, mas nao e sequencia do
    // esperado — remontar texto fora de ordem seria adivinhacao.
    expect(vereditoDoCliente('Rondônia Energisa').veredito).toBe('divergente');
  });

  it('should recusar contencao INVERTIDA: lido maior que o esperado nao aprova', () => {
    // Esperado curto (etiqueta so com a marca) e leitura com a razao social
    // inteira: a contencao vale num sentido so (lido dentro do esperado).
    expect(vereditoDoCliente(RAZAO_SOCIAL, 0.99, 'Energisa').veredito).toBe(
      'divergente',
    );
  });

  it('should recusar leitura sem token nenhum (so pontuacao)', () => {
    expect(vereditoDoCliente('- . -').veredito).toBe('divergente');
  });
});

describe('conferir — modo contem-token nao afrouxa a regua de confianca', () => {
  it('should manter nao_conferivel quando o token contido vem abaixo do limiar', () => {
    const campo = vereditoDoCliente('energisa', 0.5);

    expect(campo.veredito).toBe('nao_conferivel');
    expect(campo.motivo).toBe('confianca-abaixo-do-limiar');
  });

  it('should manter nao_conferivel quando nao houve leitura', () => {
    const resultado = conferir(
      [item(CLIENTE)],
      { [CLIENTE]: RAZAO_SOCIAL },
      [leitura(CLIENTE, null, null)],
      MODO_CLIENTE,
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('sem-leitura');
  });
});

describe('conferir — o modo e por campo: o default continua exato', () => {
  it('should comparar exato quando o campo nao declara modo', () => {
    // Mesma leitura do caso medido, SEM o modo: o comportamento antigo,
    // preservado para todo campo que nao seja de cliente.
    expect(
      vereditoDoCliente('energisa', 0.9967, RAZAO_SOCIAL, {
        limiarConfianca: 0.9,
      }).veredito,
    ).toBe('divergente');
  });

  it('should comparar exato quando o mapa de modos nao cita o campo', () => {
    expect(
      vereditoDoCliente('energisa', 0.9967, RAZAO_SOCIAL, {
        limiarConfianca: 0.9,
        modosPorCampo: { 'serie-placa': 'exato' },
      }).veredito,
    ).toBe('divergente');
  });

  it('should manter o cenario-ancora: serie da placa 847833 x 847233 divergente', () => {
    // Criterio 2 do SPEC. A placa e IMPRESSA (nao passa por corroboracao) e
    // segue em comparacao exata mesmo com o mapa de modos presente.
    const resultado = conferir(
      [item('serie-placa', 'placa'), item(CLIENTE)],
      { 'serie-placa': '847233', [CLIENTE]: RAZAO_SOCIAL },
      [
        leitura('serie-placa', '847833', 0.999),
        leitura(CLIENTE, 'energisa', 0.9967),
      ],
      MODO_CLIENTE,
    );

    expect(resultado.campos[0].veredito).toBe('divergente');
    expect(resultado.campos[1].veredito).toBe('conforme');
    expect(resultado.vereditoGeral).toBe('divergente');
  });

  it('should manter patrimonio em comparacao exata mesmo com modo de cliente no mapa', () => {
    const resultado = conferir(
      [item('patrimonio-serigrafia-frente')],
      { 'patrimonio-serigrafia-frente': '251328' },
      [leitura('patrimonio-serigrafia-frente', '251', 0.99)],
      MODO_CLIENTE,
    );

    expect(resultado.campos[0].veredito).toBe('divergente');
  });
});

// MODO 'esperado-contido' — o da POTENCIA (2026-07-26).
//
// POR QUE ELE EXISTE: o desenho EPT-163-PI-676 manda gravar `1H - 10 kVA` na
// frente, e o OCR le a face inteira de uma vez, entao o texto que volta traz
// companhia. Aqui e o ESPERADO que tem de caber no LIDO — o inverso do modo do
// cliente. Antes desta rodada o campo nao tinha esperado nenhum (a potencia nao
// e campo do QR) e a engine omitia o item opcional: potencia gravada errada saia
// em SILENCIO. E marcacao errada e justamente o que a banca vai testar.
const POTENCIA = 'potencia-serigrafia-frente';

/** O texto que o desenho manda gravar na frente da peca. */
const POTENCIA_DO_PROJETO = '1H - 10 kVA';

const MODO_POTENCIA: OpcoesEngine = {
  limiarConfianca: 0.9,
  modosPorCampo: { [POTENCIA]: 'esperado-contido' },
};

function vereditoDaPotencia(
  valorLido: string,
  confianca = 0.996,
  esperado = POTENCIA_DO_PROJETO,
) {
  const resultado = conferir(
    [item(POTENCIA)],
    { [POTENCIA]: esperado },
    [leitura(POTENCIA, valorLido, confianca)],
    MODO_POTENCIA,
  );

  return resultado.campos[0];
}

describe('conferir — modo esperado-contido: a marcacao do desenho dentro do lido', () => {
  it('should aceitar a leitura real medida na frente da peca', () => {
    // '1H-10kVA' @ 0.996: a unidade colada no numero e o hifen sem espacos sao
    // tipografia, nao dado.
    expect(vereditoDaPotencia('1H-10kVA').veredito).toBe('conforme');
  });

  it('should aceitar a mesma marcacao com espacos como o desenho escreve', () => {
    expect(vereditoDaPotencia('1H - 10 kVA').veredito).toBe('conforme');
  });

  it('should aceitar o lido que traz MAIS do que a marcacao esperada', () => {
    // A face inteira numa tirada de OCR: potencia junto de classe e tensao.
    expect(vereditoDaPotencia('1H - 10 kVA 15 kV').veredito).toBe('conforme');
  });

  it('should ignorar caixa', () => {
    expect(vereditoDaPotencia('1h - 10 kva').veredito).toBe('conforme');
  });

  it('should ACUSAR divergente quando a potencia gravada e outra', () => {
    // O caso do avaliador: peca serigrafada com a potencia errada.
    expect(vereditoDaPotencia('20 kVA').veredito).toBe('divergente');
    expect(vereditoDaPotencia('1H-20kVA').veredito).toBe('divergente');
    expect(vereditoDaPotencia('1H - 20 kVA').veredito).toBe('divergente');
  });

  it('should ACUSAR divergente quando a FASE gravada e outra', () => {
    // O desenho pede a marcacao completa; trocar o 1H tambem e nao conformidade.
    expect(vereditoDaPotencia('2H - 10 kVA').veredito).toBe('divergente');
    expect(vereditoDaPotencia('2H-10kVA').veredito).toBe('divergente');
  });

  it('should acusar divergente quando falta parte da marcacao esperada', () => {
    // '10 kVA' sozinho nao e a marcacao do desenho — falta o '1H'.
    expect(vereditoDaPotencia('10 kVA').veredito).toBe('divergente');
    // E numero sem unidade nao afirma potencia nenhuma.
    expect(vereditoDaPotencia('10').veredito).toBe('divergente');
  });

  it('should exigir fronteira de token: 110 kVA nao contem 10 kVA', () => {
    expect(vereditoDaPotencia('110 kVA', 0.996, '10 kVA').veredito).toBe(
      'divergente',
    );
  });

  it('should exigir os tokens do esperado em sequencia CONSECUTIVA', () => {
    // Remontar texto fora de ordem seria adivinhacao (mesma regra do cliente).
    expect(vereditoDaPotencia('10 kVA 1H').veredito).toBe('divergente');
  });

  it('should recusar leitura sem token nenhum (so pontuacao)', () => {
    expect(vereditoDaPotencia('- . -').veredito).toBe('divergente');
  });

  it('should manter o limiar mandando ANTES da comparacao', () => {
    // Leitura fraca nunca vira conforme, nem batendo com o esperado — e nunca
    // vira divergente, que e o que mandaria a peca para retrabalho por foto ruim.
    const campo = vereditoDaPotencia('1H-10kVA', 0.5);

    expect(campo.veredito).toBe('nao_conferivel');
    expect(campo.motivo).toBe('confianca-abaixo-do-limiar');
  });

  it('should seguir nao_conferivel quando ninguem leu a frente', () => {
    const resultado = conferir(
      [item(POTENCIA)],
      { [POTENCIA]: POTENCIA_DO_PROJETO },
      [leitura(POTENCIA, null, null)],
      MODO_POTENCIA,
    );

    expect(resultado.campos[0].veredito).toBe('nao_conferivel');
    expect(resultado.campos[0].motivo).toBe('sem-leitura');
  });

  it('should NAO afrouxar campo que o mapa nao cita (serie e patrimonio intactos)', () => {
    // Contraprova do modo mais frouxo da engine: com ele no mapa da potencia, a
    // serie continua exata — leitura que "contem" o esperado nao aprova.
    const resultado = conferir(
      [item('serie-placa', 'placa'), item('patrimonio-placa', 'placa')],
      { 'serie-placa': '847233', 'patrimonio-placa': '251328' },
      [
        leitura('serie-placa', 'N 847233 X', 0.999),
        leitura('patrimonio-placa', '251328 251329', 0.999),
      ],
      MODO_POTENCIA,
    );

    expect(resultado.campos.map((campo) => campo.veredito)).toEqual([
      'divergente',
      'divergente',
    ]);
  });
});
