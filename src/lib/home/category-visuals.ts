import { createElement } from "react";
import {
  BedDouble,
  HeartPulse,
  Scale,
  ShowerHead,
  Utensils,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = {
  jedzenie: Utensils,
  food: Utensils,
  nocleg: BedDouble,
  accommodation: BedDouble,
  higiena: ShowerHead,
  hygiene: ShowerHead,
  "pomoc-medyczna": HeartPulse,
  medical: HeartPulse,
  "pomoc-prawna": Scale,
  legal: Scale,
};

export function getCategoryIcon(slug: string) {
  return categoryIcons[slug] ?? Utensils;
}

export function CategoryIcon({ slug, ...props }: { slug: string } & LucideProps) {
  return createElement(getCategoryIcon(slug), props);
}
