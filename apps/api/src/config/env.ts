import { type Env, parseEnv } from './parse-env';

// The only file that reads the environment (docs/11-environments-and-deployment.md).
// The API refuses to start when a variable is missing or malformed.

function load(): Env {
  try {
    // biome-ignore lint/style/noProcessEnv: this is the one place that reads the environment
    return parseEnv(process.env);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}

export const env = load();
export type { Env };
