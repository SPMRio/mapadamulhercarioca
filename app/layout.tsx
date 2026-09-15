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
      <body>{children}</body>
    </html>
  );
}
