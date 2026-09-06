import Link from "next/link";
import { ArrowRight, Refrigerator } from "lucide-react";

export function FoodSharingModule({ fallback = false }: { fallback?: boolean }) {
  return (
    <section className="food-sharing-module" aria-labelledby="food-sharing-title">
      <div className="food-sharing-module-icon" aria-hidden="true"><Refrigerator size={22} /></div>
      <div className="min-w-0">
        <p className="food-sharing-module-eyebrow">DODATKOWA OPCJA</p>
        <h2 id="food-sharing-title">Lodówki społeczne w pobliżu</h2>
        <p>{fallback ? "Nie znaleźliśmy potwierdzonego punktu wydającego jedzenie w tej chwili. Możesz sprawdzić pobliskie lodówki społeczne. Ich zawartość zależy od aktualnych darów." : "Dostępne przez całą dobę, ale ich zawartość zależy od bieżących darów."}</p>
        <Link href="/lodowki-spoleczne" className="food-sharing-module-link">Zobacz lodówki <ArrowRight aria-hidden="true" size={17} /></Link>
      </div>
    </section>
  );
}
