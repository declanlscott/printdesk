import * as PgClient from "@effect/sql-pg/PgClient";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Struct from "effect/Struct";

import { DsqlSigner } from "../aws/dsql-signer";
import { SstResource } from "../sst/resource";

export const layer = Effect.gen(function* () {
  const dsql = yield* SstResource.useSync(Struct.get("Dsql")).pipe(Effect.map(Redacted.value));
  const signer = yield* DsqlSigner;

  return PgClient.layer({
    database: dsql.database,
    host: dsql.host,
    port: dsql.port,
    ssl: dsql.ssl,
    username: dsql.user,
    password: signer.getDbConnectAdminAuthToken().pipe(Effect.map(Redacted.make)),
    startupParameters: { TimeZone: "UTC" },
  });
}).pipe(Layer.unwrap);
