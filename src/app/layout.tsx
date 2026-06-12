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
      <body className="min-h-full bg-slate-50">
        <Sidebar />
        <main className="min-w-0 px-4 pb-8 pt-20 sm:px-6 lg:ml-60 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}

