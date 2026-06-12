import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-1">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex gap-2 items-center w-full sm:w-auto">{children}</div>}
    </div>
  );
}
