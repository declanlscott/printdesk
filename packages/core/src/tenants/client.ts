import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { Replicache } from "../replicache/client";
import { TenantsContract } from "./contracts";

export namespace Tenants {
  const Table = Models.syncTables[TenantsContract.Table.name];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/tenants/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(Table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/tenants/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(Table, repository),
        ),
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
