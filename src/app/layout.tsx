import type { Metadata } from "next";
import "@fontsource/open-sans/latin-400.css";
import "@fontsource/open-sans/latin-500.css";
import "@fontsource/open-sans/latin-600.css";
import "@fontsource/open-sans/latin-700.css";
import "@fontsource/open-sans/latin-800.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "QA Report Manager",
  icons: {
    icon: "/favicon.svg",
  },
  description: "Gerenciador de Relatórios de Testes e Bugs",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-slate-50 font-sans">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}


