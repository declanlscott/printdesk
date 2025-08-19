import { Effect } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import { InvoicesContract } from "./contract";

export namespace Invoices {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/invoices/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(InvoicesContract.table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/invoices/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(InvoicesContract.table, repository),
        ),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/invoices/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const create = DataAccessContract.makeMutation(
          InvoicesContract.create,
          Effect.succeed({
            makePolicy: () => AccessControl.permission("invoices:create"),
            mutator: (invoice, { tenantId }) =>
              repository.create(
                InvoicesContract.table.Schema.make({ ...invoice, tenantId }),
              ),
          }),
        );

        return { create } as const;
      }),
    },
  ) {}
}
