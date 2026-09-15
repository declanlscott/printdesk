import { makeS3Service, S3ClientInstance, S3ServiceConfig } from "@effect-aws/client-s3";
import * as Cache from "effect/Cache";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Struct from "effect/Struct";

import { Constants } from "../../utils/constants";
import { AwsCredentialIdentityProvider, type AwsCredentialIdentity } from "../credential-identity";

export class S3ClientCache extends Context.Service<S3ClientCache>()(
  "@printdesk/core/aws/S3ClientCache",
  {
    make: Effect.fn(function* (endpoint: string) {
      const cache = yield* Cache.make({
        capacity: Constants.DEFAULT_CACHE_CAPACITY,
        lookup: Effect.fn(function* (credentials: AwsCredentialIdentity) {
          return yield* makeS3Service.pipe(
            Effect.provideServiceEffect(S3ClientInstance.S3ClientInstance, S3ClientInstance.make),
            S3ServiceConfig.withS3ServiceConfig({
              credentials: yield* credentials.encode,
              endpoint,
              region: "auto",
            }),
          );
        }),
      });

      const get = AwsCredentialIdentityProvider.provide.pipe(
        Effect.flatMap((credentials) => cache.pipe(Cache.get(credentials))),
      );

      return {
        get,
      } as const;
    }),
  },
) {
  public static readonly get = this.useSync(Struct.get("get"));

  public static readonly layer = (...args: Parameters<typeof this.make>) =>
    this.make(...args).pipe(Layer.effect(this));
}
