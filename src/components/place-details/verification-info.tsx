import { AlertTriangle, BadgeCheck } from "lucide-react";
import type { VerificationDetails } from "@/data/demo-place-details";

type VerificationInfoProps = {
  verification: VerificationDetails;
};

export function VerificationInfo({ verification }: VerificationInfoProps) {
  const isVerified = verification.tone === "verified";
  const Icon = isVerified ? BadgeCheck : AlertTriangle;

  return (
    <div
      className={[
        "rounded-xl border p-4",
        isVerified
          ? "border-border bg-surface-muted"
          : "border-urgent-border bg-urgent-soft",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon
          aria-hidden="true"
          size={20}
          className={[
            "mt-0.5 shrink-0",
            isVerified ? "text-brand-strong" : "text-urgent",
          ].join(" ")}
        />
        <div className="min-w-0">
          <p className="font-extrabold leading-6 text-foreground">
            {verification.label}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
            {verification.note}
          </p>
        </div>
      </div>
    </div>
  );
}
