import { startActOSServer } from "./server.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

startActOSServer({
  host,
  port,
  headless: process.env.HEADLESS !== "false",
  logger: true,
})
  .then(({ url }) => {
    console.log(`ActOS runtime server listening at ${url}`);
  })
  .catch((error) => {
    console.error("Failed to start ActOS runtime server", error);
    process.exit(1);
  });
