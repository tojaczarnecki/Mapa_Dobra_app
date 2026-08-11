import { AlertTriangle, Check, CircleHelp } from "lucide-react";
import type { DetailListItem, DetailTone } from "@/data/demo-place-details";

type RequirementListProps = {
  items: DetailListItem[];
};

const toneClass: Record<DetailTone, string> = {
  positive: "text-brand-strong",
  warning: "text-urgent",
  neutral: "text-muted-foreground",
  unknown: "text-muted-foreground",
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
    <ul className="grid min-w-0 gap-2">
      {items.map((item) => (
        <li
          key={`${item.label}-${item.status}`}
          className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-6 text-foreground"
        >
          <span className={toneClass[item.status]}>
            <RequirementIcon status={item.status} />
          </span>
          <span className="min-w-0">
            {item.label}
            {item.note ? (
              <span className="block text-sm font-semibold text-muted-foreground">
                {item.note}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
