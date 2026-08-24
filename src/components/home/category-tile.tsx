import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CategoryTileProps = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function CategoryTile({ href, label, icon: Icon }: CategoryTileProps) {
  return (
    <Link href={href} className="home-category-tile" aria-label={`Szukaj pomocy: ${label}`}>
      <span className="home-category-icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </span>
      <span className="home-category-label">{label}</span>
      <ChevronRight className="home-category-arrow" aria-hidden="true" size={20} strokeWidth={2} />
    </Link>
  );
}
