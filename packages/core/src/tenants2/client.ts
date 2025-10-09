import { Effect } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
import { Replicache } from "../replicache2/client";
import { TenantsContract } from "./contracts";

export namespace Tenants {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/tenants/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.tenants.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/tenants/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([Models.SyncTables.tenants, ReadRepository]).pipe(
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

        const edit = DataAccessContract.makeMutation(TenantsContract.edit, {
          makePolicy: () => AccessControl.permission("tenants:update"),
          mutator: ({ id, ...tenant }) =>
            repository.updateById(id, () => tenant),
        });

        return { edit } as const;
      }),
    },
  ) {}
}
