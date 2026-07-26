import { FonteImagem } from '../ports/extractor.port';
import { decodificarQr, lerQrDaFoto } from './qr-imagem';
import { esquecerSharp } from './recorte';

// CAMINHO DE DEGRADACAO DO DECODE DE QR — irmao de `recorte-sem-lib.spec.ts`,
// e em arquivo proprio pelo mesmo motivo: o mock de modulo vale para o arquivo
// inteiro, e aqui o `import('sharp')` explode de proposito.
//
// `sharp` e binario nativo e uma dependencia OPCIONAL em runtime. Sem ela, o
// QR da placa deixa de ser decodificavel — e o resultado tem de ser campo SEM
// LEITURA (`nao_conferivel` na engine, ambar na tela), nunca 500, nunca boot
// quebrado e nunca um valor inventado para o campo.

jest.mock('sharp', () => {
  throw new Error(
    'Could not load the "sharp" module using the linuxmusl-x64 runtime',
  );
});

const FOTO_DA_PLACA: FonteImagem = {
  fotoEvidenciaId: 'foto-da-placa',
  fonteFisica: 'placa',
  imagem: Buffer.from('qualquer'),
  mimeType: 'image/jpeg',
};

describe('decode de QR sem a lib de imagem', () => {
  beforeEach(() => {
    // O loader guarda o resultado em cache; o teste precisa da primeira carga.
    esquecerSharp();
  });

  afterAll(() => {
    esquecerSharp();
  });

  it('should devolver null em vez de lancar quando sharp nao carrega', async () => {
    await expect(decodificarQr(FOTO_DA_PLACA.imagem)).resolves.toBeNull();
  });

  it('should devolver os campos de QR sem leitura, com o resto da foto intacto', async () => {
    const { leituras, achadosLivres } = await lerQrDaFoto(FOTO_DA_PLACA, [
      { campo: 'serie-placa-qr' },
      { campo: 'patrimonio-placa-qr' },
    ]);

    expect(leituras).toEqual([
      {
        campo: 'serie-placa-qr',
        valorLido: null,
        confianca: null,
        regiaoLeitura: null,
        fotoEvidenciaId: 'foto-da-placa',
      },
      {
        campo: 'patrimonio-placa-qr',
        valorLido: null,
        confianca: null,
        regiaoLeitura: null,
        fotoEvidenciaId: 'foto-da-placa',
      },
    ]);
    expect(achadosLivres).toEqual([]);
  });
});
