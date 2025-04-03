import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Resource } from "sst";

import { Dsql } from "../aws";
import { withAws } from "../aws/context";

import type { PoolConfig } from "pg";

function getPoolConfig(): PoolConfig {
  let resource: Pick<Resource, "DsqlCluster" | "Aws"> | undefined;

  try {
    resource = {
      DsqlCluster: Resource.DsqlCluster,
      Aws: Resource.Aws,
    };
  } catch (e) {
    console.warn("SST link(s) are not active in this environment:", e);

    return {};
  }

  return {
    ...resource.DsqlCluster,
    password: async () =>
      withAws(
        () => ({
          dsql: {
            signer: Dsql.buildSigner({
              hostname: resource.DsqlCluster.host,
              region: resource.Aws.region,
            }),
          },
        }),
        Dsql.generateToken,
      ),
  };
}

const pool = new Pool(getPoolConfig());

export const db = drizzle({ client: pool, logger: true });

export type Db = typeof db;
