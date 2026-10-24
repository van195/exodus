import app from "./src/app.js";
import { client } from "./src/db/index.js";

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const { port } = server.address();
try {
  for (const [label, path] of [
    ["root", "/"],
    ["database", "/api/test-supabase"],
    ["meWithoutToken", "/api/auth/me"],
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    console.log(JSON.stringify({ label, status: response.status, body: await response.json() }));
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  await client.end({ timeout: 2 });
}
