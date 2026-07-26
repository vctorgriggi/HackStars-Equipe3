/**
 * PÁGINA DE APRESENTAÇÃO TEMPORÁRIA — REMOVER ANTES DE PRODUÇÃO.
 *
 * Serve o "modo câmera fixa" (`/gate`): o celular fica MONTADO apontado para a
 * peça e encena a câmera de um gate da linha — a rodada futura de câmeras fixas
 * do SPEC, rodando sobre os endpoints REAIS
 * (`POST /fotos-evidencia/upload` + `POST /conferencias/executar-com-fotos`).
 * Irmã da `/esteira` (telão) e da `/demo` (bancada), mesmo contrato: a página
 * não compara nada e não calcula veredito — ela mostra o que a API respondeu.
 *
 * Constraint 4 do SPEC (créditos AWS): o detector de presença é aritmética
 * local sobre quadros do vídeo e NUNCA toca a rede. Rede só acontece no disparo
 * — UM por armamento, e armar é um toque explícito do operador.
 *
 * A rota fica fora do prefixo global (`exclude` em main.ts), então a URL é
 * `https://<host>/gate` — o celular montado não digita `/api/v1`. Sem guard de
 * JWT pelo mesmo motivo da `/demo`: a própria página faz login e guarda o token
 * em memória (mesma dívida, mesmo prazo — gap 13 do CLAUDE.md).
 */
import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { PAGINA_GATE } from './pagina-gate';

@ApiExcludeController()
@Controller()
export class GateController {
  @Get('gate')
  pagina(@Res() res: Response): void {
    res.type('html').send(PAGINA_GATE);
  }
}
