import { AccessControl } from "@printdesk/core/access-control";
import { Actor } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { ClientsRepository } from "@printdesk/core/clients/repository";
import { Config } from "@printdesk/core/config";
import { Oauth } from "@printdesk/core/oauth";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { PapercutSyncer } from "@printdesk/core/papercut/syncer";
import { TenantId } from "@printdesk/core/utils";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Struct from "effect/Struct";

export const SystemActorFromEvent = Schema.Struct({ tenantId: TenantId }).pipe(
  Schema.decodeTo(ActorsContract.SystemActor, {
    decode: SchemaGetter.transform(ActorsContract.SystemActor.make),
    encode: SchemaGetter.forbidden(() => "Not implemented"),
  }),
);

export const handler = Effect.fn(
  function* (event: typeof SystemActorFromEvent.Encoded) {
    const systemActor = yield* Schema.decodeEffect(SystemActorFromEvent)(event);


    const context = yield* Config.use(Struct.get("getPapercutSyncClientCredentials")).pipe(
      Effect.provideService(Actor, systemActor.wrap),
      Effect.flatMap((credentials) =>
        Effect.all(
          [
            ClientsRepository.use((repository) =>
              repository.findById(credentials.id, systemActor.tenantId),
            ).pipe(Effect.map((client) => new ActorsContract.ClientActor(client).wrap)),
            Openauth.Openauth.use((openauth) => openauth.clientCredentials(credentials)).pipe(
              Effect.map((result) => result.tokens.access),
            ),
          ],
          { concurrency: "unbounded" },
        ),
      ),
      Effect.flatMap(([actor, accessToken]) =>
        Actor.layer(actor).pipe(Layer.merge(Oauth.AccessToken.layer(accessToken)), Layer.build),
      ),
    );

    yield* PapercutSyncer.use(Struct.get("syncAll")).pipe(
      AccessControl.enforce(AccessControl.permissionPolicy("papercut_sync:create")),
      Effect.provideContext(context),
    );
  },
  (effect) => effect.pipe(Effect.scoped),
);
