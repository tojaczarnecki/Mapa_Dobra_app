import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { CategoryIllustration } from "@/components/categories/category-illustration";

type CategoryTileProps = {
  href: string;
  label: string;
  slug?: string;
  icon: LucideIcon;
  accent: string;
};

export function CategoryTile({ href, label, slug, icon: Icon, accent }: CategoryTileProps) {
  return (
    <Link
      href={href}
      className="home-category-tile"
      aria-label={`Szukaj pomocy: ${label}`}
      style={{ "--category-accent": accent } as CSSProperties}
    >
      <span className="home-category-icon" aria-hidden="true">
        <CategoryIllustration slug={slug} fallback={Icon} />
      </span>
      <span className="home-category-label">{label}</span>
      <ChevronRight className="home-category-arrow" aria-hidden="true" size={20} strokeWidth={2} />
    </Link>
  );
}
