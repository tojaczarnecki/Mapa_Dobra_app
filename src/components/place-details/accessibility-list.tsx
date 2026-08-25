import type { DetailListItem } from "@/data/demo-place-details";
import { RequirementList } from "./requirement-list";

type AccessibilityListProps = {
  items: DetailListItem[];
};

export function AccessibilityList({ items }: AccessibilityListProps) {
  if (items.length === 0) {
    return (
      <p className="place-detail-requirement-note">
        Dostępność nie została potwierdzona.
      </p>
    );
  }

  return <RequirementList items={items} />;
}
