type ProgressBarProps = {
  value: number;
  label: string;
};

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped}% completado`}
      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200"
    >
      <div
        aria-hidden="true"
        className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
          clamped === 100 ? "bg-emerald-500" : "bg-indigo-600"
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
