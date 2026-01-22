import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control";
import { Database } from "../database/client";
import { MutationsContract } from "../mutations/contract";
import { TenantsContract } from "./contracts";

export namespace Tenants {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/tenants/client/ReadRepository",
    {
      dependencies: [Database.ReadTransactionManager.Default],
      effect: Database.makeReadRepository(TenantsContract.Table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/tenants/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Database.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Database.makeWriteRepository(TenantsContract.Table, repository),
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
