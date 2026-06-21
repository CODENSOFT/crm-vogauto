"use client";

import { forwardRef } from "react";

const fieldBase =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-100 disabled:text-slate-500";

const labelBase = "text-xs font-semibold uppercase tracking-wide text-slate-600";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className={labelBase}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`${fieldBase} ${error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""} ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-600">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className = "", id, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className={labelBase}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={`${fieldBase} w-full appearance-none pr-9 ${className}`}
            {...props}
          >
            {children}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
