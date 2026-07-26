"use client";

/**
 * Leitor de QR COMPARTILHADO (conferência e passagem usam o mesmo).
 *
 * Emite o payload CRU via `aoLer(texto)` e para por aí: quem INTERPRETA o
 * conteúdo do QR é a API (parser em `transformadores/qr`). O front decodifica a
 * imagem, nunca os campos — CLAUDE.md, "Contrato API ↔ Front".
 *
 * Três caminhos de leitura, do melhor para o mais teimoso — porque a etiqueta
 * fica em peça suja, sob luz ruim, e falhar sem saída é inaceitável no gate:
 *
 * 1. `BarcodeDetector` nativo (Android/Chrome): decodifica no próprio browser,
 *    rápido e sem baixar biblioteca;
 * 2. `jsQR` sobre frames do `<video>` (iOS/Safari e qualquer browser sem o
 *    detector), carregado sob demanda;
 * 3. FOTO do QR pelo seletor de arquivo (`capture="environment"`), decodificada
 *    com o mesmo jsQR — funciona quando a câmera ao vivo é negada ou não existe;
 *
 * e, SEMPRE disponível, digitar/colar o texto da etiqueta. Câmera exige origem
 * segura (HTTPS ou localhost): quando não há, o componente diz isso em vez de
 * ficar em "iniciando" para sempre.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { Aviso, Botao, Cartao, AreaTexto } from "@/components/ui";

/** `BarcodeDetector` ainda não está no lib.dom; contrato mínimo que usamos. */
interface DetectorDeCodigo {
  detect(fonte: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}

interface ConstrutorDetector {
  new (opcoes?: { formats?: string[] }): DetectorDeCodigo;
  getSupportedFormats?: () => Promise<string[]>;
}

function detectorNativo(): ConstrutorDetector | null {
  if (typeof window === "undefined") return null;
  const candidato = (window as unknown as Record<string, unknown>)
    .BarcodeDetector;
  return typeof candidato === "function"
    ? (candidato as ConstrutorDetector)
    : null;
}

type EstadoLeitor = "parado" | "iniciando" | "lendo" | "erro";

export interface QrLeitorProps {
  /** Recebe o texto CRU do QR (ou o digitado). */
  aoLer: (payloadCru: string) => void;
  titulo?: string;
  /** Abre a câmera assim que o componente monta. */
  iniciarAberto?: boolean;
  /** Texto do botão de confirmação do modo digitado. */
  rotuloConfirmar?: string;
}

export function QrLeitor({
  aoLer,
  titulo = "Ler o QR da etiqueta",
  iniciarAberto = false,
  rotuloConfirmar = "Usar este texto",
}: QrLeitorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const lendoRef = useRef(false);
  /**
   * O componente ainda está montado? `getUserMedia` é assíncrono: se a tela
   * sair enquanto ele resolve, a limpeza já rodou e não há stream para ela
   * parar — a câmera do celular fica LIGADA (LED aceso) até o refresh.
   */
  const montadoRef = useRef(true);

  const [estado, setEstado] = useState<EstadoLeitor>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [dica, setDica] = useState<string | null>(null);
  const [manualAberto, setManualAberto] = useState(false);
  const [textoManual, setTextoManual] = useState("");
  const [decodificandoArquivo, setDecodificandoArquivo] = useState(false);

  const pararCamera = useCallback(() => {
    lendoRef.current = false;

    if (loopRef.current !== null) {
      window.clearTimeout(loopRef.current);
      loopRef.current = null;
    }

    streamRef.current?.getTracks().forEach((faixa) => faixa.stop());
    streamRef.current = null;

    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // A câmera do celular não pode continuar ligada depois que a tela sai. O
  // flag é reposto na montagem porque em desenvolvimento o React monta,
  // desmonta e remonta o mesmo componente (StrictMode).
  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      pararCamera();
    };
  }, [pararCamera]);

  const entregar = useCallback(
    (texto: string) => {
      const limpo = texto.trim();
      if (!limpo) return;
      pararCamera();
      setEstado("parado");
      aoLer(limpo);
    },
    [aoLer, pararCamera],
  );

  /** Um frame do vídeo desenhado num canvas — a matéria-prima do jsQR. */
  const capturarFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const largura = video.videoWidth;
    const altura = video.videoHeight;
    if (!largura || !altura) return null;

