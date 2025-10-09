import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control2";
import { Models } from "../models2";
import { MutationsContract } from "../mutations/contract";
import { Replicache } from "../replicache2/client";
import { InvoicesContract } from "./contract";

export namespace Invoices {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/invoices/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.invoices.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/invoices/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([Models.SyncTables.invoices, ReadRepository]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
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
