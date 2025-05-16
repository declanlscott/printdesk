import { Announcements } from "../announcements/client";
import { BillingAccounts } from "../billing-accounts/client";
import { Comments } from "../comments/client";
import { Invoices } from "../invoices/client";
import { Orders } from "../orders/client";
import { Products } from "../products/client";
import { Rooms } from "../rooms/client";
import { Tenants } from "../tenants/client";
import { Users } from "../users/client";

import type { WriteTransaction } from "@rocicorp/replicache";
import type * as v from "valibot";
import type { Command, commandRepository, CommandRepository } from ".";
import type { Replicache } from "../replicache/client";
import type { User } from "../users/sql";

export class MutatorsBuilder<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCommandRepository extends CommandRepository<any>,
  TMutations extends Record<
    string,
    Command<string, v.GenericSchema>
  > = TCommandRepository extends CommandRepository<infer TCommands>
    ? TCommands
    : never,
  TMutators extends {
    [TName in keyof TMutations]?: Replicache.Mutator<
      TMutations[TName]["schema"]
    >;
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  } = {},
> {
  private _mutators = new Map<
    string,
    (tx: WriteTransaction, ...args: Array<unknown>) => Promise<void>
  >();

  constructor(private readonly _userId: User["id"]) {}

  public mutator<TName extends keyof TMutations & string>(
    name: TName,
    getMutator: (
      userId: User["id"],
    ) => Replicache.Mutator<TMutations[TName]["schema"]>,
  ) {
    this._mutators.set(name, getMutator(this._userId));

    return this as MutatorsBuilder<
      TCommandRepository,
      TMutations,
      TMutators & Record<TName, Replicache.Mutator<TMutations[TName]["schema"]>>
    >;
  }

  public build(
    this: TMutators extends {
      [TName in keyof TMutations]: Replicache.Mutator<
        TMutations[TName]["schema"]
      >;
    }
      ? MutatorsBuilder<TCommandRepository, TMutations, TMutators>
      : never,
  ) {
    return Object.fromEntries(this._mutators.entries()) as {
      [TName in keyof TMutations]: Replicache.Mutator<
        TMutations[TName]["schema"]
      >;
    };
  }
}

/**
 * Returns a collection of optimistic mutators for Replicache. This should match the corresponding server-side mutators.
 */
export const createMutators = (userId: User["id"]) =>
  new MutatorsBuilder<typeof commandRepository>(userId)
    .mutator("createAnnouncement", Announcements.create)
    .mutator("updateAnnouncement", Announcements.update)
    .mutator("deleteAnnouncement", Announcements.delete_)
    .mutator(
      "updateBillingAccountReviewThreshold",
      BillingAccounts.updateReviewThreshold,
    )
    .mutator("deleteBillingAccount", BillingAccounts.delete_)
    .mutator(
      "createBillingAccountManagerAuthorization",
      BillingAccounts.createManagerAuthorization,
    )
    .mutator(
      "deleteBillingAccountManagerAuthorization",
      BillingAccounts.deleteManagerAuthorization,
    )
    .mutator("createComment", Comments.create)
    .mutator("updateComment", Comments.update)
    .mutator("deleteComment", Comments.delete_)
    .mutator("setDeliveryOptions", Rooms.setDeliveryOptions)
    .mutator("createInvoice", Invoices.create)
    .mutator("createOrder", Orders.create)
    .mutator("updateOrder", Orders.update)
    .mutator("deleteOrder", Orders.delete_)
    .mutator("updateTenant", Tenants.update)
    .mutator("createProduct", Products.create)
    .mutator("updateProduct", Products.update)
    .mutator("deleteProduct", Products.delete_)
    .mutator("createRoom", Rooms.create)
    .mutator("updateRoom", Rooms.update)
    .mutator("deleteRoom", Rooms.delete_)
    .mutator("restoreRoom", Rooms.restore)
    .mutator("updateUserRole", Users.updateRole)
    .mutator("deleteUser", Users.delete_)
    .mutator("restoreUser", Users.restore)
    .mutator("setWorkflow", Rooms.setWorkflow)
    .build();

export type Mutators = ReturnType<typeof createMutators>;
