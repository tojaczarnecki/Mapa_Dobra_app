import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type CategoryTileProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  accent?: string;
};

export function CategoryTile({ href, label, icon: Icon }: CategoryTileProps) {
  return (
    <Link
      href={href}
      className="home-category-tile"
      aria-label={`Szukaj pomocy: ${label}`}
    >
      <span className="home-category-icon" aria-hidden="true">
        <Icon size={24} strokeWidth={1.9} />
      </span>
      <span className="home-category-label">{label}</span>
    </Link>
  );
}
