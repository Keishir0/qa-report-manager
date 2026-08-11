import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  variant?: "dot" | "pill";
}

type StatusColor = "ok" | "bad" | "warn" | "neutral";

const STATUS_COLOR: Record<string, StatusColor> = {
  "Aprovado QA": "ok",
  Passou: "ok",
  "Reprovado QA": "bad",
  Falhou: "bad",
  Bloqueado: "warn",
  "Não Executado": "neutral",
  "Não executado": "neutral",
};

const DOT_CLASS: Record<StatusColor, string> = {
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  neutral: "bg-neutral",
};

const TEXT_CLASS: Record<StatusColor, string> = {
  ok: "text-ok",
  bad: "text-bad",
  warn: "text-warn",
  neutral: "text-neutral",
};

const PILL_CLASS: Record<StatusColor, string> = {
  ok: "bg-ok/10 border-ok/30",
  bad: "bg-bad/10 border-bad/30",
  warn: "bg-warn/10 border-warn/30",
  neutral: "bg-neutral/10 border-neutral/30",
};

export function getStatusColor(status: string): StatusColor {
  return STATUS_COLOR[status] || "neutral";
}

export function getStatusColorVar(status: string) {
  return `rgb(var(--${getStatusColor(status)}))`;
}

export default function StatusBadge({
  status,
  size = "md",
  variant = "dot",
}: StatusBadgeProps) {
  const color = STATUS_COLOR[status] || "neutral";
  const textSize = size === "sm" ? "text-[11px]" : "text-[11.5px]";

  if (variant === "pill") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-bold tracking-wide ${textSize} ${TEXT_CLASS[color]} ${PILL_CLASS[color]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[color]}`} />
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-bold ${textSize} ${TEXT_CLASS[color]}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[color]}`} />
      {status}
    </span>
  );
}
