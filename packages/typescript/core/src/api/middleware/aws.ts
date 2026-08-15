// oxlint-disable effecttsgo/strict-effect-provide
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";

import { Actor } from "../../actors";
import { ActorsContract } from "../../actors/contract";
import { AwsCredentialIdentityProviderError } from "../../aws/credential-identity";
import { AppconfigCredentialIdentityProviderLayerMap } from "../../aws/credential-identity/appconfig";
import {
  AppsyncPublisherCredentialIdentityProviderLayerMap,
  AppsyncSubscriberCredentialIdentityProviderLayerMap,
} from "../../aws/credential-identity/appsync";

import type { AwsCredentialIdentityProvider } from "../../aws/credential-identity";

export class AwsCredentialIdentityProviderMiddleware extends HttpApiMiddleware.Service<
  AwsCredentialIdentityProviderMiddleware,
  { requires: Actor; provides: AwsCredentialIdentityProvider }
>()("@printdesk/core/api/AwsCredentialIdentityProviderMiddleware", {
  error: [ActorsContract.ForbiddenActorError, AwsCredentialIdentityProviderError],
}) {
  public static readonly makeAppconfig = AppconfigCredentialIdentityProviderLayerMap.pipe(
    Effect.map((layerMap) =>
      this.of(
        Effect.provide(
          Actor.pipe(
            Effect.map((actor) => layerMap.get(actor)),
            Layer.unwrap,
          ),
        ),
      ),
    ),
  );
  public static readonly appconfigLayer = this.makeAppconfig.pipe(
    Layer.effect(AwsCredentialIdentityProviderMiddleware),
  );

  public static readonly makeAppsyncPublisher =
    AppsyncPublisherCredentialIdentityProviderLayerMap.pipe(
      Effect.map((layerMap) =>
        AwsCredentialIdentityProviderMiddleware.of(
          Effect.provide(
            Actor.pipe(
              Effect.map((actor) => layerMap.get(actor)),
              Layer.unwrap,
            ),
          ),
        ),
      ),
    );
  public static readonly appsyncPublisherLayer = this.makeAppsyncPublisher.pipe(
    Layer.effect(AwsCredentialIdentityProviderMiddleware),
  );

  public static readonly makeAppsyncSubscriber =
    AppsyncSubscriberCredentialIdentityProviderLayerMap.pipe(
      Effect.map((layerMap) =>
        AwsCredentialIdentityProviderMiddleware.of(
          Effect.provide(
            Actor.pipe(
              Effect.map((actor) => layerMap.get(actor)),
              Layer.unwrap,
            ),
          ),
        ),
      ),
    );
  public static readonly appsyncSubscriberLayer = this.makeAppsyncSubscriber.pipe(
    Layer.effect(AwsCredentialIdentityProviderMiddleware),
  );
}
