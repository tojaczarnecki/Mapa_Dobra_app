import Link from "next/link";
import { Plus } from "lucide-react";

export function GlobalNeedLauncher() {
  return <Link href="/admin/potrzeby/nowa" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-[#10231e] hover:bg-brand-strong hover:text-white sm:w-auto">
    <Plus aria-hidden="true" size={18} /> Dodaj potrzebę
  </Link>;
}
