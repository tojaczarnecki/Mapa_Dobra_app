export const pilotGPlaceIds = [
  "8c46a845-5b5d-4566-b63d-cd126f79d4a2",
  "c7955e80-2857-4187-b35e-00dc12fc2441",
  "5ad677dc-4f94-44fd-8d48-72e1406fe4de",
  "f8b4d028-8c98-48f3-8ef3-ad3f3109ece2",
  "c53801dc-90f1-4372-bfa9-a208b9e929db",
  "86e2803b-7747-440e-8184-9b663e2bb352",
  "b012951f-cd4b-4b9f-9eab-d75db784a652",
  "e4307ced-51b8-4c19-864b-b4693420a1f1",
  "e1ab7009-8b10-401c-bfb1-0e79f7baa1d0",
  "e003e36c-badc-42ba-83f1-c15dea8190ff",
] as const;

export function isPilotGPlaceId(id: string): id is (typeof pilotGPlaceIds)[number] {
  return pilotGPlaceIds.includes(id as (typeof pilotGPlaceIds)[number]);
}
