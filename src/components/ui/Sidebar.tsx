"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
          className="w-5 h-5"
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
      icon: (
        <svg
          className="w-5 h-5"
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
      icon: (
        <svg
          className="w-5 h-5"
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
  ];

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-lg bg-brand-50 p-2 text-brand">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight text-slate-900">
              QA Report Manager
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Gestão de testes
            </span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
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
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside
        id="main-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col justify-between border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 lg:z-30 lg:w-60 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
      <div className="p-5 sm:p-6">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 rounded-lg text-brand">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 block leading-tight text-lg">
              QA Report
            </span>
            <span className="text-xs text-gray-500 block">Manager</span>
          </div>
          </Link>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Versão</span>
          <span className="font-mono bg-gray-200/50 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
            v0.1.0
          </span>
        </div>
      </div>
      </aside>
    </>
  );
}
