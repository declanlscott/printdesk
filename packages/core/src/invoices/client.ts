import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control";
import { Models } from "../models";
import { MutationsContract } from "../mutations/contract";
import { Replicache } from "../replicache/client";
import { InvoicesContract } from "./contract";

export namespace Invoices {
  const table = Models.syncTables[InvoicesContract.tableName];

  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/invoices/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Replicache.makeReadRepository(table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/invoices/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(table, repository),
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

        const create = MutationsContract.makeMutation(InvoicesContract.create, {
          makePolicy: () => AccessControl.permission("invoices:create"),
          mutator: (invoice, { tenantId }) =>
            repository.create(
              InvoicesContract.DataTransferObject.make({
                ...invoice,
                tenantId,
              }),
            ),
        });

        return { create } as const;
      }),
    },
  ) {}
}
