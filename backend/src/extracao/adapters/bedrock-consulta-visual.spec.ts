// Testa SO as funcoes puras do adapter — o client AWS nunca e tocado aqui
// (padrao do modulo: dubla-se a porta, nao o SDK).
import {
  MODELO_CONSULTA_PADRAO,
  formatoDaImagem,
  resolverModeloDaConsulta,
} from './bedrock-consulta-visual.adapter';

describe('formatoDaImagem', () => {
  it('should mapear os quatro mimes de imagem para o format do Converse', () => {
    expect(formatoDaImagem('image/jpeg')).toBe('jpeg');
    expect(formatoDaImagem('image/png')).toBe('png');
    expect(formatoDaImagem('image/gif')).toBe('gif');
    expect(formatoDaImagem('image/webp')).toBe('webp');
  });

  it('should estourar mime-nao-suportado para tipo fora da tabela', () => {
    expect(() => formatoDaImagem('application/pdf')).toThrow(
      /mime-nao-suportado/,
    );
    expect(() => formatoDaImagem('image/heic')).toThrow(/mime-nao-suportado/);
  });
});

describe('resolverModeloDaConsulta', () => {
  it('should usar o padrao (Haiku 4.5 via inference profile) sem env', () => {
    expect(resolverModeloDaConsulta({} as NodeJS.ProcessEnv)).toBe(
      MODELO_CONSULTA_PADRAO,
    );
  });

  it('should usar o padrao quando a env e vazia ou so espacos', () => {
    expect(
      resolverModeloDaConsulta({
        CONSULTA_VISUAL_MODEL_ID: '  ',
      } as NodeJS.ProcessEnv),
    ).toBe(MODELO_CONSULTA_PADRAO);
  });

  it('should respeitar CONSULTA_VISUAL_MODEL_ID quando informado', () => {
    expect(
      resolverModeloDaConsulta({
        CONSULTA_VISUAL_MODEL_ID:
          'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      } as NodeJS.ProcessEnv),
    ).toBe('us.anthropic.claude-sonnet-4-5-20250929-v1:0');
  });
});
