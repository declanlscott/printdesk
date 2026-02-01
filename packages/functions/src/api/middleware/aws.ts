import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { Actors } from "@printdesk/core/actors";
import { Credentials } from "@printdesk/core/aws";
import { CredentialsApi } from "@printdesk/core/aws/api";
import { Sst } from "@printdesk/core/sst";
import { tenantTemplate } from "@printdesk/core/utils";
import * as Cache from "effect/Cache";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import type { FromTemporaryCredentialsOptions } from "@aws-sdk/credential-providers";
import type { ActorsContract } from "@printdesk/core/actors/contract";

// TODO: `Context.unsafeGet` is a workaround because `HttpApiMiddleware` doesn't
// support requirements yet, but this should be fixed in Effect v4.0:
// https://github.com/Effect-TS/effect/pull/5443#issuecomment-3246785154

export const realtimeSubscriberCredentialsIdentityLayer = Effect.gen(
  function* () {
    const resource = yield* Sst.Resource;

    const cache = yield* Cache.make({
      capacity: 100,
      timeToLive: Duration.minutes(15),
      lookup: (actor: ActorsContract.Actor["properties"]) =>
        Match.value(actor).pipe(
          Match.tag(
            "PublicActor",
            () =>
              ({
                RoleArn: resource.RealtimeSubscriberRole.pipe(Redacted.value)
                  .arn,
                RoleSessionName: "PublicRealtimeSubscriber",
                ExternalId: resource.RealtimeSubscriberRoleExternalId.pipe(
                  Redacted.value,
                ).value,
              }) satisfies FromTemporaryCredentialsOptions["params"],
          ),
          Match.orElse(
            ({ tenantId }) =>
              ({
                RoleArn: tenantTemplate(
                  resource.TenantRoles.pipe(Redacted.value).realtimeSubscriber
                    .nameTemplate,
                  tenantId,
                ),
                RoleSessionName: "TenantRealtimeSubscriber",
              }) satisfies FromTemporaryCredentialsOptions["params"],
          ),
          (params) =>
            Credentials.Identity.fromProvider(() =>
              fromTemporaryCredentials({ params }),
            ),
        ),
    });

    return CredentialsApi.Identity.of(
      Effect.context<never>().pipe(
        Effect.map(Context.unsafeGet(Actors.Actor)),
        Effect.map(Struct.get("properties")),
        Effect.flatMap((actor) => cache.get(actor)),
      ),
    );
  },
).pipe(
  Layer.effect(CredentialsApi.Identity),
  Layer.provide(Sst.Resource.Default),
);

export const tenantRealtimePublisherCredentialsIdentityLayer = Effect.gen(
  function* () {
    const resource = yield* Sst.Resource;

    const cache = yield* Cache.make({
      capacity: 100,
      timeToLive: Duration.minutes(15),
      lookup: ({ tenantId }: ActorsContract.PrivateActor) =>
        Credentials.Identity.fromProvider(() =>
          fromTemporaryCredentials({
            params: {
              RoleArn: tenantTemplate(
                resource.TenantRoles.pipe(Redacted.value).realtimePublisher
                  .nameTemplate,
                tenantId,
              ),
              RoleSessionName: "TenantRealtimePublisher",
            },
          }),
        ),
    });

    return CredentialsApi.Identity.of(
      Effect.context<never>().pipe(
        Effect.map(Context.unsafeGet(Actors.Actor)),
        Effect.flatMap(Struct.get("assertPrivate")),
        Effect.flatMap((actor) => cache.get(actor)),
      ),
    );
  },
).pipe(
  Layer.effect(CredentialsApi.Identity),
  Layer.provide(Sst.Resource.Default),
);
