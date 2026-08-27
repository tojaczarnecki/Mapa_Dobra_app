export function samePlaceIdSet(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

export function retainPlaceIds(
  candidateIds: readonly string[],
  availableIds: readonly string[],
) {
  const available = new Set(availableIds);
  return candidateIds.filter((id) => available.has(id));
}
