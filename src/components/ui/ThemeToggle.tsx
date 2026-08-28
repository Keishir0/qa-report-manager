"use client";

import { useState } from "react";

type Theme = "light" | "dark";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1.5m0 15V21m9-9h-1.5m-15 0H3m15.36-6.36l-1.06 1.06M6.7 17.3l-1.06 1.06m0-12.72L6.7 6.7m10.6 10.6l1.06 1.06M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function setThemeCookie(theme: Theme) {
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function select(next: Theme) {
    if (next === theme) return;
    setThemeCookie(next);
    setTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="flex h-[34px] w-full items-center rounded-[10px] border border-line bg-panel2 p-0.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === "light"}
        onClick={() => select("light")}
        className={`flex h-full flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[11.5px] font-semibold transition-[color,background-color,box-shadow] duration-200 ${
          theme === "light"
            ? "bg-panel text-fg shadow-[inset_0_0_0_1px_rgb(var(--line))]"
            : "text-faint hover:text-muted"
        }`}
      >
        <SunIcon className="h-3.5 w-3.5" />
        Claro
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === "dark"}
        onClick={() => select("dark")}
        className={`flex h-full flex-1 items-center justify-center gap-1.5 rounded-[8px] text-[11.5px] font-semibold transition-[color,background-color,box-shadow] duration-200 ${
          theme === "dark"
            ? "bg-panel text-fg shadow-[inset_0_0_0_1px_rgb(var(--line))]"
            : "text-faint hover:text-muted"
        }`}
      >
        <MoonIcon className="h-3.5 w-3.5" />
        Escuro
      </button>
    </div>
  );
}
