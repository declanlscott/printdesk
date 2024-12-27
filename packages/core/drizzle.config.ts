import { defineConfig } from "drizzle-kit";
import { Resource } from "sst";

import { Dsql, withAws } from "./src/utils/aws";

export default defineConfig({
  schema: "./src/**/sql.ts",
  out: "./migrations/",
  dialect: "postgresql",
  dbCredentials: {
    host: Resource.DsqlCluster.hostname,
    port: Resource.DsqlCluster.port,
    database: Resource.DsqlCluster.database,
    user: Resource.DsqlCluster.user,
    password: await withAws(
      {
        dsql: {
          signer: Dsql.buildSigner({
            hostname: Resource.DsqlCluster.hostname,
            region: Resource.Aws.region,
          }),
        },
      },
      async () => Dsql.generateToken(),
    ),
    ssl: "require",
  },
});
