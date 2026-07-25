"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ConferenciaPage() {
  const [apiStatus, setApiStatus] = useState<"verificando" | "online" | "offline">(
    "verificando",
  );

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then((res) => setApiStatus(res.ok ? "online" : "offline"))
      .catch(() => setApiStatus("offline"));
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
