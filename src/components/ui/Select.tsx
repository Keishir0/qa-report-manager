import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: (string | SelectOption)[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, children, className = "", id, ...props },
  ref
) {
  return (
    <div className="min-w-0 w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-slate-700 mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={`min-w-0 max-w-full w-full px-3.5 py-2 border rounded-lg text-sm bg-white transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-0 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
        } ${className}`}
        {...props}
      >
        {children ? (
          children
        ) : (
          <>
            <option value="">Selecione...</option>
            {options?.map((opt) => {
              const val = typeof opt === "string" ? opt : opt.value;
              const lbl = typeof opt === "string" ? opt : opt.label;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </>
        )}
      </select>
      {error && (
        <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
});

Select.displayName = "Select";

export default Select;
