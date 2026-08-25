import Link from "next/link";
import { Check } from "lucide-react";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { getCategoryAccentMap } from "@/lib/home/category-accent";

type CategoryChipProps = {
  label: string;
  slug?: string;
  active?: boolean;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children?: ReactNode;
};

export function CategoryChip({
  label,
  slug,
  active = false,
  href,
  onClick,
  children,
}: CategoryChipProps) {
  const accent = slug ? getCategoryAccentMap([slug]).get(slug) : undefined;
  const style = accent ? { "--category-accent": accent } as CSSProperties : undefined;
  const className = `category-chip${active ? " category-chip-active" : ""}`;
  const content = (
    <>
      {active ? <Check aria-hidden="true" size={16} strokeWidth={2.25} /> : null}
      {children}
      {label}
    </>
  );

  if (href) {
    return (
      <Link
        className={className}
        href={href}
        style={style}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-pressed={active}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
