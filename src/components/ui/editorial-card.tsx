import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export type EditorialVariant = "neutral" | "search" | "help" | "now" | "guide";

type EditorialCardProps = {
  variant?: EditorialVariant;
  eyebrow?: string;
  title: string;
  description: string;
  href: string;
  size?: "compact" | "regular";
  actionLabel?: string;
  illustration?: { src: string; alt?: string };
  layout?: "feature" | "standard" | "wide";
};

export function EditorialCard({
  variant = "guide",
  eyebrow,
  title,
  description,
  href,
  size = "regular",
  actionLabel = "Czytaj",
  illustration,
  layout = "standard",
}: EditorialCardProps) {
  return (
    <Link
      href={href}
      className={`editorial-card editorial-card-${variant} editorial-card-${size} editorial-card-${layout} ${illustration ? "editorial-card-illustrated" : ""} group`}
    >
      <span className="editorial-card-content">
        {eyebrow ? <span className="editorial-card-eyebrow">{eyebrow}</span> : null}
        <strong>{title}</strong>
        <span className="editorial-card-description">{description}</span>
      </span>
      {illustration ? (
        <span className="editorial-card-illustration" aria-hidden={illustration.alt ? undefined : true}>
          <Image src={illustration.src} alt={illustration.alt ?? ""} width={640} height={480} sizes="(max-width: 767px) 36vw, (max-width: 1199px) 28vw, 320px" />
        </span>
      ) : null}
      <span className="editorial-card-action">
        {actionLabel}
        <ArrowRight aria-hidden="true" size={17} />
      </span>
    </Link>
  );
}
