"use client";

import {
  CalendarCheck2,
  Check,
  CircleHelp,
  FileCheck2,
  FileText,
  HandCoins,
  MapPin,
  PhoneCall,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { createElement, type ComponentType } from "react";
import { useState } from "react";
import type { DetailListItem, DetailTone } from "@/data/demo-place-details";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { detailToneToPublicStatus } from "@/lib/public/status-presentation";
import { InlineDisclosure } from "./inline-disclosure";

type RequirementListProps = { items: DetailListItem[]; maxVisible?: number };
type RequirementIcon = ComponentType<{ "aria-hidden"?: boolean; size?: number }>;

const toneClass: Record<DetailTone, string> = {
  positive: "requirements-status-positive",
  warning: "requirements-status-condition",
  neutral: "requirements-status-absent",
  unknown: "requirements-status-unknown",
};

function iconForRequirement(label: string): RequirementIcon {
  const normalized = label.toLocaleLowerCase("pl-PL");
  if (/skierow/u.test(normalized)) return FileCheck2;
  if (/dokument|zaświadc|dowód/u.test(normalized)) return FileText;
  if (/meldun|łodzi/u.test(normalized)) return MapPin;
  if (/umów|zapis|kontakt|telefon|zadzwoń/u.test(normalized)) return PhoneCall;
  if (/bezpłat|opłat|koszt/u.test(normalized)) return HandCoins;
  if (/trzeź|alkohol/u.test(normalized)) return ShieldCheck;
  if (/dostęp|wózk|schod/u.test(normalized)) return UserRoundCheck;
  if (/dzień|limit|godzin/u.test(normalized)) return CalendarCheck2;
  if (/brak potwierdz|wymaga potwierd|brak danych/u.test(normalized)) return CircleHelp;
  return Check;
}

function statusLabel(item: DetailListItem) {
  if (item.status === "positive") return "Potwierdzone";
  if (item.status === "warning") return "Ważny warunek";
  if (item.status === "neutral") return "Nie";
  return "Brak danych";
}

function RequirementCell({ item, hidden }: { item: DetailListItem; hidden?: boolean }) {
  const Icon = iconForRequirement(item.label);
  const status = detailToneToPublicStatus(item.status);
  return (
    <li hidden={hidden} className={`requirements-grid-cell ${toneClass[item.status]}`}>
      <span className="requirements-grid-icon" aria-hidden="true">{createElement(Icon, { size: 20 })}</span>
      <span className="requirements-grid-copy">
        <strong>{item.label}</strong>
        <StatusIndicator status={status} className="requirements-grid-status" announceLabel={false}>{statusLabel(item)}</StatusIndicator>
        {item.note ? <small>{item.note}</small> : null}
      </span>
    </li>
  );
}

function RequirementGrid({ items, visibleItems, expanded }: { items: DetailListItem[]; visibleItems: DetailListItem[]; expanded: boolean }) {
  return <ul className="requirements-grid">{items.map((item) => <RequirementCell key={`${item.label}-${item.status}`} item={item} hidden={!expanded && !visibleItems.includes(item)} />)}</ul>;
}

export function RequirementList({ items, maxVisible }: RequirementListProps) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) {
    return <p className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-6 text-muted-foreground"><StatusIndicator status="unknown">Brak potwierdzonych informacji o warunkach. Przed wizytą warto skontaktować się z miejscem.</StatusIndicator></p>;
  }

  const confirmedItems = items.filter((item) => item.status !== "unknown");
  const quickLimit = maxVisible ?? 3;
  const quickItems = confirmedItems.slice(0, quickLimit);
  const displayItems = [...quickItems, ...items.filter((item) => !quickItems.includes(item))];
  const hasHiddenItems = items.length > quickLimit && displayItems.length > quickItems.length;

  return (
    <div className="requirements-disclosure-wrap min-w-0">
      {quickItems.length ? null : <p className="requirements-no-confirmed">Nie mamy jeszcze potwierdzonych informacji o warunkach korzystania.</p>}
      <RequirementGrid items={displayItems} visibleItems={quickItems} expanded={expanded} />
      {hasHiddenItems ? <InlineDisclosure label="Sprawdź wszystkie warunki" expandedLabel="Ukryj dodatkowe warunki" expanded={expanded} onExpandedChange={setExpanded} contentHidden={false} /> : null}
    </div>
  );
}
