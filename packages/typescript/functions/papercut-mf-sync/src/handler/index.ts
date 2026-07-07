import { AccessControl } from "@printdesk/core/access-control";
import { Actor, ActorLayerMap } from "@printdesk/core/actors";
import { ActorsContract } from "@printdesk/core/actors/contract";
import { AppsyncPublisherCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appsync";
import { ClientsRepository } from "@printdesk/core/clients/repository";
import { Config } from "@printdesk/core/config";
import { Oauth } from "@printdesk/core/oauth";
import { Openauth } from "@printdesk/core/oauth/openauth";
import { PapercutMfSyncer } from "@printdesk/core/papercut-mf/syncer";
import { ReplicacheNotifier } from "@printdesk/core/replicache/notifier";
import { TenantsRepository } from "@printdesk/core/tenants/repository";
import { TenantId } from "@printdesk/core/utils";
import * as Array from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
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
    const accessTokenLayerMap = yield* Oauth.AccessTokenLayerMap;
    const appsyncPublisherCredentialIdentityProviderLayerMap =
      yield* AppsyncPublisherCredentialIdentityProviderLayerMap;
    const actorLayerMap = yield* ActorLayerMap;

    const config = yield* Config;
    const openauth = yield* Openauth.Openauth;

    const clientsRepository = yield* ClientsRepository;
    const papercutMfSyncer = yield* PapercutMfSyncer;
    const replicacheNotifier = yield* ReplicacheNotifier;
    const tenantsRepository = yield* TenantsRepository;

    const context = yield* config.getPapercutMfSyncClientCredentials.pipe(
      Effect.flatMap((credentials) =>
        Effect.all(
          [
            openauth
              .clientCredentials(credentials)
              .pipe(Effect.map((result) => result.tokens.access)),
            Actor.use(Struct.get("tenantId")).pipe(
              Effect.flatMap((tenantId) => clientsRepository.findById(credentials.id, tenantId)),
              Effect.map((client) => new ActorsContract.ClientActor(client).wrap),
            ),
          ],
          { concurrency: "unbounded" },
        ),
      ),
      Effect.provide(
        Function.pipe(
          event,
          Schema.decodeEffect(SystemActorFromEvent),
          Effect.map((systemActor) => actorLayerMap.get(systemActor.wrap)),
          Layer.unwrap,
        ),
      ),
      Effect.flatMap(([accessToken, clientActor]) =>
        Layer.mergeAll(
          accessTokenLayerMap.get(accessToken),
          appsyncPublisherCredentialIdentityProviderLayerMap.get(clientActor),
        ).pipe(Layer.provideMerge(actorLayerMap.get(clientActor)), Layer.build),
      ),
    );

    yield* Effect.provideContext(
      Effect.gen(function* () {
        yield* AccessControl.permissionPolicy("papercut_mf_sync:create");

        yield* papercutMfSyncer.syncAll.pipe(
          Effect.map(Array.flatten),
          Effect.filterOrElse(Array.isArrayEmpty, () => replicacheNotifier.poke),
          Effect.asVoid,
        );

        const lastPapercutSyncAt = yield* DateTime.now;
        yield* Actor.use(Struct.get("tenantId")).pipe(
          Effect.flatMap((tenantId) =>
            tenantsRepository.updateById(tenantId, { lastPapercutSyncAt }),
          ),
        );
      }),
      context,
    );
  },
  (effect) => effect.pipe(Effect.scoped),
);
