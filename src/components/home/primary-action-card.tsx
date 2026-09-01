import Link from "next/link";
import { BookOpen, ChevronRight, HeartHandshake, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PrimaryActionCardProps = {
  href: string;
  title: string;
  description: string;
  variant: "help" | "activate" | "guide";
};

const icons: Record<PrimaryActionCardProps["variant"], LucideIcon> = {
  help: Search,
  activate: HeartHandshake,
  guide: BookOpen,
};

export function PrimaryActionCard({ href, title, description, variant }: PrimaryActionCardProps) {
  const Icon = icons[variant];

  return (
    <Link href={href} className={`home-primary-card home-primary-card-${variant}`}>
      <span className="home-primary-icon" aria-hidden="true">
        <Icon size={27} strokeWidth={2.1} />
      </span>
      <span className="home-primary-copy">
        <span className="home-primary-title">{title}</span>
        <span className="home-primary-description">{description}</span>
      </span>
      <ChevronRight className="home-primary-arrow" aria-hidden="true" size={24} strokeWidth={2} />
    </Link>
  );
}
