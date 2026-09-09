export function conceptualHelpRequestProgress(screen: number, canGoBack: boolean) {
  if (screen <= 1) return 1;
  if (screen >= 2 && screen <= 4) return 2;
  if (screen === 5) return 3;
  if (screen === 6) return 4;
  if (screen === 7) return 5;
  // Screen 8 is used both for confirming a geolocated point and for the final success state.
  return canGoBack ? 2 : 5;
}
