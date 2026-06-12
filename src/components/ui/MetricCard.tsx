import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    label: string;
    value: string;
    isPositive?: boolean;
  };
  statusColor?: "brand" | "green" | "red" | "amber" | "slate";
}

export default function MetricCard({
  title,
  value,
  icon,
  trend,
  statusColor = "brand",
}: MetricCardProps) {
  const iconColors = {
    brand: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    green: "bg-green-50 text-green-600 border border-green-100",
    red: "bg-red-50 text-red-600 border border-red-100",
    amber: "bg-amber-50 text-amber-600 border border-amber-100",
    slate: "bg-slate-50 text-slate-600 border border-slate-100",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[125px]">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            {title}
          </span>
          <span className="text-3xl font-extrabold text-slate-900 leading-none">
            {value}
          </span>
        </div>
        <div className={`p-2.5 rounded-lg ${iconColors[statusColor]}`}>{icon}</div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={`font-bold ${
              trend.isPositive === undefined
                ? "text-slate-500"
                : trend.isPositive
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-400 font-medium">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
