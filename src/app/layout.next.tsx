import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "Gestão de Compensação de Feriados",
  description: "Gestão de campanhas e escolhas de folgas compensatórias.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
