import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type PublicActionVariant = "primary" | "secondary" | "tertiary" | "utility";
type PublicActionJourney = "search" | "help" | "guide" | "emergency";

type PublicActionLinkProps = {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: PublicActionVariant;
  external?: boolean;
  className?: string;
  journey?: PublicActionJourney;
  system?: boolean;
  chevron?: boolean;
};

export function PublicActionLink({ href, children, icon, variant = "secondary", external = false, className = "", journey, system = false, chevron = false }: PublicActionLinkProps) {
  return (
    <a
      className={["public-action-link", `public-action-link-${variant}`, system ? "public-action-link-system" : "", journey ? `public-action-link-journey-${journey}` : "", className].filter(Boolean).join(" ")}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {icon}
      <span>{children}</span>
      {chevron ? <ChevronRight aria-hidden="true" size={23} strokeWidth={2.25} /> : null}
    </a>
  );
}
