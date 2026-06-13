import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "QA Report Manager",
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
      <body className="min-h-full bg-slate-50">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}


