/**
 * PÁGINA DE APRESENTAÇÃO TEMPORÁRIA — REMOVER ANTES DE PRODUÇÃO.
 *
 * Serve a cena da linha de produção (`/esteira`) que vai ao telão da demo:
 * esteira, câmeras fixas e monitores desenhados, rodando sobre os endpoints
 * REAIS (`/passagens/registrar`, `/conferencias/executar` e
 * `/conferencias/executar-com-fotos`). Não é o app do operador — o `frontend/`
 * continua sendo o produto, e a `/demo` continua sendo a bancada de teste.
 *
 * Regra de ouro preservada: a página não compara nada e não calcula veredito —
 * ela acende a lâmpada da cor que a API respondeu.
 *
 * A rota fica fora do prefixo global (`exclude` em main.ts), então a URL é
 * `https://<host>/esteira` — projetor não digita `/api/v1`. Sem guard de JWT
 * pelo mesmo motivo da `/demo`: a própria página faz login e guarda o token em
 * memória (mesma dívida, mesmo prazo — gap 13 do CLAUDE.md).
 */
import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { PAGINA_ESTEIRA } from './pagina-esteira';

@ApiExcludeController()
@Controller()
export class EsteiraController {
  @Get('esteira')
  pagina(@Res() res: Response): void {
    res.type('html').send(PAGINA_ESTEIRA);
  }
}
