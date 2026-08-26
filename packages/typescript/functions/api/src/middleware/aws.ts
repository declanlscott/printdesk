import { AwsCredentialIdentityProviderMiddleware } from "@printdesk/core/api/middleware/aws";
import { AppconfigCredentialIdentityProviderLayerMap } from "@printdesk/core/aws/credential-identity/appconfig";
import {
  AppsyncPublisherCredentialIdentityProviderLayerMap,
  AppsyncSubscriberCredentialIdentityProviderLayerMap,
} from "@printdesk/core/aws/credential-identity/appsync";
import * as Layer from "effect/Layer";

export const appconfigCredentialIdentityProviderMiddlewareLayer =
  AwsCredentialIdentityProviderMiddleware.appconfigLayer.pipe(
    Layer.provide(AppconfigCredentialIdentityProviderLayerMap.layer),
  );

export const appsyncPublisherCredentialIdentityProviderMiddlewareLayer =
  AwsCredentialIdentityProviderMiddleware.appsyncPublisherLayer.pipe(
    Layer.provide(AppsyncPublisherCredentialIdentityProviderLayerMap.layer),
  );

export const appsyncSubscriberCredentialIdentityProviderMiddlewareLayer =
  AwsCredentialIdentityProviderMiddleware.appsyncSubscriberLayer.pipe(
    Layer.provide(AppsyncSubscriberCredentialIdentityProviderLayerMap.layer),
  );
