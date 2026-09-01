import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleHelp,
  CircleX,
  Clock3,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import type {
  Accommodation,
  AccommodationAvailabilityState,
  InformationState,
} from "@/data/demo-accommodations";
import { directionsHref, telephoneHref } from "@/lib/places/actions";
import { getAccommodationPrimaryAction } from "@/lib/accommodations/presentation";

type AccommodationCardProps = {
  accommodation: Accommodation;
  isBestMatch?: boolean;
  unmetConditions?: string[];
  confirmationConditions?: string[];
};

type RuleState = "positive" | "absent" | "warning" | "unknown";

type Rule = {
  state: RuleState;
  label: string;
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
    className: "border-border bg-surface-muted text-foreground",
    icon: CircleHelp,
  },
  stale: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: AlertTriangle,
  },
  suspended: {
    className: "border-urgent-border bg-urgent-soft text-foreground",
    icon: AlertTriangle,
  },
} satisfies Record<
  AccommodationAvailabilityState,
  {
    className: string;
    icon: typeof BadgeCheck;
  }
>;

function requiredRule(
  state: InformationState,
  requiredLabel: string,
  notRequiredLabel: string,
  unknownLabel: string,
): Rule {
  if (state === "YES") return { state: "warning", label: requiredLabel };
  if (state === "NO") return { state: "positive", label: notRequiredLabel };
  return { state: "unknown", label: unknownLabel };
}

function RuleIcon({ state }: { state: RuleState }) {
  if (state === "positive") return <Check aria-hidden="true" size={13} />;
  if (state === "absent") return <CircleX aria-hidden="true" size={13} />;
  if (state === "warning") return <AlertTriangle aria-hidden="true" size={13} />;
  return <CircleHelp aria-hidden="true" size={13} />;
}

function ruleChipClass(state: RuleState) {
  if (state === "positive") return "border-[#c8e5d7] bg-[#f3faf6] text-[#285e4a]";
  if (state === "absent") return "border-border bg-surface-muted text-foreground";
  if (state === "warning") return "border-urgent-border bg-urgent-soft text-foreground";
  return "border-border bg-surface-muted text-muted-foreground";
}

