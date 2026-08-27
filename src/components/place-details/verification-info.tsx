import Link from "next/link";
import { AlertTriangle, BadgeCheck, Phone, RefreshCcw } from "lucide-react";
import type { VerificationDetails } from "@/data/demo-place-details";
import { telephoneHref } from "@/lib/places/actions";

type VerificationInfoProps = {
  verification: VerificationDetails;
  reportHref?: string;
  phone?: string;
};

export function VerificationInfo({
  verification,
  reportHref,
  phone,
}: VerificationInfoProps) {
  const isVerified = verification.tone === "verified";
  const callHref = telephoneHref(phone);

  if (isVerified) {
    return (
      <div id="data-verification" className="scroll-mt-20 flex min-w-0 items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
        <BadgeCheck aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-brand-strong" />
        <div className="min-w-0 flex-1">
          <p className="min-w-0 font-semibold leading-5 text-muted-foreground">
            <strong className="font-extrabold text-foreground">{verification.label}</strong>
            {verification.note ? <span> · {verification.note}</span> : null}
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
    <div id="data-verification" className="scroll-mt-20 rounded-xl border border-urgent-border bg-urgent-soft p-4">
      <div className="flex min-w-0 items-start gap-3">
        <AlertTriangle aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-urgent" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-6 text-foreground">{verification.label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">{verification.note}</p>

          {callHref || reportHref ? (
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              {callHref ? (
                <a
                  href={callHref}
                  className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-extrabold text-foreground transition hover:bg-brand-strong hover:text-white"
                >
                  <Phone aria-hidden="true" size={16} />
                  Zadzwoń i potwierdź
                </a>
              ) : null}
              {reportHref ? (
                <Link
                  href={reportHref}
                  className="touch-target inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-extrabold text-foreground transition hover:bg-surface-muted"
                >
                  <RefreshCcw aria-hidden="true" size={16} />
                  Zgłoś nowsze dane
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
