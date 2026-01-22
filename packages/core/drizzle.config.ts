import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { defineConfig } from "drizzle-kit";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import * as Redacted from "effect/Redacted";

import { Credentials, Signers } from "./src/aws";
import { Sst } from "./src/sst";

const runtime = Signers.Dsql.makeLayer({ expiresIn: Duration.hours(12) }).pipe(
  Layer.provide(Credentials.Identity.providerLayer(fromNodeProviderChain)),
  Layer.provideMerge(Sst.Resource.Default),
  ManagedRuntime.make,
);

export default Effect.gen(function* () {
  const credentials = yield* Sst.Resource.DsqlCluster.pipe(
    Effect.map(Redacted.value),
  );
  const password = yield* Signers.Dsql.Signer.getDbConnectAdminAuthToken();

  return defineConfig({
    schema: ["./src/**/schema.ts", "./src/**/schemas.ts"],
    out: "./migrations/",
    dialect: "postgresql",
    dbCredentials: { ...credentials, password },
  });
}).pipe(runtime.runSync);
