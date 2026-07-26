import {
  ehMarcacaoEmRelevo,
  ehMarcacaoQr,
  tipoDeMarcacaoDoCampo,
} from './marcacao';

// Fonte unica de "esta marcacao e relevo?" — lida pelo adapter (para corroborar
// por recorte) e pela execucao (para exigir corroboracao antes de acusar).
// Enquanto a checklist nao declarar `tipoMarcacao`, a derivacao e pelo NOME do
// campo; a limitacao esta escrita em marcacao.ts.

describe('ehMarcacaoEmRelevo', () => {
  it('should reconhecer as series chumbadas da peca de demo', () => {
    expect(ehMarcacaoEmRelevo('serie-chumbada-topo')).toBe(true);
    expect(ehMarcacaoEmRelevo('serie-chumbada-lateral-direita')).toBe(true);
    expect(ehMarcacaoEmRelevo('serie-chumbada-traseira')).toBe(true);
  });

  it('should reconhecer a nomenclatura antiga por numero de posicao', () => {
    // `serie-chumbada-1..3` viveu no seed ate a troca de eixo de fonteFisica;
    // checklist antiga no banco continua funcionando.
    expect(ehMarcacaoEmRelevo('serie-chumbada-1')).toBe(true);
    expect(ehMarcacaoEmRelevo('chumbado-2')).toBe(true);
  });

  it('should aceitar o escape explicito para outro cliente', () => {
    expect(ehMarcacaoEmRelevo('serie-relevo-topo')).toBe(true);
  });

  it('should NAO marcar tinta nem impresso — a placa precisa seguir acusavel', () => {
    // Cenario-ancora: `serie-placa` le a 99,9% e e o campo que a demo acusa.
    expect(ehMarcacaoEmRelevo('serie-placa')).toBe(false);
    expect(ehMarcacaoEmRelevo('patrimonio-placa')).toBe(false);
    expect(ehMarcacaoEmRelevo('patrimonio-serigrafia-topo')).toBe(false);
    expect(ehMarcacaoEmRelevo('cliente-serigrafia-frente')).toBe(false);
  });

  it('should casar por SEGMENTO do nome, nunca por substring solta', () => {
    expect(ehMarcacaoEmRelevo('serie-descumbrada-topo')).toBe(false);
    expect(ehMarcacaoEmRelevo('serie-alto-relevo-topo')).toBe(true);
  });

  it('should NAO marcar o QR como relevo — decode nao se corrobora por recorte', () => {
    // Se o QR entrasse aqui, a engine exigiria corroboracao por recorte de uma
    // leitura que o decode nunca corrobora: o campo sairia sempre
    // `nao_conferivel` e a placa perderia a marcacao que o QR acabou de provar.
    expect(ehMarcacaoEmRelevo('serie-placa-qr')).toBe(false);
    expect(ehMarcacaoEmRelevo('patrimonio-placa-qr')).toBe(false);
  });
});

describe('ehMarcacaoQr', () => {
  it('should reconhecer os campos de QR da placa', () => {
    expect(ehMarcacaoQr('serie-placa-qr')).toBe(true);
    expect(ehMarcacaoQr('patrimonio-placa-qr')).toBe(true);
  });

  it('should exigir o segmento EXATO, nunca substring', () => {
    // 'esquerda' contem 'qr'? nao — mas 'qrcode' e 'sqr' sim, e nenhum dos
    // dois pode virar campo decodificado por acidente de nomenclatura.
    expect(ehMarcacaoQr('serie-qrcode-placa')).toBe(false);
    expect(ehMarcacaoQr('serie-sqr')).toBe(false);
    expect(ehMarcacaoQr('serie-placa')).toBe(false);
    expect(ehMarcacaoQr('serie-chumbada-lateral-esquerda')).toBe(false);
  });
});

describe('tipoDeMarcacaoDoCampo', () => {
  it('should derivar o tipo de cada campo da checklist da demo', () => {
    expect(tipoDeMarcacaoDoCampo('serie-chumbada-topo')).toBe('relevo');
    expect(tipoDeMarcacaoDoCampo('patrimonio-serigrafia-frente')).toBe('tinta');
    expect(tipoDeMarcacaoDoCampo('serie-placa')).toBe('indefinido');
    expect(tipoDeMarcacaoDoCampo('patrimonio-placa')).toBe('indefinido');
    expect(tipoDeMarcacaoDoCampo('serie-placa-qr')).toBe('qr');
    expect(tipoDeMarcacaoDoCampo('patrimonio-placa-qr')).toBe('qr');
  });

  it('should manter o `qr` fora da discriminacao por contraste', () => {
    // `casarPorContraste` so casa 'relevo' e 'tinta' (contraste.ts). O que este
    // teste fixa e que o campo de QR nao se DISFARCA de um dos dois: se ele
    // voltasse a 'indefinido', a vista `placa` continuaria fora da medicao e
    // tudo bem; se voltasse a 'tinta', o numero IMPRESSO da placa poderia ser
    // casado com o campo do QR — leitura de OCR entrando por um campo que so
    // aceita decode.
    expect(tipoDeMarcacaoDoCampo('serie-placa-qr')).not.toBe('tinta');
    expect(tipoDeMarcacaoDoCampo('serie-placa-qr')).not.toBe('relevo');
  });
});
