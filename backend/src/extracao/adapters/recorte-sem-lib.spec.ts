import { abrirImagem, esquecerSharp } from './recorte';

// CAMINHO DE DEGRADACAO: `sharp` e binario nativo (libvips) e uma dependencia
// OPCIONAL em runtime. Se ela faltar ou o binario nao casar com a plataforma,
// a API tem de continuar de pe e a extracao tem de voltar ao comportamento
// anterior (UMA chamada por foto, leitura sem corroboracao) — nunca 500, nunca
// boot quebrado.
//
// Este spec fica em arquivo PROPRIO porque o mock de modulo vale para o arquivo
// inteiro: aqui o `import('sharp')` explode de proposito.

jest.mock('sharp', () => {
  throw new Error(
    'Could not load the "sharp" module using the linuxmusl-x64 runtime',
  );
});

describe('recorte sem a lib de imagem', () => {
  beforeEach(() => {
    // O loader guarda o resultado em cache; o teste precisa da primeira carga.
    esquecerSharp();
  });

  afterAll(() => {
    esquecerSharp();
  });

  it('should devolver null em vez de lancar quando sharp nao carrega', async () => {
    await expect(abrirImagem(Buffer.from('qualquer'))).resolves.toBeNull();
  });

  it('should continuar devolvendo null nas chamadas seguintes (cache do erro)', async () => {
    await abrirImagem(Buffer.from('qualquer'));

    // Sem cache, cada foto tentaria carregar a lib de novo e encheria o log.
    await expect(abrirImagem(Buffer.from('outra'))).resolves.toBeNull();
  });
});
