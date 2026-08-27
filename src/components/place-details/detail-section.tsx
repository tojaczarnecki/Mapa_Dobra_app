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
    <section className={["md-detail-section", className].join(" ")}>
      <h2>{title}</h2>
      <div className="md-detail-section-body min-w-0">{children}</div>
    </section>
  );
}
