import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Resource } from "sst";

import { Dsql, withAws } from "../utils/aws";

const pool = new Pool({
  ...Resource.DsqlCluster,
  password: async () =>
    withAws(
      {
        dsql: {
          signer: Dsql.buildSigner({
            hostname: Resource.DsqlCluster.host,
            region: Resource.Aws.region,
          }),
        },
      },
      Dsql.generateToken,
    ),
});

export const db = drizzle({ client: pool, logger: true });

export type Db = typeof db;
