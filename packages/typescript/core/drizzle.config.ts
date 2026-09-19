import { defineConfig } from "drizzle-kit";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";

import { nodeCredentialIdentityProviderLayer } from "./src/aws/credential-identity/node";
import { DsqlSigner } from "./src/aws/dsql-signer";
import { layer as dsqlSignerLayer } from "./src/aws/dsql-signer/layer";
import { SstResource } from "./src/sst/resource";

const configRuntime = dsqlSignerLayer({ expiresIn: Duration.hours(12) }).pipe(
  Layer.provide(nodeCredentialIdentityProviderLayer),
  Layer.provideMerge(SstResource.layer),
  ManagedRuntime.make,
);

export default await Effect.gen(function* () {
  const credentials = yield* SstResource.useSync((resource) => resource.Dsql.pipe(Redacted.value));
  const password = yield* DsqlSigner.use((signer) => signer.getDbConnectAdminAuthToken());

  return defineConfig({
    schema: "./src/**/sql.ts",
    out: "./migrations/",
    dialect: "postgresql",
    dbCredentials: { ...credentials, password },
  });
}).pipe(configRuntime.runPromise);
