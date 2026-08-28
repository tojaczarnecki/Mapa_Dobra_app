import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/admin/session";
import ImportWizard from "@/components/admin/imports/import-wizard";

export default async function NewImportPage() {
  await requirePermission("MANAGE_IMPORTS");
  return <div className="space-y-5"><Link href="/admin/importy" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-brand-strong hover:bg-brand-soft"><ArrowLeft aria-hidden="true" size={18} /> Wróć do importów</Link><header><p className="text-sm font-bold text-brand-strong">Źródła danych</p><h1 className="mt-1 text-3xl font-bold">Nowy import</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Wczytaj plik, sprawdź mapowanie i przygotuj analizę do ręcznej weryfikacji.</p></header><ImportWizard /></div>;
}
