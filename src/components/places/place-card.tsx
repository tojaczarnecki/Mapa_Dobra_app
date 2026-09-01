import Link from "next/link";
import {
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import type { DemoPlace } from "@/data/demo-places";
import { PlaceStatusBadge } from "./place-status-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { publicStatusForLabel } from "@/lib/public/status-presentation";
import { getResultPrimaryAction } from "@/lib/places/result-presentation";

export function PlaceCard({ place, returnTo }: { place: DemoPlace; returnTo?: string }) {
  const Icon = place.primaryIcon;
  const primaryAction = getResultPrimaryAction(place);
  const importantCondition = place.conditions.find((condition) => publicStatusForLabel(condition) === "condition");
  const primaryActionIsCall = primaryAction?.label.startsWith("Zadzwoń") ?? false;

  return (
    <article className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-3.5 shadow-[0_8px_22px_rgb(17_24_39_/_5%)] sm:p-4">
      <div className="min-w-0 space-y-3">
        <div className="flex min-w-0 gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
            aria-hidden="true"
          >
            <Icon size={22} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">
              {place.name}
            </h2>
            <p className="mt-0.5 text-sm font-bold leading-5 text-muted-foreground">
              {place.helpTypes.join(" • ")}
            </p>
            <div className="mt-2"><PlaceStatusBadge status={place.status} compact freshnessWarning={place.freshnessWarning} /></div>
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-foreground sm:grid-cols-2">
          <p className={`flex min-w-0 items-center gap-2 ${place.status === "unknownHours" ? "hidden" : ""}`}>
            <Clock3 aria-hidden="true" size={16} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.todayHours}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <Navigation aria-hidden="true" size={16} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.distance}</span>
          </p>
          <p className="flex min-w-0 items-start gap-2 leading-5 sm:col-span-2">
            <MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-brand-strong" />
            <span className="min-w-0">{place.address}</span>
          </p>
        </div>

        {importantCondition ? (
            <ul className="flex min-w-0 flex-wrap gap-1.5 text-xs font-bold text-foreground">
            <li className="inline-flex min-h-7 max-w-full items-center rounded-full border border-border bg-surface-muted px-2.5">
              <StatusIndicator status="condition" className="min-w-0">
                {importantCondition}
              </StatusIndicator>
            </li>
          </ul>
        ) : null}

        <div className="grid min-w-0 grid-cols-2 gap-2 border-t border-border pt-3">
          {primaryAction ? (
            <a className="place-card-action place-card-action-primary" href={primaryAction.href} target={primaryAction.external ? "_blank" : undefined} rel={primaryAction.external ? "noreferrer" : undefined}>
              {primaryActionIsCall ? <Phone aria-hidden="true" size={17} /> : <Navigation aria-hidden="true" size={17} />}
              {primaryAction.label}
            </a>
          ) : null}
          <Link
            className={"place-card-action" + (!primaryAction ? " place-card-action-primary col-span-2" : "")}
            href={{ pathname: `/lodz/${place.categorySlug}/${place.slug}`, query: returnTo ? { returnTo } : undefined }}
          >
            Szczegóły
            <ChevronRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
