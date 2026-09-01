import type { DetailListItem } from "@/data/demo-place-details";
import { UnknownDataNotice } from "@/components/ui/unknown-data-notice";
import { RequirementList } from "./requirement-list";

type AccessibilityListProps = {
  items: DetailListItem[];
};

function publicLabel(item: DetailListItem) {
  if (item.status !== "neutral" || /^brak\b/iu.test(item.label)) return item.label;

  const labels: Record<string, string> = {
    "winda": "Brak windy",
    "dostępny prysznic": "Brak dostępnego prysznica",
    "usługi opiekuńcze": "Brak usług opiekuńczych",
  };
  return labels[item.label.toLocaleLowerCase("pl-PL")] ?? `Brak ${item.label.toLocaleLowerCase("pl-PL")}`;
}

export function AccessibilityList({ items }: AccessibilityListProps) {
  if (items.length === 0) {
    return (
      <UnknownDataNotice>Nie mamy jeszcze potwierdzonych informacji o dostępności tego miejsca.</UnknownDataNotice>
    );
  }

  return <RequirementList items={items.map((item) => ({ ...item, label: publicLabel(item) }))} />;
}
