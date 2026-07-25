"use client";

import { useEffect, useState } from "react";

// No celular da rede local, "localhost" apontaria para o próprio celular:
// sem env definida, deriva a API do host que serviu a página.
function apiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3001`;
  }
  return "http://localhost:3001";
}

export default function ConferenciaPage() {
  const [apiStatus, setApiStatus] = useState<"verificando" | "online" | "offline">(
    "verificando",
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch(`${apiUrl()}/`, { signal: controller.signal })
      .then((res) => setApiStatus(res.ok ? "online" : "offline"))
      .catch(() => setApiStatus("offline"))
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Conferência de transformador</h1>
      <p className="text-sm text-gray-500">
        Fluxo da Fase 3: ler QR da etiqueta, fotografar a peça e ver o veredito
        campo a campo.
      </p>
      <p className="text-sm">
        API:{" "}
        <span
          className={
            apiStatus === "online"
              ? "text-green-600"
              : apiStatus === "offline"
                ? "text-red-600"
                : "text-gray-400"
          }
        >
          {apiStatus}
        </span>
      </p>
    </main>
  );
}
