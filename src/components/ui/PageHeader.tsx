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
    <div className="flex flex-col justify-between gap-4 pb-1 md:flex-row md:items-center">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold leading-tight text-slate-900 sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
