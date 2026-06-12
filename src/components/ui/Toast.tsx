"use client";

import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-x-4 bottom-4 z-[60] flex max-w-md items-center gap-3 rounded-xl border px-4 py-3.5 shadow-md transition-all duration-300 transform translate-y-0 animate-bounce-short sm:inset-x-auto sm:bottom-6 sm:right-6 ${
        type === "success"
          ? "bg-green-50 text-green-800 border-green-200"
          : "bg-red-50 text-red-800 border-red-200"
      }`}
    >
      {type === "success" ? (
        <div className="p-1 bg-green-500 rounded-full text-white">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      ) : (
        <div className="p-1 bg-red-500 rounded-full text-white">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      )}
      <span className="min-w-0 flex-1 text-sm font-semibold">{message}</span>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
        aria-label="Fechar notificação"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
