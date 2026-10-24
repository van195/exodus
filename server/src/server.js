import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be an integer between 1 and 65535.");
  process.exitCode = 1;
} else {
  // Express 5 also invokes app.listen's callback on errors. Using the native
  // listening event prevents a failed bind from being reported as success.
  const server = createServer(app);
  server.once("error", (error) => {
    console.error(`Backend failed to listen on port ${port}: ${error.code || error.message}`);
    if (error.code === "EADDRINUSE") {
      console.error("Another process is already using this port. Stop the duplicate backend, or use the running backend.");
    } else if (error.code === "EACCES" || error.code === "EPERM") {
      console.error("This environment does not permit listening on this port. Run the backend in a terminal with local network access.");
    }
    process.exitCode = 1;
  });
  server.listen(port, () => {
    console.log(`Trust Payment API running on port ${port}`);
  });
}
