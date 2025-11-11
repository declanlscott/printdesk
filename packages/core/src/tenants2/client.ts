import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control2";
import { Models } from "../models2";
import { MutationsContract } from "../mutations/contract";
import { Replicache } from "../replicache2/client";
import { TenantsContract } from "./contracts";

export namespace Tenants {
  const table = Models.SyncTables[TenantsContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/tenants/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: table.pipe(Effect.flatMap(Replicache.makeReadRepository)),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/tenants/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([table, ReadRepository]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/tenants/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const edit = MutationsContract.makeMutation(TenantsContract.edit, {
          makePolicy: () => AccessControl.permission("tenants:update"),
          mutator: ({ id, ...tenant }) =>
            repository.updateById(id, () => tenant),
        });

        return { edit } as const;
      }),
    },
  ) {}
}
