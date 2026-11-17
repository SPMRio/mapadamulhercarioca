import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapa da Mulher Carioca 2026",
  description:
    "Dados para enxergar as mulheres do Rio. Um retrato das desigualdades, conquistas e condições de vida das mulheres cariocas.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@48,400,0,0" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
