import { createServer } from "node:http";
import next from "next";

if (process.env.NODE_ENV !== "production") {
  console.error("Passenger startup requires NODE_ENV=production.");
  process.exit(1);
}

const port = Number.parseInt(process.env.PORT ?? "", 10);
if (!Number.isInteger(port) || port <= 0) {
  console.error("Passenger startup requires a valid PORT environment variable.");
  process.exit(1);
}

const app = next({ dev: false, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((request, response) => {
  void handle(request, response);
});

server.listen(port, () => {
  console.info(`Mapa Dobra Passenger server is listening on port ${port}.`);
});

