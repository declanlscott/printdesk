import * as Schema from "effect/Schema";

export namespace CloudflareContract {
  export const TunnelId = Schema.NonEmptyString.pipe(Schema.brand("CloudflareTunnelId"));
  export type TunnelId = typeof TunnelId.Type;

  export const TunnelToken = Schema.NonEmptyString.pipe(
    Schema.brand("CloudflareTunnelToken"),
    Schema.RedactedFromValue,
  );
  export type TunnelToken = typeof TunnelToken.Type;
}
