import { DsqlSigner } from "@aws-sdk/dsql-signer";

import { dsqlCluster } from "./db";
import { aws_ } from "./misc";

new sst.x.DevCommand("Studio", {
  link: [dsqlCluster],
  dev: {
    command: "pnpm drizzle:studio",
    directory: "packages/core",
    autostart: true,
  },
  environment: {
    DB_PASSWORD: $resolve([dsqlCluster.endpoint, aws_.properties.region]).apply(
      ([hostname, region]) =>
        new DsqlSigner({ hostname, region }).getDbConnectAdminAuthToken(),
    ),
  },
});
