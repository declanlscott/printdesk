import { defineConfig } from "drizzle-kit";
import { Duration, Effect, ManagedRuntime } from "effect";

import { DsqlSigner } from "./src/aws2";
import { Sst } from "./src/sst";

const runtime = ManagedRuntime.make(
  DsqlSigner.makeLayer({ expiresIn: Duration.hours(12) }),
);

export default Effect.gen(function* () {
  const credentials = yield* Sst.Resource.DsqlCluster;
  const password = yield* DsqlSigner.Tag.getDbConnectAdminAuthToken();

  return defineConfig({
    schema: ["./src/**/schema.ts", "./src/**/schemas.ts"],
    out: "./migrations/",
    dialect: "postgresql",
    dbCredentials: { ...credentials, password },
  });
}).pipe(runtime.runSync);
