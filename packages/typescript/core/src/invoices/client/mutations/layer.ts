import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { InvoicesMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { InvoicesContract } from "../../contract";
import { InvoicesRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* InvoicesRepository;

  const create = Mutation.make(InvoicesContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("invoices:create"),
    mutator: (invoice, { tenantId }) =>
      InvoicesContract.Table.Dto.makeEffect({ ...invoice, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  return { create } as const;
});

export const layer = makeService.pipe(Layer.effect(InvoicesMutations));
