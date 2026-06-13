import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = "primary",
    isLoading = false,
    icon,
    className = "",
    disabled,
    type = "button",
    ...props
  },
  ref
) {
  const baseStyles =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-xs";

  const variants = {
    primary:
      "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
    secondary:
      "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 focus:ring-2 focus:ring-slate-300",
    danger:
      "bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
});

export default Button;
