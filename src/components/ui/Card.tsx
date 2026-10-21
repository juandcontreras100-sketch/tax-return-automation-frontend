import type { ComponentPropsWithoutRef } from "react";

type CardProps = ComponentPropsWithoutRef<"section">;

export default function Card({ className = "", ...props }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}
