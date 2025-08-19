import { Effect } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import { TenantsContract } from "./contracts";

export namespace Tenants {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/tenants/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(TenantsContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/tenants/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(TenantsContract.table, repository),
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

        const update = DataAccessContract.makeMutation(
          TenantsContract.update,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("tenants:update"),
            mutator: (tenant) => repository.updateById(tenant.id, tenant),
          }),
        );

        return { update } as const;
      }),
    },
  ) {}
}
