/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { createServer } = require("node:http");

if (process.env.NODE_ENV !== "production") {
  console.error("Passenger startup requires NODE_ENV=production.");
  process.exit(1);
}

const appRoot = __dirname;
const environmentMarkerPath = path.join(appRoot, ".deployment-env");
const deploymentEnv = fs.existsSync(environmentMarkerPath)
  ? fs.readFileSync(environmentMarkerPath, "utf8").trim()
  : "";

if (deploymentEnv !== "staging" && deploymentEnv !== "production") {
  console.error(`Missing or invalid deployment marker: ${environmentMarkerPath}`);
  process.exit(1);
}

const currentPath = path.join(appRoot, "current");
const releasePath = fs.existsSync(currentPath)
  ? fs.realpathSync(currentPath)
  : appRoot;
const envPath = `/home/host11515/config/mapa-dobra/${deploymentEnv}.env`;
const releasePackagePath = path.join(releasePath, "package.json");

if (!fs.existsSync(releasePackagePath)) {
  console.error(`Active release is missing package.json: ${releasePackagePath}`);
  process.exit(1);
}

const releaseRequire = createRequire(releasePackagePath);
const dotenv = releaseRequire("dotenv");
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error(`Unable to load environment file: ${envPath}`);
  process.exit(1);
}

if (process.env.DEPLOYMENT_ENV !== deploymentEnv) {
  console.error("DEPLOYMENT_ENV does not match the deployment marker.");
  process.exit(1);
}

if (!process.env.DATABASE_URL || !process.env.APP_BASE_URL) {
  console.error("DATABASE_URL and APP_BASE_URL are required after loading environment.");
  process.exit(1);
}

process.chdir(releasePath);

const next = releaseRequire("next");
const app = next({ dev: false, dir: releasePath });
const handle = app.getRequestHandler();
const parsedPort = Number.parseInt(process.env.PORT || "", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

app.prepare()
  .then(() => {
    const server = createServer((request, response) => {
      void handle(request, response);
    });

    server.listen(port, () => {
      console.info(`Mapa Dobra ${deploymentEnv} release is listening on port ${port}.`);
    });
  })
  .catch((error) => {
    console.error("Mapa Dobra failed to start.", error);
    process.exitCode = 1;
  });
