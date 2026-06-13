"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

interface ReportActionsMenuProps {
  reportId: string;
  reportCode: string;
  canWrite: boolean;
  onDuplicate: (id: string, code: string) => void;
  onDelete: (id: string, code: string) => void;
}

const MENU_WIDTH = 176;
const VIEW_MENU_HEIGHT = 52;
const WRITE_MENU_HEIGHT = 176;
const VIEWPORT_MARGIN = 8;

export default function ReportActionsMenu({
  reportId,
  reportCode,
  canWrite,
  onDuplicate,
  onDelete,
}: ReportActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuHeight = canWrite ? WRITE_MENU_HEIGHT : VIEW_MENU_HEIGHT;
      const fitsBelow = rect.bottom + VIEWPORT_MARGIN + menuHeight <= window.innerHeight;
      const top = fitsBelow
        ? rect.bottom + VIEWPORT_MARGIN
        : Math.max(VIEWPORT_MARGIN, rect.top - menuHeight - VIEWPORT_MARGIN);
      const left = Math.min(
        window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, rect.right - MENU_WIDTH),
      );

      setPosition({ top, left });
    };

    const closeMenu = () => setIsOpen(false);
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        buttonRef.current?.focus();
      }
    };

    updatePosition();
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [canWrite, isOpen]);

  const closeMenu = () => setIsOpen(false);

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Ações do relatório ${reportCode}`}
      className="fixed z-[100] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-900/10"
      style={{ top: position.top, left: position.left }}
    >
      <Link
        href={`/reports/${reportId}`}
        role="menuitem"
        onClick={closeMenu}
        className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Ver
      </Link>

      {canWrite && (
        <>
          <Link
            href={`/reports/${reportId}?edit=true`}
            role="menuitem"
            onClick={closeMenu}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Editar
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              onDuplicate(reportId, reportCode);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Duplicar
          </button>
          <div className="mx-2 my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              closeMenu();
              onDelete(reportId, reportCode);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Excluir
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Abrir ações do relatório ${reportCode}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(menu, document.body)}
    </div>
  );
}
