import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

type CategoryTileProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: string;
};

export function CategoryTile({ href, label, icon: Icon, accent }: CategoryTileProps) {
  return (
    <Link
      href={href}
      className="home-category-tile"
      aria-label={`Szukaj pomocy: ${label}`}
      style={{ "--category-accent": accent } as CSSProperties}
    >
      <span className="home-category-icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </span>
      <span className="home-category-label">{label}</span>
      <ChevronRight className="home-category-arrow" aria-hidden="true" size={20} strokeWidth={2} />
    </Link>
  );
}
