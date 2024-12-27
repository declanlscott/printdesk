import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { Resource } from "sst";

import { Dsql, withAws } from "../utils/aws";

export const db = drizzle(
  postgres({
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
  }),
  { logger: true },
);

export type Db = typeof db;
