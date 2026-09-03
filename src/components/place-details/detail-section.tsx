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
        "place-detail-section w-full min-w-0 p-4 sm:p-5",
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
