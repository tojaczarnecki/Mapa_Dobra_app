import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { categoryIllustrationColor, categoryIllustrationPath } from "@/lib/categories/category-illustrations";

type CategoryIllustrationProps = {
  slug?: string;
  fallback: LucideIcon;
  className?: string;
  iconSize?: number;
};

export function CategoryIllustration({ slug, fallback: Fallback, className = "", iconSize = 24 }: CategoryIllustrationProps) {
  const path = categoryIllustrationPath(slug);
  const color = categoryIllustrationColor(slug);
  const style = color ? { "--category-illustration-color": color } as CSSProperties : undefined;
  const classes = ["category-illustration", className].join(" ");

  return path ? (
    path.endsWith(".svg") ? (
      <svg viewBox="0 0 1254 1254" aria-hidden="true" focusable="false" className={classes} style={style}>
        <use href={`${path}#Warstwa_1`} />
      </svg>
    ) : (
      <Image src={path} alt="" aria-hidden="true" width={64} height={64} style={style} className={classes} />
    )
  ) : (
    <Fallback aria-hidden="true" size={iconSize} strokeWidth={2} className={className} />
  );
}
