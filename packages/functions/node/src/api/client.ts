// Precompiles types so `tsserver` doesn't slow down
// NOTE: https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended

import { hc } from "hono/client";

import type { Api } from "./index";

export type Client = ReturnType<typeof hc<Api>>;

export const client = (...args: Parameters<typeof hc>): Client =>
  hc<Api>(...args);
