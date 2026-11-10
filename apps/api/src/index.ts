import { app } from "./app";
import { env } from "./config/env";

app.listen({ port: env.port, hostname: "0.0.0.0" });
console.log(`API listening on :${env.port}`);
