import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { InvoicesMutations } from ".";
import { AccessControl } from "../../access-control";
import { MutationsContract } from "../../mutations/contract";
import { OrdersContract } from "../../orders/contract";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { InvoicesContract } from "../contract";
import { InvoicesRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* InvoicesRepository;

  const notifier = yield* ReplicacheNotifier;

  const notify = (invoice: typeof InvoicesContract.Table.Model.Type) =>
    notifier.notify(
      Array.make(
        ReplicacheContract.PullPermission.make({ permission: "invoices:read" }),
        ReplicacheContract.PullPermission.make({ permission: "active_invoices:read" }),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isCustomerOrManager.make({ id: invoice.orderId, userId: Option.none() }),
        ),
        ReplicacheContract.PullPolicy.make(
          OrdersContract.isManagerAuthorized.make({
            id: invoice.orderId,
            managerId: Option.none(),
          }),
        ),
      ),
    );

  const create = MutationsContract.makeMutation(InvoicesContract.create, {
    makePolicy: Effect.fn("Invoices.Mutations.create.makePolicy")(() =>
      AccessControl.userPermissionPolicy("invoices:create"),
    ),
    mutator: Effect.fn("Invoices.Mutations.create.mutator")((invoice, { tenantId }) =>
      repository.create({ ...invoice, tenantId }).pipe(Effect.tap(notify)),
    ),
  });

  return { create } as const;
});

export const layer = makeService.pipe(Layer.effect(InvoicesMutations));
