import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageContainer({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: "standard" | "wide" | "full";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-5 sm:px-7 sm:py-8 lg:px-10 lg:py-10",
        width === "standard" && "max-w-5xl",
        width === "wide" && "max-w-6xl",
        width === "full" && "max-w-7xl",
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 border-b border-border/70 pb-6 sm:mb-8 sm:pb-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </p>
          <h1 className="text-balance font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          <div className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            {description}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "border-border bg-card",
  info: "border-blue-200 bg-blue-50/70 text-blue-950",
  success: "border-emerald-200 bg-emerald-50/70 text-emerald-950",
  warning: "border-amber-200 bg-amber-50/70 text-amber-950",
  danger: "border-red-200 bg-red-50/70 text-red-950",
};

export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">{children}</div>;
}

export function MetricCard({
  value,
  label,
  icon,
  tone = "neutral",
}: {
  value: number | string;
  label: string;
  icon?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border px-3 py-3 sm:min-w-36 sm:px-4", toneClasses[tone])}>
      <div className="flex items-center gap-2">
        {icon ? <span className="shrink-0 opacity-70">{icon}</span> : null}
        <span className="text-xl font-semibold tabular-nums">{value}</span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center sm:py-16">
      {icon ? <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
