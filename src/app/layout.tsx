import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";

export const metadata: Metadata = {
  title: "QA Report Manager",
  description: "Gerenciador de Relatórios de Testes e Bugs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full flex bg-slate-50">
        <Sidebar />
        <main className="flex-1 ml-60 p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
