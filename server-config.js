export function getPassengerApi(scope = globalThis) {
  const passenger = scope.PhusionPassenger;
  if (!passenger || typeof passenger.configure !== "function") return null;
  passenger.configure({ autoInstall: false });
  return passenger;
}

export function getListenTarget({ passenger, port }) {
  if (passenger) return "passenger";
  if (!Number.isInteger(port) || port <= 0) throw new Error("A valid PORT is required outside Passenger.");
  return port;
}

