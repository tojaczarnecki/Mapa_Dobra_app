import Link from "next/link";
import Image from "next/image";
import { ChevronRight, CircleHelp, HeartHandshake, LocateFixed, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PrimaryActionCardProps = {
  href: string;
  title: string;
  description: string;
  variant: "help" | "activate" | "now" | "unknown";
};

const icons: Record<PrimaryActionCardProps["variant"], LucideIcon> = {
  help: Search,
  activate: HeartHandshake,
  now: LocateFixed,
  unknown: CircleHelp,
};

const journeys = { help: "search", activate: "help", now: "now", unknown: "guide" } as const;
const journeyIllustrations = {
  search: "/brand/journeys/journey-search.png",
  help: "/brand/journeys/journey-help.png",
  now: "/brand/journeys/journey-now.png",
  guide: "/brand/journeys/journey-guide.png",
} as const;

export function PrimaryActionCard({ href, title, description, variant }: PrimaryActionCardProps) {
  const Icon = icons[variant];

  return (
    <Link href={href} data-journey={journeys[variant]} className={`home-primary-card home-primary-card-${variant}`}>
      <span className="home-primary-icon" aria-hidden="true">
        <Icon size={27} strokeWidth={2.1} />
      </span>
      <span className="home-primary-copy">
        <span className="home-primary-title">{title}</span>
        <span className="home-primary-description">{description}</span>
      </span>
      <Image src={journeyIllustrations[journeys[variant]]} alt="" width={220} height={220} className="home-primary-illustration" aria-hidden="true" />
      <ChevronRight className="home-primary-arrow" aria-hidden="true" size={24} strokeWidth={2} />
    </Link>
  );
}
