import { WorkerEntrypoint } from "cloudflare:workers";

import type { RateLimit, RateLimitOptions } from "@cloudflare/workers-types";

export default class extends WorkerEntrypoint<{
  USER_RATE_LIMITER: RateLimit;
}> {
  fetch() {
    return new Response("Healthy!");
  }

  async limit(options: RateLimitOptions) {
    return this.env.USER_RATE_LIMITER.limit(options);
  }
}
