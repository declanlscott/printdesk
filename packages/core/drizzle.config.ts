import { defineConfig } from "drizzle-kit";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { Credentials, Signers } from "./src/aws2";
import { Sst } from "./src/sst";

const runtime = ManagedRuntime.make(
  Signers.DsqlSigner.makeLayer({ expiresIn: Duration.hours(12) }).pipe(
    Layer.provide(Credentials.fromChain()),
  ),
);

export default Effect.gen(function* () {
  const credentials = yield* Sst.Resource.DsqlCluster;
  const password =
    yield* Signers.DsqlSigner.DsqlSigner.getDbConnectAdminAuthToken();

  return defineConfig({
    schema: ["./src/**/schema.ts", "./src/**/schemas.ts"],
    out: "./migrations/",
    dialect: "postgresql",
    dbCredentials: { ...credentials, password },
  });
}).pipe(runtime.runSync);
