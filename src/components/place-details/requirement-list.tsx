import type { DetailListItem, DetailTone } from "@/data/demo-place-details";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { detailToneToPublicStatus } from "@/lib/public/status-presentation";

type RequirementListProps = {
  items: DetailListItem[];
  maxVisible?: number;
};

const toneClass: Record<DetailTone, string> = {
  positive: "text-brand-strong",
  warning: "text-urgent",
  neutral: "text-muted-foreground",
  unknown: "text-muted-foreground",
};

export function RequirementList({ items, maxVisible }: RequirementListProps) {
  if (items.length === 0) {
    return (
      <p className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-6 text-muted-foreground">
        <StatusIndicator status="unknown">Brak potwierdzonych informacji o warunkach. Przed wizytą warto skontaktować się z miejscem.</StatusIndicator>
      </p>
    );
  }

  const visibleItems = maxVisible ? items.slice(0, maxVisible) : items;
  const hiddenItems = maxVisible ? items.slice(maxVisible) : [];
  const hasCollapsedUnknown = visibleItems.some((item) => item.status === "unknown");

  const list = (listItems: DetailListItem[], summarizeUnknown = false) => {
    const knownItems = summarizeUnknown
      ? listItems.filter((item) => item.status !== "unknown")
      : listItems;
    const unknownCount = summarizeUnknown
      ? listItems.length - knownItems.length
      : 0;

    return (
    <ul className="grid min-w-0 gap-2">
      {knownItems.map((item) => (
        <li
          key={`${item.label}-${item.status}`}
          className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-6 text-foreground"
        >
          <span className="min-w-0">
            <StatusIndicator status={detailToneToPublicStatus(item.status)} className={toneClass[item.status]}>
              {item.label}
            </StatusIndicator>
            {item.note ? (
              <span className="block text-sm font-semibold text-muted-foreground">
                {item.note}
              </span>
            ) : null}
          </span>
        </li>
      ))}
      {unknownCount > 0 ? (
        <li className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-6 text-muted-foreground">
          <StatusIndicator status="unknown">
            Pozostałe warunki nie są jeszcze potwierdzone.
          </StatusIndicator>
        </li>
      ) : null}
    </ul>
    );
  };

  return (
    <div className="min-w-0">
      {list(visibleItems, true)}
      {hiddenItems.length || hasCollapsedUnknown ? (
        <details className="mt-3 border-t border-border pt-2">
          <summary className="touch-target cursor-pointer py-2 text-sm font-extrabold text-brand-strong">Sprawdź wszystkie warunki</summary>
          <div className="pt-2">{list(items)}</div>
        </details>
      ) : null}
    </div>
  );
}
