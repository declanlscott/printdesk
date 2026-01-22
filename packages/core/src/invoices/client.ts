import * as Effect from "effect/Effect";

import { AccessControl } from "../access-control";
import { Database } from "../database/client";
import { MutationsContract } from "../mutations/contract";
import { InvoicesContract } from "./contract";

export namespace Invoices {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/invoices/client/ReadRepository",
    {
      dependencies: [Database.ReadTransactionManager.Default],
      effect: Database.makeReadRepository(InvoicesContract.Table),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/invoices/client/WriteRepository",
    {
      accessors: true,
      dependencies: [
        ReadRepository.Default,
        Database.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Database.makeWriteRepository(InvoicesContract.Table, repository),
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
              new InvoicesContract.Table.DataTransferObject({
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
