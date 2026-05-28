import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { InvoicesMutations } from ".";
import { AccessControl } from "../../../access-control";
import { MutationsContract } from "../../../mutations/contract";
import { InvoicesContract } from "../../contract";
import { InvoicesWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* InvoicesWriteRepository;

  const create = MutationsContract.makeMutation(InvoicesContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("invoices:create"),
    mutator: (invoice, { tenantId }) =>
      InvoicesContract.Table.Dto.makeEffect({ ...invoice, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  return { create } as const;
});

export const layer = makeService.pipe(Layer.effect(InvoicesMutations));
