import type { ReactNode } from "react";

type DetailSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function DetailSection({
  title,
  children,
  className = "",
  action,
}: DetailSectionProps) {
  return (
    <section
      className={["place-detail-section", className].filter(Boolean).join(" ")}
    >
      <div className="place-detail-section-heading">
        <h2>{title}</h2>
        {action ? <div className="place-detail-section-action">{action}</div> : null}
      </div>
      <div className="place-detail-section-body">{children}</div>
    </section>
  );
}
