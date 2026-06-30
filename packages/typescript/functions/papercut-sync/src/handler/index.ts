import { Actor } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { ClientsRepository } from "@printdesk/core/clients/repository";
import { Config } from "@printdesk/core/config";
import { Oauth } from "@printdesk/core/oauth";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { PapercutSyncer } from "@printdesk/core/papercut/syncer";
import { TenantId } from "@printdesk/core/utils";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Struct from "effect/Struct";

export const SystemActorFromEvent = Schema.Struct({ tenantId: TenantId }).pipe(
  Schema.decodeTo(ActorsContract.SystemActor, {
    decode: SchemaGetter.transform(ActorsContract.SystemActor.make),
    encode: SchemaGetter.forbidden(() => "Not implemented"),
  }),
);

export const handler = Effect.fn(function* (event: typeof SystemActorFromEvent.Encoded) {
  const systemActor = yield* Schema.decodeEffect(SystemActorFromEvent)(event);

  const credentials = yield* Config.use(Struct.get("getPapercutSyncClientCredentials")).pipe(
    Effect.provideService(Actor, systemActor.wrap),
  );

  const context = yield* Effect.all(
    [
      ClientsRepository.use((repository) =>
        repository.findById(credentials.id, systemActor.tenantId),
      ).pipe(Effect.map((client) => new ActorsContract.ClientActor(client).wrap)),
      Openauth.Openauth.use((openauth) => openauth.clientCredentials(credentials)).pipe(
        Effect.map((result) => result.tokens.access),
      ),
    ],
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map(([actor, accessToken]) =>
      Context.empty().pipe(Context.add(Actor, actor), Context.add(Oauth.AccessToken, accessToken)),
    ),
  );

  yield* PapercutSyncer.use(Struct.get("syncAll")).pipe(Effect.provideContext(context));
});
