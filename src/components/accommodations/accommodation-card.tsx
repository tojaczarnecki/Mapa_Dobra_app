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
  InformationState,
} from "@/data/demo-accommodations";
import { directionsHref, telephoneHref } from "@/lib/places/actions";

type AccommodationCardProps = {
  accommodation: Accommodation;
  isBestMatch?: boolean;
  unmetConditions?: string[];
  confirmationConditions?: string[];
};

type RuleIconProps = {
  state: "positive" | "warning" | "unknown";
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

function RuleIcon({ state }: RuleIconProps) {
  const className = [
    "mt-0.5 shrink-0",
    state === "positive"
      ? "text-brand-strong"
      : state === "warning"
        ? "text-urgent"
        : "text-muted-foreground",
  ].join(" ");

  if (state === "positive") return <Check aria-hidden="true" size={17} className={className} />;
  if (state === "warning") {
    return <AlertTriangle aria-hidden="true" size={17} className={className} />;
  }
  return <CircleHelp aria-hidden="true" size={17} className={className} />;
}

function requiredRule(
  state: InformationState,
  requiredLabel: string,
  notRequiredLabel: string,
  unknownLabel: string,
) {
  if (state === "YES") return { state: "warning" as const, label: requiredLabel };
  if (state === "NO") return { state: "positive" as const, label: notRequiredLabel };
  return { state: "unknown" as const, label: unknownLabel };
}

export function AccommodationCard({
  accommodation,
  isBestMatch = false,
  unmetConditions = [],
  confirmationConditions = [],
}: AccommodationCardProps) {
  const callHref = telephoneHref(accommodation.phone);
  const routeHref = directionsHref(accommodation);
  const AvailabilityIcon = availabilityConfig[accommodation.availability.state].icon;
  const availabilityClass =
    availabilityConfig[accommodation.availability.state].className;
  const registration = requiredRule(
    accommodation.lodzRegistrationRequired,
    "Wymagany ostatni meldunek w Łodzi",
    "Ostatni meldunek w Łodzi niewymagany",
    "Wymóg ostatniego meldunku wymaga potwierdzenia",
  );
  const referral = requiredRule(
    accommodation.referralRequired,
    "Wymagane skierowanie",
    "Bez skierowania",
    "Wymóg skierowania wymaga potwierdzenia",
  );
  const document = requiredRule(
    accommodation.documentRequired,
    "Wymagany dokument",
    "Bez dokumentów",
    "Wymóg dokumentu wymaga potwierdzenia",
  );
  const petLabel = ({
    ACCEPTED: "Zwierzęta przyjmowane",
    NOT_ACCEPTED: "Nie przyjmuje zwierząt",
    DOG_ONLY: "Przyjmowany tylko pies",
    BY_ARRANGEMENT: "Zwierzęta po uzgodnieniu",
    ASSISTANCE_DOG_ONLY: "Przyjmowany pies asystujący",
    UNKNOWN: "Przyjmowanie zwierząt wymaga potwierdzenia",
  } as const)[accommodation.petPolicy];
  const petState = accommodation.petPolicy === "UNKNOWN"
    ? "unknown"
    : accommodation.petPolicy === "NOT_ACCEPTED"
      ? "warning"
      : "positive";
  const accessibility = accommodation.accessibility === "YES"
    ? { state: "positive" as const, label: "Dostępne dla osoby na wózku" }
    : accommodation.accessibility === "NO"
      ? { state: "warning" as const, label: "Brak dostępności dla wózka" }
      : { state: "unknown" as const, label: "Dostępność dla wózka wymaga potwierdzenia" };

  return (
    <article className="accommodation-result-card w-full min-w-0 max-w-full rounded-xl border border-[#e5e5e5] bg-white p-4 sm:p-5">
      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            {isBestMatch ? (
              <span className="inline-flex min-h-8 items-center rounded-md border border-[#b8d8d4] bg-[#eef8f6] px-3 text-xs font-medium text-[#18364d]">
                Najlepiej dopasowane
              </span>
            ) : null}
            <div>
              <h2 className="text-xl font-semibold leading-tight text-[#18364d]">
                {accommodation.name}
              </h2>
              <p className="mt-1 text-sm font-normal leading-5 text-muted-foreground">
                {accommodation.typeLabel} • {accommodation.audienceLabel}
              </p>
            </div>
          </div>
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef4f6] text-[#18364d]"
            aria-hidden="true"
          >
            <ShieldAlert size={24} strokeWidth={2.2} />
          </span>
        </div>

        <div className="grid min-w-0 gap-2">
          <div
            className={[
              "inline-flex min-h-10 max-w-full min-w-0 flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium leading-tight",
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
          <p className="text-sm font-medium text-foreground">
            {accommodation.availability.confirmed}
          </p>
          {accommodation.availability.note ? (
            <p className="rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2 text-sm font-semibold leading-6 text-foreground">
              {accommodation.availability.note}
            </p>
          ) : null}
        </div>

        <div className="grid min-w-0 gap-2 text-sm font-normal text-foreground">
          <p className="flex min-w-0 items-center gap-2">
            <Clock3 aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{accommodation.admissionsToday}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <MapPin aria-hidden="true" size={18} className="shrink-0 text-brand-strong" />
            <span className="min-w-0">{accommodation.distanceLabel}</span>
          </p>
        </div>

        <ul className="grid min-w-0 gap-2 text-sm font-normal text-foreground">
          <li className="flex min-w-0 items-start gap-2">
            <RuleIcon state={registration.state} />
            <span className="min-w-0">{registration.label}</span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <RuleIcon state={referral.state} />
            <span className="min-w-0">{referral.label}</span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <RuleIcon state={document.state} />
            <span className="min-w-0">{document.label}</span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <RuleIcon state={accommodation.sobrietyPolicy === "UNKNOWN" ? "unknown" : "warning"} />
            <span className="min-w-0">{accommodation.sobrietyRule}</span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <Dog aria-hidden="true" size={17} className={[
              "mt-0.5 shrink-0",
              petState === "positive"
                ? "text-brand-strong"
                : petState === "warning"
                  ? "text-urgent"
                  : "text-muted-foreground",
            ].join(" ")} />
            <span className="min-w-0">{accommodation.petPolicyNote ?? petLabel}</span>
          </li>
          <li className="flex min-w-0 items-start gap-2">
            <Accessibility aria-hidden="true" size={17} className={[
              "mt-0.5 shrink-0",
              accessibility.state === "positive"
                ? "text-brand-strong"
                : accessibility.state === "warning"
                  ? "text-urgent"
                  : "text-muted-foreground",
            ].join(" ")} />
            <span className="min-w-0">{accessibility.label}</span>
          </li>
          {accommodation.careServices !== "NO" ? (
            <li className="flex min-w-0 items-start gap-2">
              {accommodation.careServices === "YES" ? (
                <FileText aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-brand-strong" />
              ) : (
                <CircleHelp aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                {accommodation.careServices === "YES"
                  ? "Usługi opiekuńcze na miejscu"
                  : "Usługi opiekuńcze wymagają potwierdzenia"}
              </span>
            </li>
          ) : null}
        </ul>

        {unmetConditions.length > 0 ? (
          <div className="rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2">
            <p className="text-sm font-semibold text-foreground">
              Warunki do sprawdzenia
            </p>
            <ul className="mt-1 grid gap-1 text-sm font-normal leading-6 text-foreground">
              {unmetConditions.map((condition) => (
                <li key={condition}>• {condition}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {confirmationConditions.length > 0 ? (
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CircleHelp aria-hidden="true" size={17} className="shrink-0 text-muted-foreground" />
              Wymaga potwierdzenia
            </p>
            <ul className="mt-1 grid gap-1 text-sm font-normal leading-6 text-foreground">
              {confirmationConditions.map((condition) => (
                <li key={condition}>• {condition}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="accommodation-card-actions grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
          {callHref ? (
            <a className="place-card-action col-span-2 sm:col-span-1" href={callHref}>
              <Phone aria-hidden="true" size={17} />
              Zadzwoń
            </a>
          ) : (
            <span className="place-card-action col-span-2 cursor-not-allowed opacity-55 sm:col-span-1" aria-disabled="true">
              <Phone aria-hidden="true" size={17} />
              Brak telefonu
            </span>
          )}
          {routeHref ? (
            <a className="place-card-action" href={routeHref} target="_blank" rel="noreferrer">
              <Navigation aria-hidden="true" size={17} />
              Trasa
            </a>
          ) : (
            <span className="place-card-action cursor-not-allowed opacity-55" aria-disabled="true">
              <Navigation aria-hidden="true" size={17} />
              Brak trasy
            </span>
          )}
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
