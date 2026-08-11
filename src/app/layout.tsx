import type { Metadata } from "next";
import { cookies } from "next/headers";
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
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="pt-BR" className="h-full" data-theme={theme}>
      <body className="min-h-full bg-surface font-sans">
        <AppShell user={user} theme={theme}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}


