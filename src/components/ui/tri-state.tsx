import { CircleHelp, Check, X } from "lucide-react";
import type { ReactNode } from "react";

export type TriStateValue = "YES" | "NO" | "UNKNOWN";

const labels: Record<TriStateValue, string> = {
  YES: "Tak",
  NO: "Nie",
  UNKNOWN: "Brak danych",
};

const icons: Record<TriStateValue, ReactNode> = {
  YES: <Check aria-hidden="true" size={16} />,
  NO: <X aria-hidden="true" size={16} />,
  UNKNOWN: <CircleHelp aria-hidden="true" size={16} />,
};

type TriStateProps = {
  value: TriStateValue;
  className?: string;
};

export function TriState({ value, className = "" }: TriStateProps) {
  return (
    <span className={["ui-tri-state", `ui-tri-state-${value.toLowerCase()}`, className].join(" ")}>
      {icons[value]}
      <span>{labels[value]}</span>
    </span>
  );
}
