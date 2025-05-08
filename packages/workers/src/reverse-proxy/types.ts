import type { Constants } from "@printdesk/core/utils/constants";

export type Bindings = {
  [Constants.CLOUDFLARE_BINDING_NAMES.RATE_LIMITER]: RateLimit;
};
