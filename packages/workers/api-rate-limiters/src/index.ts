import { WorkerEntrypoint } from "cloudflare:workers";

import type { RateLimit, RateLimitOptions } from "@cloudflare/workers-types";

export default class extends WorkerEntrypoint<{
  IP_RATE_LIMITER: RateLimit;
  USER_RATE_LIMITER: RateLimit;
}> {
  fetch() {
    return new Response("Healthy!");
  }

  async byIp(options: RateLimitOptions) {
    return this.env.IP_RATE_LIMITER.limit(options);
  }

  async byUser(options: RateLimitOptions) {
    return this.env.USER_RATE_LIMITER.limit(options);
  }
}
