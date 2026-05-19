import { start } from "./server.js";

start().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
