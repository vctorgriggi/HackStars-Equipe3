import { UnprocessableEntityException } from '@nestjs/common';

import { ConsultaVisualController } from './consulta-visual.controller';
import { ConsultaVisualPort } from './ports/consulta-visual.port';

/** Dublê da porta (padrao do modulo: nunca mockar o SDK). */
class ConsultaVisualEspiao extends ConsultaVisualPort {
  readonly nome = 'espiao';

  readonly modelo = 'modelo-espiao';

  chamadas: { imagem: Buffer; mimeType: string; texto: string }[] = [];

  consultar(imagem: Buffer, mimeType: string, texto: string): Promise<string> {
    this.chamadas.push({ imagem, mimeType, texto });
    return Promise.resolve('resposta-do-espiao');
  }
}

function fotoFake(mimetype: string): Express.Multer.File {
  return {
    buffer: Buffer.from('bytes-da-foto'),
    mimetype,
  } as Express.Multer.File;
}

describe('ConsultaVisualController', () => {
  let espiao: ConsultaVisualEspiao;
  let controller: ConsultaVisualController;

  beforeEach(() => {
    espiao = new ConsultaVisualEspiao();
    controller = new ConsultaVisualController(espiao);
  });

  it('should repassar buffer, mime e texto a porta e devolver a resposta', async () => {
    const resultado = await controller.consultar(fotoFake('image/jpeg'), {
      texto: 'qual o numero de serie?',
    });

    expect(espiao.chamadas).toHaveLength(1);
    expect(espiao.chamadas[0].imagem.toString()).toBe('bytes-da-foto');
    expect(espiao.chamadas[0].mimeType).toBe('image/jpeg');
    expect(espiao.chamadas[0].texto).toBe('qual o numero de serie?');

    expect(resultado).toEqual({
      resposta: 'resposta-do-espiao',
      modelo: 'modelo-espiao',
      driver: 'espiao',
    });
  });

  it('should devolver 422 foto-obrigatoria sem arquivo, sem tocar a porta', async () => {
    await expect(
      controller.consultar(undefined, { texto: 'qualquer' }),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(espiao.chamadas).toHaveLength(0);
  });

  it('should devolver 422 mime-nao-suportado para arquivo que nao e imagem', async () => {
    // Barrado no controller, ANTES do adapter: mime invalido nao pode gastar
    // credito AWS nem virar 500 generico.
    await expect(
      controller.consultar(fotoFake('application/pdf'), { texto: 'qualquer' }),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(espiao.chamadas).toHaveLength(0);
  });
});
