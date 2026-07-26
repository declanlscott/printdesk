import * as Schema from "effect/Schema";

import { NonEmptyString } from "../utils";

export namespace CloudflareContract {
  export const TunnelId = NonEmptyString.pipe(Schema.brand("CloudflareTunnelId"));
  export type TunnelId = typeof TunnelId.Type;

  export const TunnelToken = NonEmptyString.pipe(
    Schema.brand("CloudflareTunnelToken"),
    Schema.RedactedFromValue,
  );
  export type TunnelToken = typeof TunnelToken.Type;
}
