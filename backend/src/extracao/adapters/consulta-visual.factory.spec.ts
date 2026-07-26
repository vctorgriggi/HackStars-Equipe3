import { BedrockConsultaVisual } from './bedrock-consulta-visual.adapter';
import {
  criarConsultaVisual,
  ehConsultaVisualDriver,
} from './consulta-visual.factory';
import { MockConsultaVisual } from './mock.consulta-visual';

describe('criarConsultaVisual', () => {
  it('should criar o adapter bedrock quando o driver nao e informado', () => {
    expect(criarConsultaVisual(undefined)).toBeInstanceOf(
      BedrockConsultaVisual,
    );
  });

  it('should criar o adapter bedrock para string vazia', () => {
    expect(criarConsultaVisual('')).toBeInstanceOf(BedrockConsultaVisual);
  });

  it('should criar o mock quando o driver e mock', () => {
    expect(criarConsultaVisual('mock')).toBeInstanceOf(MockConsultaVisual);
  });

  it('should normalizar caixa e espacos do driver', () => {
    expect(criarConsultaVisual('  BEDROCK ')).toBeInstanceOf(
      BedrockConsultaVisual,
    );
    expect(criarConsultaVisual(' Mock')).toBeInstanceOf(MockConsultaVisual);
  });

  it('should cair no bedrock (padrao real) para driver invalido', () => {
    // Cair no mock por engano de digitacao serviria resposta simulada como
    // se fosse real — o padrao seguro e o servico real, que falha alto.
    expect(criarConsultaVisual('textract')).toBeInstanceOf(
      BedrockConsultaVisual,
    );
  });
});

describe('ehConsultaVisualDriver', () => {
  it('should aceitar apenas os drivers conhecidos', () => {
    expect(ehConsultaVisualDriver('bedrock')).toBe(true);
    expect(ehConsultaVisualDriver('mock')).toBe(true);
    expect(ehConsultaVisualDriver('textract')).toBe(false);
    expect(ehConsultaVisualDriver('')).toBe(false);
  });
});
