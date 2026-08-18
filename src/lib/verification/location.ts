export function resolveLocationSource(value: FormDataEntryValue | null) {
  if (value === "GEOCODER_CONFIRMED" || value === "GEOCODER") return "GEOCODER" as const;
  if (value === "MANUAL") return "MANUAL" as const;
  return null;
}
