import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { AwsCron } from "../aws/cron";
import { Ipv4, Timezone } from "../utils";
import { Constants } from "../utils/constants";

export namespace PapercutContract {
  export class ApiHostNameConfig extends Schema.TaggedClass<ApiHostNameConfig>()(
    "PapercutApiHostNameConfig",
    {
      name: Schema.NonEmptyString,
      resolverIps: Ipv4.pipe(
        Schema.Array,
        Schema.withDecodingDefaultType(Effect.sync(Array.empty<Schema.Schema.Type<typeof Ipv4>>)),
      ),
    },
  ) {}

  export class ApiHostIpv4Config extends Schema.TaggedClass<ApiHostIpv4Config>()(
    "PapercutApiHostIpv4Config",
    { ipv4: Ipv4 },
  ) {}

  export class ApiConfig extends Schema.Class<ApiConfig>("ApiConfig")({
    protocol: Schema.Literals(["http", "https"]),
    host: Schema.Union([ApiHostNameConfig, ApiHostIpv4Config]).pipe(Schema.toTaggedUnion("_tag")),
    port: Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0), Schema.isLessThan(2 ** 16))),
  }) {}

  export class SyncConfig extends Schema.Class<SyncConfig>("SyncConfig")({
    cronExpression: AwsCron.Expression.pipe(
      Schema.withConstructorDefault(
        Effect.succeed(Constants.DEFAULT_PAPERCUT_SYNC_CRON_EXPRESSION),
      ),
    ),
    timezone: Timezone,
  }) {}

  export class EnabledConfig extends Schema.Class<EnabledConfig>("EnabledConfig")({
    enabled: Schema.Literal(true).pipe(Schema.withConstructorDefault(Effect.succeed(true))),
    api: ApiConfig,
    sync: SyncConfig,
  }) {}

  export class DisabledConfig extends Schema.Class<DisabledConfig>("DisabledConfig")({
    enabled: Schema.Literal(false).pipe(Schema.withConstructorDefault(Effect.succeed(false))),
  }) {}

  export const Config = Schema.Union([EnabledConfig, DisabledConfig]);
  export type Config = typeof Config.Type;

  export const ApiAuthToken = Schema.NonEmptyString.pipe(
    Schema.brand("PapercutApiAuthToken"),
    Schema.Redacted,
  );
  export type ApiAuthToken = typeof ApiAuthToken.Type;
}
