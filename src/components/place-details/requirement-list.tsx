import { AlertTriangle, Check, CircleHelp } from "lucide-react";
import type { DetailListItem, DetailTone } from "@/data/demo-place-details";

type RequirementListProps = {
  items: DetailListItem[];
};

const toneClass: Record<DetailTone, string> = {
  positive: "place-detail-requirement-icon-positive",
  warning: "place-detail-requirement-icon-warning",
  neutral: "place-detail-requirement-icon-neutral",
  unknown: "place-detail-requirement-icon-unknown",
};

function RequirementIcon({ status }: { status: DetailTone }) {
  if (status === "positive") {
    return <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0" />;
  }

  if (status === "warning") {
    return <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />;
  }

  return <CircleHelp aria-hidden="true" size={18} className="mt-0.5 shrink-0" />;
}

export function RequirementList({ items }: RequirementListProps) {
  return (
    <ul className="place-detail-requirements">
      {items.map((item) => (
        <li
          key={`${item.label}-${item.status}`}
          className="place-detail-requirement"
        >
          <span className={toneClass[item.status]}>
            <RequirementIcon status={item.status} />
          </span>
          <span className="min-w-0">
            {item.label}
            {item.note ? (
              <span className="place-detail-requirement-note">
                {item.note}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
