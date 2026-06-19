import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const getColors = (statusStr: string) => {
    switch (statusStr) {
      case "Aprovado QA":
      case "Passou":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Reprovado QA":
      case "Falhou":
      case "Bloqueado":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "Não Executado":
      case "Não executado":
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const dotColors = {
    "Aprovado QA": "bg-emerald-500",
    Passou: "bg-emerald-500",
    "Reprovado QA": "bg-rose-500",
    Falhou: "bg-rose-500",
    Bloqueado: "bg-orange-500",
    "Não Executado": "bg-slate-400",
    "Não executado": "bg-slate-400",
  };

  const dotColorClass =
    dotColors[status as keyof typeof dotColors] || "bg-slate-400";

  const sizeClasses =
    size === "sm"
      ? "min-w-[7.5rem] px-2 py-0.5 text-[11px]"
      : "min-w-[8.25rem] px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap font-bold border rounded-full tracking-wide shadow-xs ${sizeClasses} ${getColors(
        status
      )}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColorClass}`} />
      {status}
    </span>
  );
}
