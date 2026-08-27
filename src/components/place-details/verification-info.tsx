import { AlertTriangle, BadgeCheck } from "lucide-react";
import type { VerificationDetails } from "@/data/demo-place-details";

type VerificationInfoProps = {
  verification: VerificationDetails;
};

export function VerificationInfo({ verification }: VerificationInfoProps) {
  const isVerified = verification.tone === "verified";

  if (isVerified) {
    return (
      <div className="flex min-w-0 items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
        <BadgeCheck aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-brand-strong" />
        <p className="min-w-0 font-semibold leading-5 text-muted-foreground">
          <strong className="font-extrabold text-foreground">{verification.label}</strong>
          {verification.note ? <span> · {verification.note}</span> : null}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-urgent-border bg-urgent-soft p-4">
      <div className="flex min-w-0 items-start gap-3">
        <AlertTriangle aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-urgent" />
        <div className="min-w-0">
          <p className="font-extrabold leading-6 text-foreground">{verification.label}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">{verification.note}</p>
        </div>
      </div>
    </div>
  );
}
