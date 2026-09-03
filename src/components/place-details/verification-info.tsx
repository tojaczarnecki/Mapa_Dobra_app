import Link from "next/link";
import { RefreshCcw } from "lucide-react";
import type { VerificationDetails } from "@/data/demo-place-details";
import { DataFreshness } from "@/components/ui/data-freshness";

type VerificationInfoProps = {
  verification: VerificationDetails;
  reportHref?: string;
  phone?: string;
};

export function VerificationInfo({
  verification,
  reportHref,
}: VerificationInfoProps) {
  const isVerified = verification.tone === "verified";

  if (isVerified) {
    return (
      <div id="data-verification" className="place-detail-verification scroll-mt-20 flex min-w-0 items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
        <div className="min-w-0 flex-1">
          <p className="min-w-0 font-semibold leading-5 text-muted-foreground">
            <DataFreshness kind="confirmed"><strong className="font-extrabold text-foreground">{verification.label}</strong></DataFreshness>
          </p>
          {reportHref ? (
            <Link
              href={reportHref}
              className="mt-1 inline-flex min-h-8 items-center gap-1.5 text-xs font-extrabold text-brand-strong underline decoration-transparent underline-offset-2 transition hover:decoration-current"
            >
              <RefreshCcw aria-hidden="true" size={14} />
              Dane się zmieniły? Zgłoś
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div id="data-verification" className="place-detail-verification scroll-mt-20 min-w-0 text-sm">
      <div className="min-w-0">
        <p className="font-semibold leading-6 text-muted-foreground">
          Dane ostatnio sprawdzane: {verification.label}
        </p>
        {verification.note ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{verification.note}</p> : null}
        {reportHref ? (
          <Link
            href={reportHref}
            className="touch-target mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-extrabold text-brand-strong underline decoration-transparent underline-offset-2 transition hover:decoration-current"
          >
            <RefreshCcw aria-hidden="true" size={14} />
            Dane się zmieniły? Zgłoś
          </Link>
        ) : null}
      </div>
    </div>
  );
}
