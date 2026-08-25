export const DETAIL_RETURN_SOURCES = ["mapa", "szukaj"] as const;

export type DetailReturnSource = (typeof DETAIL_RETURN_SOURCES)[number];

export type DetailReturnLink = {
  href: "/mapa" | "/szukaj";
  label: string;
  ariaLabel: string;
};

type SearchParamValue = string | string[] | undefined;

const DETAIL_RETURN_LINKS: Record<DetailReturnSource, DetailReturnLink> = {
  mapa: {
    href: "/mapa",
    label: "Wróć do mapy",
    ariaLabel: "Wróć do mapy",
  },
  szukaj: {
    href: "/szukaj",
    label: "Wróć do wyników",
    ariaLabel: "Wróć do wyników wyszukiwania",
  },
};

export function detailHrefWithSource(href: string, source: DetailReturnSource) {
  const hashIndex = href.indexOf("#");
  const pathAndQuery = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  const queryIndex = pathAndQuery.indexOf("?");
  const pathname =
    queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
  const params = new URLSearchParams(
    queryIndex === -1 ? "" : pathAndQuery.slice(queryIndex + 1),
  );

  params.set("from", source);

  const query = params.toString();

  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

export function detailReturnSource(value: SearchParamValue): DetailReturnSource | undefined {
  const source = Array.isArray(value) ? value[0] : value;

  return source === "mapa" || source === "szukaj" ? source : undefined;
}

export function detailReturnLink(value: SearchParamValue): DetailReturnLink {
  return DETAIL_RETURN_LINKS[detailReturnSource(value) ?? "szukaj"];
}
