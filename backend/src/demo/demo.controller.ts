/**
 * PÁGINA DE DEMONSTRAÇÃO TEMPORÁRIA — REMOVER ANTES DE PRODUÇÃO.
 *
 * Existe só para o time testar o fluxo (login, etapa, QR, fotos, leituras,
 * veredito) pelo celular, sem depender do build do frontend real. Não é o
 * app do operador: o `frontend/` continua sendo o produto.
 *
 * Regra de ouro preservada: esta página NÃO compara nada e NÃO calcula
 * veredito — ela só coleta entradas, chama a API e desenha a resposta.
 *
 * A rota fica fora do prefixo global (`exclude: ['/', 'demo']` em main.ts),
 * então a URL é `https://<host>/demo`. Sem guard de JWT de propósito: a
 * própria página faz login e guarda o token em memória.
 */
import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { PAGINA_DEMO } from './pagina-demo';

@ApiExcludeController()
@Controller()
export class DemoController {
  @Get('demo')
  pagina(@Res() res: Response): void {
    res.type('html').send(PAGINA_DEMO);
  }
}
