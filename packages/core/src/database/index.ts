import { drizzle } from "drizzle-orm/node-postgres";
import { Resource } from "sst";

import { Dsql } from "../aws";
import { withAws } from "../aws/context";

import type { NodePgClient, NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PoolConfig } from "pg";

export class Database {
  static #drizzle: NodePgDatabase<Record<string, never>> & {
    $client: NodePgClient;
  };

  static #getPoolConfig(): PoolConfig {
    return {
      database: Resource.DsqlCluster.database,
      host: Resource.DsqlCluster.host,
      port: Resource.DsqlCluster.port,
      ssl: Resource.DsqlCluster.ssl,
      user: Resource.DsqlCluster.user,
      password: async () =>
        withAws(
          () => ({
            dsql: {
              signer: Dsql.buildSigner({
                hostname: Resource.DsqlCluster.host,
                region: Resource.Aws.region,
              }),
            },
          }),
          Dsql.generateToken,
        ),
    };
  }

  static initialize() {
    if (!Database.#drizzle)
      Database.#drizzle = drizzle({
        connection: Database.#getPoolConfig(),
        logger: true,
      });

    return this.#drizzle;
  }
}
