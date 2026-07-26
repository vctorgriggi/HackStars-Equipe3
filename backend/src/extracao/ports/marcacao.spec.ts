import { ehMarcacaoEmRelevo } from './marcacao';

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
});
