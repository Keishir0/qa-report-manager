import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
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
      <input
        id={id}
        ref={ref}
        className={`min-w-0 max-w-full w-full px-3.5 py-2 border rounded-lg text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-0 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
            : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
