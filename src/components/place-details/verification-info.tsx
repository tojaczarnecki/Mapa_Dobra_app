import { AlertTriangle, BadgeCheck } from "lucide-react";
import type { VerificationDetails } from "@/data/demo-place-details";

type VerificationInfoProps = {
  verification: VerificationDetails;
};

export function VerificationInfo({ verification }: VerificationInfoProps) {
  const isVerified = verification.tone === "verified";
  const Icon = isVerified ? BadgeCheck : AlertTriangle;

  return (
    <div className="place-detail-verification">
      <div className={isVerified ? "place-detail-verification-icon" : "place-detail-verification-icon-warning"}>
        <Icon
          aria-hidden="true"
          size={20}
        />
      </div>
      <div className="min-w-0">
          <p className="place-detail-verification-title">
            {verification.label}
          </p>
          <p className="place-detail-verification-note">
            {verification.note}
          </p>
      </div>
    </div>
  );
}
