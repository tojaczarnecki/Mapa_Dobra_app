import { createServer } from "node:http";
import next from "next";
import { getListenTarget, getPassengerApi } from "./server-config.js";

if (process.env.NODE_ENV !== "production") {
  console.error("Passenger startup requires NODE_ENV=production.");
  process.exit(1);
}

// Passenger exposes PhusionPassenger on the global object and owns the socket.
const passenger = getPassengerApi();
const port = Number.parseInt(process.env.PORT ?? "", 10);
const listenTarget = getListenTarget({ passenger, port });

const app = next({ dev: false, ...(passenger ? {} : { port }) });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((request, response) => {
  void handle(request, response);
});

server.listen(listenTarget, () => {
  console.info(passenger ? "Mapa Dobra is listening through Phusion Passenger." : `Mapa Dobra server is listening on port ${port}.`);
});
