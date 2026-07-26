import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Cabecalho } from "@/components/cabecalho";
import { PortaoDeAcesso } from "@/components/portao-de-acesso";
import { Provedores } from "@/components/providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRAEL Conferência",
  description:
    "Conferência de identidade e rastreabilidade de transformadores na linha de produção.",
};

export const viewport: Viewport = {
  // Mobile-first: a tela é o celular do operador, em pé, na linha.
  width: "device-width",
  initialScale: 1,
  // Claro/escuro segue o aparelho (`prefers-color-scheme`, em globals.css).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1210" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Provedores>
          <Cabecalho />
          {/* Sem JWT não existe tela útil: o portão vale para o app inteiro. */}
          <PortaoDeAcesso>
            <main className="mx-auto w-full max-w-3xl flex-1 p-4">
              {children}
            </main>
          </PortaoDeAcesso>
        </Provedores>
      </body>
    </html>
  );
}
