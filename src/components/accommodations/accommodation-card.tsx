import Link from "next/link";
import {
  Accessibility,
  AlertTriangle,
  BadgeCheck,
  Ban,
  Check,
  ChevronRight,
  CircleHelp,
  CircleX,
  Clock3,
  Dog,
  FileText,
  MapPin,
  Navigation,
  Phone,
  ShieldAlert,
} from "lucide-react";
import type {
  Accommodation,
  AccommodationAvailabilityState,
} from "@/data/demo-accommodations";

type AccommodationCardProps = {
  accommodation: Accommodation;
  isBestMatch?: boolean;
  unmetConditions?: string[];
};

type RuleIconProps = {
  className: string;
  isPositive: boolean;
};

const availabilityConfig = {
  fresh: {
    className: "border-brand bg-brand-soft text-foreground",
    icon: BadgeCheck,
  },
  few: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: AlertTriangle,
  },
  none: {
    className: "border-border bg-surface-muted text-foreground",
    icon: CircleX,
  },
  unknown: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: CircleHelp,
  },
  stale: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: AlertTriangle,
  },
  suspended: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: Ban,
  },
} satisfies Record<
  AccommodationAvailabilityState,
  {
    className: string;
    icon: typeof BadgeCheck;
  }
>;

function RuleIcon({ className, isPositive }: RuleIconProps) {
  return isPositive ? (
    <Check aria-hidden="true" size={17} className={className} />
  ) : (
    <AlertTriangle aria-hidden="true" size={17} className={className} />
  );
}

export function AccommodationCard({
  accommodation,
  isBestMatch = false,
  unmetConditions = [],
}: AccommodationCardProps) {
  const AvailabilityIcon = availabilityConfig[accommodation.availability.state].icon;
  const availabilityClass =
    availabilityConfig[accommodation.availability.state].className;
  const acceptsPets = accommodation.petPolicy !== "none";
  const isAccessible = accommodation.accessibility === "yes";

  return (
    <article className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-4 shadow-[0_10px_26px_rgb(17_24_39_/_6%)] sm:p-5">
      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            {isBestMatch ? (
              <span className="inline-flex min-h-8 items-center rounded-full border border-brand bg-brand-soft px-3 text-xs font-extrabold text-foreground">
                Najlepiej dopasowane
              </span>
            ) : null}
            <div>
              <h2 className="text-xl font-extrabold leading-tight text-foreground">
                {accommodation.name}
              </h2>
              <p className="mt-1 text-sm font-bold leading-5 text-muted-foreground">
                {accommodation.typeLabel} • {accommodation.audienceLabel}
              </p>
            </div>
          </div>
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
            aria-hidden="true"
          >
            <ShieldAlert size={24} strokeWidth={2.2} />
          </span>
        </div>

        <div className="grid min-w-0 gap-2">
          <div
            className={[
              "inline-flex min-h-10 max-w-full min-w-0 flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-base font-extrabold leading-tight",
              availabilityClass,
            ].join(" ")}
          >
            <AvailabilityIcon
              aria-hidden="true"
              className="shrink-0"
              size={18}
              strokeWidth={2.4}
            />
            {accommodation.availability.label}
          </div>
          <p className="text-sm font-extrabold text-foreground">
            {accommodation.availability.confirmed}
          </p>
          {accommodation.availability.note ? (
            <p className="rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2 text-sm font-semibold leading-6 text-foreground">
              {accommodation.availability.note}
            </p>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <p className="flex min-w-0 items-center gap-2">
            <Clock3 aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{accommodation.admissionsToday}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <MapPin aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{accommodation.distanceLabel}</span>
          </p>
        </div>

        <ul className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <li className="flex min-w-0 items-start gap-2">
            <RuleIcon
              isPositive={!accommodation.lodzRegistrationRequired}
              className={[
                "mt-0.5 shrink-0",
                accommodation.lodzRegistrationRequired ? "text-urgent" : "text-brand-strong",
              ].join(" ")}
            />
            <span className="min-w-0">
              {accommodation.lodzRegistrationRequired
                ? "Wymagany ostatni meldunek w Łodzi"
                : "Ostatni meldunek w Łodzi niewymagany"}
            </span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <RuleIcon
              isPositive={!accommodation.referralRequired}
              className={[
                "mt-0.5 shrink-0",
                accommodation.referralRequired ? "text-urgent" : "text-brand-strong",
              ].join(" ")}
            />
            <span className="min-w-0">
              {accommodation.referralRequired ? "Wymagane skierowanie" : "Bez skierowania"}
            </span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <RuleIcon
              isPositive={!accommodation.documentRequired}
              className={[
                "mt-0.5 shrink-0",
                accommodation.documentRequired ? "text-urgent" : "text-brand-strong",
              ].join(" ")}
            />
            <span className="min-w-0">
              {accommodation.documentRequired ? "Wymagany dokument" : "Bez dokumentów"}
            </span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <AlertTriangle
              aria-hidden="true"
              size={17}
              className="mt-0.5 shrink-0 text-urgent"
            />
            <span className="min-w-0">{accommodation.sobrietyRule}</span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <Dog
              aria-hidden="true"
              size={17}
              className={[
                "mt-0.5 shrink-0",
                acceptsPets ? "text-brand-strong" : "text-muted-foreground",
              ].join(" ")}
            />
            <span className="min-w-0">
              {accommodation.petPolicy === "none"
                ? "Nie przyjmuje zwierząt"
                : accommodation.petPolicy === "dogByArrangement"
                  ? "Pies po uzgodnieniu"
                  : "Zwierzęta po uzgodnieniu"}
            </span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <Accessibility
              aria-hidden="true"
              size={17}
              className={[
                "mt-0.5 shrink-0",
                isAccessible ? "text-brand-strong" : "text-muted-foreground",
              ].join(" ")}
            />
            <span className="min-w-0">
              {accommodation.accessibility === "yes"
                ? "Dostępne dla osoby na wózku"
                : accommodation.accessibility === "partial"
                  ? "Częściowa dostępność dla wózka"
                  : "Brak dostępności dla wózka"}
            </span>
          </li>
          {accommodation.careServices ? (
            <li className="flex min-w-0 items-start gap-2">
              <FileText
                aria-hidden="true"
                size={17}
                className="mt-0.5 shrink-0 text-brand-strong"
              />
              <span className="min-w-0">Usługi opiekuńcze na miejscu</span>
            </li>
          ) : null}
        </ul>

        {unmetConditions.length > 0 ? (
          <div className="rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2">
            <p className="text-sm font-extrabold text-foreground">
              Warunki do sprawdzenia
            </p>
            <ul className="mt-1 grid gap-1 text-sm font-semibold leading-6 text-foreground">
              {unmetConditions.map((condition) => (
                <li key={condition}>• {condition}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-3 gap-2">
          <button className="place-card-action" type="button">
            <Phone aria-hidden="true" size={17} />
            Zadzwoń
          </button>
          <button className="place-card-action" type="button">
            <Navigation aria-hidden="true" size={17} />
            Trasa
          </button>
          <Link
            className="place-card-action place-card-action-primary"
            href={`/lodz/${accommodation.categorySlug}/${accommodation.slug}`}
          >
            Szczegóły
            <ChevronRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
