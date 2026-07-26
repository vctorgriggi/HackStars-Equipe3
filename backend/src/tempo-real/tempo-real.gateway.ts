import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

import { EventoPassagemRegistrada } from './dto/evento-passagem-registrada.dto';

/**
 * Difusao de tempo real da linha (Socket.IO, namespace `/tempo-real`).
 *
 * - O prefixo global `api` NAO se aplica a gateway: o handshake vive no path
 *   default `/socket.io`, namespace `/tempo-real`.
 * - `cors: { origin: '*' }` e DELIBERADO e espelha o `cors: true` do app
 *   (gap 17, aceito ate o hardening pos-demo) — o decorator tem CORS proprio
 *   e sem ele o handshake do navegador falha mesmo com o CORS global aberto.
 * - SEM auth no handshake (gap registrado no CLAUDE.md): o front guarda o JWT
 *   em cookie httpOnly que o navegador nao le, entao token no handshake
 *   exigiria expo-lo. O que trafega e contagem/codigo/serie — nada que a
 *   /demo publica ja nao mostre. Fechar junto da revisao de auth.
 * - No App Runner nao ha upgrade de WebSocket: o socket.io degrada sozinho
 *   para long-polling — por isso o CLIENTE nunca deve forcar `transports`.
 */
@WebSocketGateway({ namespace: 'tempo-real', cors: { origin: '*' } })
export class TempoRealGateway {
  @WebSocketServer()
  server: Server;

  emitirPassagemRegistrada(evento: EventoPassagemRegistrada): void {
    this.server.emit('passagem-registrada', evento);
  }
}
