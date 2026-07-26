// Ordens de captura remota, por camera.id: qualquer máquina que abra
// /cameras pode clicar "Capturar"; a máquina que tiver aquela câmera
// fisicamente conectada (rodando a mesma tela, com preview local ativo)
// atende a ordem e envia a foto de volta. Tudo em memória — vive no processo
// do servidor Next (persistente, não serverless).

type Estado = {
  pendente: boolean;
  pedidoTs: number | null;
  foto: Buffer | null;
  fotoTs: number | null;
};

const estados = new Map<string, Estado>();

function pegarOuCriar(id: string): Estado {
  let e = estados.get(id);
  if (!e) {
    e = { pendente: false, pedidoTs: null, foto: null, fotoTs: null };
    estados.set(id, e);
  }
  return e;
}

export function pedirCaptura(id: string): void {
  const e = pegarOuCriar(id);
  e.pendente = true;
  e.pedidoTs = Date.now();
}

export function statusDe(id: string): { pendente: boolean; ultimaCapturaTs: number | null } {
  const e = estados.get(id);
  return { pendente: e?.pendente ?? false, ultimaCapturaTs: e?.fotoTs ?? null };
}

export function guardarResultado(id: string, foto: Buffer): void {
  const e = pegarOuCriar(id);
  e.foto = foto;
  e.fotoTs = Date.now();
  e.pendente = false;
  e.pedidoTs = null;
}

export function pegarFoto(id: string): Buffer | null {
  return estados.get(id)?.foto ?? null;
}