    canvas.width = largura;
    canvas.height = altura;

    const contexto = canvas.getContext("2d", { willReadFrequently: true });
    if (!contexto) return null;

    contexto.drawImage(video, 0, 0, largura, altura);
    return contexto.getImageData(0, 0, largura, altura);
  }, []);

  const iniciarCamera = useCallback(async () => {
    setErro(null);
    setDica(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setEstado("erro");
      setErro(
        window.isSecureContext === false
          ? "A câmera só funciona em endereço seguro (HTTPS) ou em localhost. Use a foto do QR ou digite o texto da etiqueta."
          : "Este navegador não expõe a câmera. Use a foto do QR ou digite o texto da etiqueta.",
      );
      return;
    }

    setEstado("iniciando");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (falha) {
      setEstado("erro");
      const nome = falha instanceof DOMException ? falha.name : "";
      if (nome === "NotAllowedError" || nome === "SecurityError") {
        setErro(
          "Permissão de câmera negada. Libere a câmera para este site nas configurações do navegador (ícone de cadeado na barra de endereço) e tente de novo — ou envie a foto do QR.",
        );
      } else if (nome === "NotFoundError" || nome === "OverconstrainedError") {
        setErro(
          "Nenhuma câmera disponível neste aparelho. Envie a foto do QR ou digite o texto da etiqueta.",
        );
      } else {
        setErro(
          "Não consegui abrir a câmera. Feche outros apps que a estejam usando e tente de novo.",
        );
      }
      return;
    }

    // A tela saiu enquanto a permissão era resolvida: a limpeza já rodou e não
    // viu este stream. Desligar aqui, ANTES de guardá-lo, é o que fecha a
    // câmera — guardá-lo primeiro só criaria um dono sem quem o desligue.
    if (!montadoRef.current) {
      stream.getTracks().forEach((faixa) => faixa.stop());
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      pararCamera();
      return;
    }

    video.srcObject = stream;
    try {
      await video.play();
    } catch {
      /* alguns browsers só tocam após interação; o loop tolera readyState baixo */
    }

    // Mesma corrida, um await depois: a limpeza pode ter rodado durante o
    // `play()`. Sem esta guarda, o `lendoRef = true` abaixo ressuscitaria o
    // laço de leitura sobre um vídeo já desligado, para sempre.
    if (!montadoRef.current) {
      pararCamera();
      return;
    }

    setEstado("lendo");
    lendoRef.current = true;

    const Detector = detectorNativo();
    const detector = Detector
      ? new Detector({ formats: ["qr_code"] })
      : null;

    // jsQR só é baixado quando o detector nativo não existe (iOS/Safari).
    const decodificarPorBiblioteca = detector
      ? null
      : (await import("jsqr")).default;

    if (!detector) {
      setDica(
        "Aponte para o QR e mantenha o celular parado por um instante — a leitura por software é um pouco mais lenta.",
      );
    }

    const passo = async () => {
      if (!lendoRef.current) return;

      try {
        if (detector) {
          const quadro = videoRef.current;
          if (quadro && quadro.readyState >= 2) {
            const achados = await detector.detect(quadro);
            const primeiro = achados[0]?.rawValue;
            if (primeiro) {
              entregar(primeiro);
              return;
            }
          }
        } else if (decodificarPorBiblioteca) {
          const frame = capturarFrame();
          if (frame) {
            const achado = decodificarPorBiblioteca(
              frame.data,
              frame.width,
              frame.height,
              { inversionAttempts: "attemptBoth" },
            );
            if (achado?.data) {
              entregar(achado.data);
              return;
            }
          }
        }
      } catch {
        /* frame ruim: tenta o próximo em vez de derrubar a leitura */
      }

      if (!lendoRef.current) return;
      // ~7 quadros por segundo: suficiente para QR e leve para celular antigo.
      loopRef.current = window.setTimeout(passo, 140);
    };

    void passo();
  }, [capturarFrame, entregar, pararCamera]);

  // Abertura automática, quando pedida. O `setTimeout` não é enfeite: abrir a
  // câmera muda estado, e disparar isso no corpo do efeito encadeia renders
  // (a regra `set-state-in-effect` do React). Só na MONTAGEM — reabrir sozinho
  // depois de o operador ter parado a câmera seria hostil.
  useEffect(() => {
    if (!iniciarAberto) return;
    const agendado = window.setTimeout(() => void iniciarCamera(), 0);
    return () => window.clearTimeout(agendado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Fallback final da câmera: decodificar a FOTO do QR. */
  const decodificarArquivo = useCallback(
    async (arquivo: File) => {
      setErro(null);
      setDica(null);
      setDecodificandoArquivo(true);

      try {
        const bitmap = await createImageBitmap(arquivo);
        // Canvas próprio (e não o do vídeo): a foto tem outras dimensões e
        // mexer no canvas da prévia atrapalharia uma leitura ao vivo em curso.
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        const contexto = canvas.getContext("2d", { willReadFrequently: true });
        if (!contexto) throw new Error("sem contexto 2d");

        contexto.drawImage(bitmap, 0, 0);
        const frame = contexto.getImageData(0, 0, canvas.width, canvas.height);
        bitmap.close?.();

        const jsQR = (await import("jsqr")).default;
        const achado = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: "attemptBoth",
        });

        if (achado?.data) {
          entregar(achado.data);
          return;
        }

        setErro(
          "Não achei um QR nessa foto. Aproxime, evite reflexo e enquadre só a etiqueta — ou digite o texto.",
        );
      } catch {
        setErro("Não consegui ler essa imagem. Tente outra foto ou digite o texto.");
      } finally {
        setDecodificandoArquivo(false);
      }
    },
    [entregar],
  );

  const camaraAtiva = estado === "lendo" || estado === "iniciando";

  return (
    <Cartao>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-conteudo">{titulo}</h2>
        {camaraAtiva ? (
          <Botao
            variante="fantasma"
            onClick={() => {
              pararCamera();
              setEstado("parado");
            }}
          >
            Parar
          </Botao>
        ) : null}
      </div>

      <div
        className={
          camaraAtiva
            ? "relative mb-3 overflow-hidden rounded-xl bg-black"
            : "hidden"
        }
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="aspect-3/4 w-full object-cover"
        />
        {/* Mira: dá ao operador o alvo do enquadramento. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="size-2/3 rounded-2xl border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        {estado === "iniciando" ? (
          <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white">
            Abrindo a câmera…
          </p>
        ) : null}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!camaraAtiva ? (
        <div className="space-y-2">
          <Botao tamanho="grande" onClick={() => void iniciarCamera()}>
            Abrir a câmera
          </Botao>

          <label className="block">
            <span className="sr-only">Enviar foto do QR</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="block w-full cursor-pointer rounded-xl border border-borda-forte bg-superficie px-3 py-3 text-sm text-conteudo-suave file:mr-3 file:min-h-8 file:rounded-lg file:border-0 file:bg-superficie-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-conteudo"
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = "";
                if (arquivo) void decodificarArquivo(arquivo);
              }}
            />
          </label>
          {decodificandoArquivo ? (
            <p className="text-sm text-conteudo-suave">Lendo a imagem…</p>
          ) : null}
        </div>
      ) : null}

      {erro ? (
        <Aviso tom="erro" className="mt-3">
          {erro}
        </Aviso>
      ) : null}
      {dica ? (
        <Aviso tom="neutro" className="mt-3">
          {dica}
        </Aviso>
      ) : null}

      <div className="mt-3 border-t border-borda pt-3">
        {manualAberto ? (
          <form
            className="space-y-2"
            onSubmit={(evento) => {
              evento.preventDefault();
              entregar(textoManual);
            }}
          >
            <AreaTexto
              rotulo="Texto da etiqueta"
              bruto
              value={textoManual}
              onChange={(evento) => setTextoManual(evento.target.value)}
              placeholder="Cole ou digite exatamente o conteúdo do QR"
              ajuda="Vai cru para a API: quem interpreta o payload é o servidor."
            />
            <div className="flex gap-2">
              <Botao type="submit" disabled={!textoManual.trim()}>
                {rotuloConfirmar}
              </Botao>
              <Botao
                type="button"
                variante="fantasma"
                onClick={() => setManualAberto(false)}
              >
                Cancelar
              </Botao>
            </div>
          </form>
        ) : (
          <Botao
            variante="secundario"
            onClick={() => setManualAberto(true)}
            className="w-full"
          >
            Digitar ou colar o texto do QR
          </Botao>
        )}
      </div>
    </Cartao>
  );
}
