import Link from "next/link";
import { X } from "lucide-react";

export function FocusFlowTopbar({ closeHref = "/", closeLabel = "Zamknij" }: { closeHref?: string; closeLabel?: string }) {
  return (
    <div className="focus-flow-topbar">
      <Link href="/" className="focus-flow-wordmark" aria-label="Dobra Mapa - strona główna">DOBRA MAPA</Link>
      <Link href={closeHref} className="focus-flow-close"><X aria-hidden="true" size={17} />{closeLabel}</Link>
    </div>
  );
}
