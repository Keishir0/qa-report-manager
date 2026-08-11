import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    label: string;
    value: string;
    isPositive?: boolean;
  };
  statusColor?: "brand" | "green" | "red" | "amber" | "slate";
  onClick?: () => void;
  isActive?: boolean;
}

type Color = "accent" | "ok" | "bad" | "warn" | "neutral";

const STATUS_COLOR_MAP: Record<NonNullable<MetricCardProps["statusColor"]>, Color> = {
  brand: "accent",
  green: "ok",
  red: "bad",
  amber: "warn",
  slate: "neutral",
};

const DOT_CLASS: Record<Color, string> = {
  accent: "bg-accent",
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  neutral: "bg-neutral",
};

const TEXT_CLASS: Record<Color, string> = {
  accent: "text-accent",
  ok: "text-ok",
  bad: "text-bad",
  warn: "text-warn",
  neutral: "text-neutral",
};

export default function MetricCard({
  title,
  value,
  trend,
  statusColor = "brand",
  onClick,
  isActive = false,
}: MetricCardProps) {
  const color = STATUS_COLOR_MAP[statusColor];
  const isInteractive = Boolean(onClick);

  const card = (
    <div
      className={`flex min-h-[125px] flex-col justify-between rounded-[14px] border bg-panel p-[18px] transition-colors duration-200 ${
        isActive
          ? "border-accent ring-[3px] ring-accent/20"
          : isInteractive
          ? "border-line group-hover:border-accent/40 group-focus-visible:border-accent group-focus-visible:ring-[3px] group-focus-visible:ring-accent/20"
          : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-faint">
          {title}
        </span>
        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[color]}`} />
      </div>

      <div className="mt-3">
        <span className="block text-[34px] font-extrabold leading-none tracking-[-0.03em] text-fg">
          {value}
        </span>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-[11.5px]">
            <span className={`font-bold ${TEXT_CLASS[color]}`}>{trend.value}</span>
            <span className="font-medium text-faint">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group w-full cursor-pointer rounded-[14px] text-left outline-none"
        aria-label={`Filtrar dashboard por ${title}`}
        aria-pressed={isActive}
        title={`Filtrar dashboard por ${title}`}
      >
        {card}
      </button>
    );
  }

  return card;
}
