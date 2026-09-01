export function mapDetailsHref(detailsHref: string, returnTo?: string) {
  const separator = detailsHref.includes("?") ? "&" : "?";
  const context = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  return `${detailsHref}${separator}from=mapa${context}`;
}
