"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AuthUser } from "@/lib/auth";
import BrandBugIcon from "@/components/ui/BrandBugIcon";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface SidebarCounts {
  relatorios?: number;
  webhooks?: number;
  pendencias?: number;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Sidebar({
  user,
  theme,
  counts,
}: {
  user: AuthUser;
  theme: "light" | "dark";
  counts?: SidebarCounts;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const links = [
    {
      name: "Dashboard",
      href: "/",
      icon: (
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Relatórios",
      href: "/reports",
      count: counts?.relatorios,
      icon: (
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      name: "Novo Teste",
      href: "/reports/new",
      roles: ["ADMIN", "QA"],
      icon: (
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: "Webhooks",
      href: "/webhooks",
      roles: ["ADMIN"],
      count: counts?.webhooks,
      icon: (
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 01-5.656-5.656l1.172-1.172m9.314 2.828l1.172-1.172a4 4 0 00-5.656-5.656l-2 2a4 4 0 000 5.656"
          />
        </svg>
      ),
    },
    {
      name: "Pendencias",
      href: "/pendencias",
      roles: ["ADMIN", "QA"],
      count: counts?.pendencias,
      icon: (
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m4 2a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
    {
      name: "Usuários",
      href: "/usuarios",
      roles: ["ADMIN"],
      icon: (
        <svg
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a4 4 0 00-4-4h-1m0 6H7m10 0v-2c0-1.1-.3-2.1-.9-3M7 20H2v-2a4 4 0 014-4h1m0 6v-2c0-1.1.3-2.1.9-3m8.2 0a5 5 0 00-8.2 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
  ].filter((link) => !link.roles || link.roles.includes(user.role));

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-panel/95 px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-accent text-accentFg">
            <BrandBugIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-fg">
              QA Report
            </span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              Manager
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-line bg-panel text-fg2 transition-colors hover:bg-panel2"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isOpen}
          aria-controls="main-navigation"
        >
          {isOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside
        id="main-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col justify-between border-r border-line bg-surface [transition:transform_300ms,background-color_200ms_ease,border-color_200ms_ease] lg:z-30 lg:w-[232px] lg:max-w-none lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 sm:p-4">
          {/* Marca */}
          <div className="mb-7 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-accent text-accentFg">
                <BrandBugIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold leading-tight text-fg">
                  QA Report
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  Manager
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] text-faint hover:bg-panel2 lg:hidden"
              aria-label="Fechar menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <span className="mb-2 block px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
            Operação
          </span>

          {/* Menu Navigation */}
          <nav className="space-y-1">
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : link.href === "/reports"
                  ? pathname.startsWith("/reports") && !pathname.startsWith("/reports/new")
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[13.5px] font-semibold transition-[color,background-color,box-shadow] duration-200 ${
                    isActive
                      ? "bg-panel text-fg shadow-[inset_0_0_0_1px_rgb(var(--line))]"
                      : "text-muted hover:bg-panel2 hover:text-fg2"
                  }`}
                >
                  {link.icon}
                  <span className="flex-1 truncate">{link.name}</span>
                  {typeof link.count === "number" && (
                    <span className="font-mono text-[10.5px] text-faint">{link.count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Rodapé */}
        <div className="border-t border-line p-4">
          <ThemeToggle initialTheme={theme} />

          <div className="my-4 border-t border-hairline" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel2 text-[11px] font-bold text-fg2 shadow-[inset_0_0_0_1px_rgb(var(--line))]">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-fg">{user.name}</div>
                <div className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
                  {user.role}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {user.role === "ADMIN" && (
                <Link
                  href="/logs"
                  className="rounded-[8px] p-1.5 text-faint transition-colors hover:bg-panel2 hover:text-fg2"
                  title="Logs do Sistema"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                title="Sair"
                aria-label="Sair"
                className="rounded-[8px] p-1.5 text-faint transition-colors hover:bg-panel2 hover:text-bad disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
