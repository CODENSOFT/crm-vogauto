"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand hover:bg-brand-dark text-white shadow-sm focus-visible:ring-brand/40",
  secondary:
    "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 focus-visible:ring-slate-300",
  danger:
    "bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-300",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-700 focus-visible:ring-slate-200",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading, children, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
