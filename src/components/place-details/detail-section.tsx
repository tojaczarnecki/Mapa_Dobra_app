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
        "w-full min-w-0 border-b border-border bg-surface py-4 first:border-t-0 sm:py-5",
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
