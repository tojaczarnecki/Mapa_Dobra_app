import type { ReactNode } from "react";

type PublicActionVariant = "primary" | "secondary" | "tertiary" | "utility";

type PublicActionLinkProps = {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: PublicActionVariant;
  external?: boolean;
  className?: string;
};

export function PublicActionLink({ href, children, icon, variant = "secondary", external = false, className = "" }: PublicActionLinkProps) {
  return (
    <a
      className={["public-action-link", `public-action-link-${variant}`, className].filter(Boolean).join(" ")}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}
