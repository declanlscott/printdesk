import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { Actor } from "../actors";
import { App } from "../app";
import { IdentityProvidersContract } from "../identity/contract";
import { UsersContract } from "../users/contract";
import { NonEmptyString, TenantId } from "../utils";

export namespace AssetsContract {
  export class PresignedUrlPayload extends Schema.Class<PresignedUrlPayload>("PresignedUrlPayload")(
    {
      expiresIn: Schema.DurationFromMillis.pipe(
        Schema.withConstructorDefault(Effect.succeed(Duration.hours(1))),
      ),
    },
  ) {}

  export class PresignedUrlSuccess extends Schema.Class<PresignedUrlSuccess>("PresignedUrlSuccess")(
    { url: Schema.URL, expiresAt: Schema.DateTimeUtc },
    { httpApiStatus: 200 },
  ) {}

  export const CacheSyntheticUrlFromKey = NonEmptyString.pipe(
    Schema.decodeTo(Schema.URL, {
      decode: SchemaGetter.transformEffect((key) =>
        App.useSync(
          (app) => new URL(`https://cache.${app.stage}.${app.name}.internal/assets/${key}`),
        ),
      ),
      encode: SchemaGetter.forbidden(() => "Not implemented"),
    }),
  );

  export const CacheSyntheticUrlFromHashTag = Schema.URLFromString.pipe(
    // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
    Schema.encodeTo(Schema.TemplateLiteralParser([TenantId, ":" as string, Schema.String]), {
      decode: SchemaGetter.transform(Tuple.get(2)),
      encode: SchemaGetter.transformEffect((url) =>
        Actor.tenantId.pipe(
          Effect.mapBoth({
            // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
            onSuccess: (tenantId) => Tuple.make(tenantId, ":" as string, url),
            onFailure: (error) => new SchemaIssue.Forbidden({ message: error.message }),
          }),
        ),
      ),
    }),
    Schema.encode(SchemaTransformation.stringFromBase64UrlString),
  );

  export const InvalidationNotificationQueueMessage = Schema.Struct({
    _tag: Schema.tagDefaultOmit("InvalidationNotificationQueueMessage"),
    account: NonEmptyString,
    action: Schema.Literal("PutObject"),
    bucket: NonEmptyString,
    object: Schema.Struct({
      key: NonEmptyString,
      size: Schema.ByteSizeFromNumber,
      eTag: Schema.String,
    }),
    eventTime: Schema.DateTimeUtcFromString,
  });

  export class UserAvatarQueueMessage extends Schema.TaggedClass<UserAvatarQueueMessage>()(
    "UserAvatarQueueMessage",
    {
      tenantId: TenantId,
      identityProvider: IdentityProvidersContract.Table.Model.mapFields(
        Struct.pick(["externalId", "kind"]),
      ),
      user: UsersContract.Table.Model.mapFields(Struct.pick(["id", "externalId"])).mapFields(
        Struct.evolve({ id: (id) => id.from.schema.members[0] }),
      ),
    },
  ) {}

  export const QueueMessage = Schema.Union([
    InvalidationNotificationQueueMessage,
    UserAvatarQueueMessage,
  ]);
}
