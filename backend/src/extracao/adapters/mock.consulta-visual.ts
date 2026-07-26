import { ConsultaVisualPort } from '../ports/consulta-visual.port';

/**
 * Consulta visual DETERMINISTICA, sem AWS. Existe para os testes e para
 * bancada offline — nao para producao.
 *
 * Como o `MockRedator`, o produto aqui e texto livre: uma resposta simulada
 * servida em silencio seria indistinguivel de uma real. Por isso o texto se
 * ANUNCIA como simulado na primeira palavra e a resposta da API carrega
 * `modelo: "mock"`.
 */
export class MockConsultaVisual extends ConsultaVisualPort {
  readonly nome = 'mock';

  readonly modelo = 'mock';

  consultar(imagem: Buffer, mimeType: string, texto: string): Promise<string> {
    return Promise.resolve(
      `CONSULTA SIMULADA (sem IA — driver de consulta visual em modo mock). ` +
        `Pergunta recebida: "${texto}". Imagem recebida: ${imagem.length} ` +
        `bytes (${mimeType}). Ligue o driver bedrock para uma resposta real.`,
    );
  }
}
