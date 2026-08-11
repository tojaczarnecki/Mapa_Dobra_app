import type { ReactNode } from "react";

type DetailSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function DetailSection({
  title,
  children,
  className = "",
}: DetailSectionProps) {
  return (
    <section
      className={[
        "w-full min-w-0 rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5",
        className,
      ].join(" ")}
    >
      <h2 className="text-xl font-extrabold leading-tight text-foreground">
        {title}
      </h2>
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}
