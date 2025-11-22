import * as Effect from "effect/Effect";

import { Models } from "../models2";
import { Replicache } from "../replicache2/client";
import { GroupsContract } from "./contract";

export namespace Groups {
  const table = Models.SyncTables[GroupsContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/groups/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: table.pipe(Effect.flatMap(Replicache.makeReadRepository)),
    },
  ) {}
}
