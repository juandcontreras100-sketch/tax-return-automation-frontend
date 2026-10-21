import { forwardRef, type ComponentPropsWithoutRef } from "react";

type InputProps = ComponentPropsWithoutRef<"input">;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
      {...props}
    />
  );
});

export default Input;