export function AccommodationCard({
  accommodation,
  isBestMatch = false,
  unmetConditions = [],
  confirmationConditions = [],
}: AccommodationCardProps) {
  const callHref = telephoneHref(accommodation.phone);
  const routeHref = directionsHref(accommodation);
  const primaryAction = getAccommodationPrimaryAction({
    phoneHref: callHref,
    routeHref,
    closedNow: accommodation.availability.state === "none" || accommodation.availability.state === "suspended",
    needsConfirmation: accommodation.availability.state === "stale" || accommodation.availability.state === "unknown" || confirmationConditions.length > 0,
    hasMismatch: unmetConditions.length > 0,
  });
  const AvailabilityIcon = availabilityConfig[accommodation.availability.state].icon;
  const availabilityClass = availabilityConfig[accommodation.availability.state].className;

  const registration = requiredRule(
    accommodation.lodzRegistrationRequired,
    "Wymagany ostatni meldunek w Łodzi",
    "Bez wymogu ostatniego meldunku",
    "Meldunek: wymaga potwierdzenia",
  );
  const referral = requiredRule(
    accommodation.referralRequired,
    "Wymagane skierowanie",
    "Bez skierowania",
    "Skierowanie: wymaga potwierdzenia",
  );
  const document = requiredRule(
    accommodation.documentRequired,
    "Wymagany dokument",
    "Bez dokumentów",
    "Dokument: wymaga potwierdzenia",
  );
  const accessibility: Rule = accommodation.accessibility === "YES"
    ? { state: "positive", label: "Dostępne dla wózka" }
    : accommodation.accessibility === "NO"
      ? { state: "absent", label: "Brak dostępności dla wózka" }
      : { state: "unknown", label: "Dostępność: wymaga potwierdzenia" };
  const pet: Rule = accommodation.petPolicy === "UNKNOWN"
    ? { state: "unknown", label: "Zwierzęta: wymaga potwierdzenia" }
    : accommodation.petPolicy === "NOT_ACCEPTED"
      ? { state: "absent", label: "Nie przyjmuje zwierząt" }
      : { state: "positive", label: accommodation.petPolicyNote ?? "Możliwe przyjęcie ze zwierzęciem" };
  const sobriety: Rule = accommodation.sobrietyPolicy === "UNKNOWN"
    ? { state: "unknown", label: "Trzeźwość: wymaga potwierdzenia" }
    : { state: "warning", label: accommodation.sobrietyRule };
  const care: Rule | undefined = accommodation.careServices === "NO"
    ? undefined
    : accommodation.careServices === "YES"
      ? { state: "positive", label: "Usługi opiekuńcze" }
      : { state: "unknown", label: "Usługi opiekuńcze: wymaga potwierdzenia" };

  const rules = [registration, referral, document, sobriety, pet, accessibility, ...(care ? [care] : [])]
    .filter((rule) => rule.state !== "positive");

  return (
    <article className="w-full min-w-0 max-w-full rounded-xl border border-border bg-surface p-3.5 shadow-[0_8px_22px_rgb(17_24_39_/_5%)] sm:p-4">
      <div className="min-w-0 space-y-3">
        <div className="min-w-0">
          {isBestMatch ? (
            <span className="mb-2 inline-flex min-h-7 items-center rounded-full border border-brand bg-brand-soft px-2.5 text-xs font-extrabold text-foreground">
              Najlepiej dopasowane
            </span>
          ) : null}
          <h2 className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">
            {accommodation.name}
          </h2>
          <p className="mt-1 text-sm font-bold leading-5 text-muted-foreground">
            {accommodation.typeLabel} • {accommodation.audienceLabel}
          </p>
        </div>

        <div className={["flex min-w-0 flex-wrap items-center gap-2 rounded-lg border px-3 py-2", availabilityClass].join(" ")}>
          <AvailabilityIcon aria-hidden="true" size={18} className="shrink-0" />
          <strong className="text-sm font-extrabold leading-5">{accommodation.availability.label}</strong>
          <span className="ml-auto text-xs font-bold text-muted-foreground">{accommodation.availability.confirmed}</span>
        </div>

        {accommodation.availability.note ? (
          <p className="rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2 text-xs font-semibold leading-5 text-foreground">
            {accommodation.availability.note}
          </p>
        ) : null}

        <div className="grid min-w-0 gap-1.5 text-sm font-semibold text-foreground sm:grid-cols-2">
          <p className="flex min-w-0 items-center gap-2">
            <Clock3 aria-hidden="true" size={16} className="shrink-0 text-brand-strong" />
            <span>{accommodation.admissionsToday}</span>
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <MapPin aria-hidden="true" size={16} className="shrink-0 text-brand-strong" />
            <span>{accommodation.distanceLabel}</span>
          </p>
        </div>

        <ul className="flex min-w-0 flex-wrap gap-1.5">
          {rules.map((rule) => (
            <li
              key={rule.label}
              className={["inline-flex min-h-7 max-w-full items-center gap-1 rounded-full border px-2.5 text-xs font-bold", ruleChipClass(rule.state)].join(" ")}
            >
              <RuleIcon state={rule.state} />
              <span className="min-w-0">{rule.label}</span>
            </li>
          ))}
        </ul>

        {unmetConditions.length > 0 ? (
          <div className="rounded-lg border border-urgent-border bg-urgent-soft px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <AlertTriangle aria-hidden="true" size={16} className="shrink-0 text-urgent" />
              Warunki do sprawdzenia
            </p>
            <ul className="mt-1 grid gap-1 text-xs font-semibold leading-5 text-foreground">
              {unmetConditions.map((condition) => <li key={condition}>• {condition}</li>)}
            </ul>
          </div>
        ) : null}

        {confirmationConditions.length > 0 ? (
          <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <CircleHelp aria-hidden="true" size={16} className="shrink-0 text-muted-foreground" />
              Wymaga potwierdzenia
            </p>
            <ul className="mt-1 grid gap-1 text-xs font-semibold leading-5 text-muted-foreground">
              {confirmationConditions.map((condition) => <li key={condition}>• {condition}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-2 border-t border-border pt-3 sm:grid-cols-3">
          {primaryAction?.kind === "call" ? (
            <a className="place-card-action place-card-action-primary" href={primaryAction.href}>
              <Phone aria-hidden="true" size={17} />
              {primaryAction.label}
            </a>
          ) : primaryAction?.kind === "search" ? (
            <Link className="place-card-action place-card-action-primary" href={primaryAction.href}>
              <CircleHelp aria-hidden="true" size={17} />
              {primaryAction.label}
            </Link>
          ) : null}
          {primaryAction?.kind !== "call" && callHref ? (
            <a className="place-card-action" href={callHref}>
              <Phone aria-hidden="true" size={17} />
              Zadzwoń
            </a>
          ) : null}
          {primaryAction?.kind !== "route" && routeHref ? (
            <a className="place-card-action" href={routeHref} target="_blank" rel="noreferrer">
              <Navigation aria-hidden="true" size={17} />
              Trasa
            </a>
          ) : (
            <span className="place-card-action cursor-not-allowed opacity-55" aria-disabled="true">
              <Navigation aria-hidden="true" size={17} />
              Trasa
            </span>
          )}
          <Link
            className="place-card-action"
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
