import type { OrganizationFormValue } from "@/types/admin-directory";
import type { GusRegistryData } from "./gus-client";

type RegistryFields = Pick<OrganizationFormValue, "name" | "nip" | "regon" | "krs" | "legalForm">;

export function applyRegistryData(existing: RegistryFields, registry: GusRegistryData) {
  const values: RegistryFields = { ...existing };
  const suggestions: Array<{ field: keyof RegistryFields; current: string; proposed: string }> = [];
  const proposed: Partial<RegistryFields> = { name: registry.name ?? undefined, nip: registry.nip, regon: registry.regon ?? undefined, krs: registry.krs ?? undefined, legalForm: registry.legalForm ?? undefined };
  for (const field of Object.keys(proposed) as Array<keyof RegistryFields>) {
    const value = proposed[field];
    if (!value) continue;
    if (!values[field].trim()) values[field] = value;
    else if (values[field].trim() !== value.trim()) suggestions.push({ field, current: values[field], proposed: value });
  }
  return { values, suggestions };
}
