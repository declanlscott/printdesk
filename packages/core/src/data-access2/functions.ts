import { Effect, HashMap, Iterable, Schema } from "effect";

import { AnnouncementsContract } from "../announcements2/contract";
import {
  BillingAccountManagerAuthorizationsContract,
  BillingAccountsContract,
} from "../billing-accounts2/contracts";
import { CommentsContract } from "../comments2/contract";
import { InvoicesContract } from "../invoices2/contract";
import { OrdersContract } from "../orders2/contract";
import { ProductsContract } from "../products2/contract";
import { ReplicacheContract } from "../replicache2/contracts";
import {
  DeliveryOptionsContract,
  RoomsContract,
  WorkflowsContract,
} from "../rooms2/contracts";
import { LicensesContract, TenantsContract } from "../tenants2/contracts";
import { UsersContract } from "../users2/contract";
import { DataAccessContract } from "./contract";

export class Policies extends Effect.Service<Policies>()(
  "@printdesk/core/data-access/Policies",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const functions = yield* Effect.succeed(
        new DataAccessContract.Functions()
          .set(BillingAccountsContract.hasActiveManagerAuthorization)
          .set(BillingAccountsContract.hasActiveCustomerAuthorization)
          .set(BillingAccountsContract.hasActiveAuthorization)
          .set(CommentsContract.isAuthor)
          .set(OrdersContract.isCustomer)
          .set(OrdersContract.isManager)
          .set(OrdersContract.isCustomerOrManager)
          .set(OrdersContract.hasActiveManagerAuthorization)
          .set(OrdersContract.canEdit)
          .set(OrdersContract.canApprove)
          .set(OrdersContract.canTransition)
          .set(OrdersContract.canDelete)
          .set(TenantsContract.isSubdomainAvailable)
          .set(LicensesContract.isAvailable)
          .set(UsersContract.isSelf)
          .done(),
      ).pipe(Effect.cached);
      type PolicyRecord = Effect.Effect.Success<typeof functions>["RecordType"];

      const InvocationSchema = yield* functions.pipe(
        Effect.map(({ map }) => map),
        Effect.map(HashMap.values),
        Effect.map(
          Iterable.map(
            (fn) =>
              Schema.Struct({
                name: Schema.Literal(fn.name),
                args: fn.Args,
              }) as {
                [TName in keyof PolicyRecord]: Schema.Struct<{
                  name: Schema.Literal<[TName]>;
                  args: PolicyRecord[TName]["Args"];
                }>;
              }[keyof PolicyRecord],
          ),
        ),
        Effect.map((members) => Schema.Union(...members)),
        Effect.cached,
      );

      return { functions, InvocationSchema } as const;
    }),
  },
) {}

export class Mutations extends Effect.Service<Mutations>()(
  "@printdesk/core/data-access/Mutations",
  {
    accessors: true,
    effect: Effect.gen(function* () {
      const functions = yield* Effect.succeed(
        new DataAccessContract.Functions()
          .set(AnnouncementsContract.create)
          .set(AnnouncementsContract.update)
          .set(AnnouncementsContract.delete_)
          .set(BillingAccountsContract.update)
          .set(BillingAccountsContract.delete_)
          .set(BillingAccountManagerAuthorizationsContract.create)
          .set(BillingAccountManagerAuthorizationsContract.delete_)
          .set(CommentsContract.create)
          .set(CommentsContract.update)
          .set(CommentsContract.delete_)
          .set(DeliveryOptionsContract.set)
          .set(InvoicesContract.create)
          .set(OrdersContract.create)
          .set(OrdersContract.edit)
          .set(OrdersContract.approve)
          .set(OrdersContract.transition)
          .set(OrdersContract.delete_)
          .set(ProductsContract.create)
          .set(ProductsContract.update)
          .set(ProductsContract.delete_)
          .set(RoomsContract.create)
          .set(RoomsContract.update)
          .set(RoomsContract.delete_)
          .set(RoomsContract.restore)
          .set(TenantsContract.update)
          .set(UsersContract.update)
          .set(UsersContract.delete_)
          .set(UsersContract.restore)
          .set(WorkflowsContract.set)
          .done(),
      ).pipe(Effect.cached);
      type MutationRecord = Effect.Effect.Success<
        typeof functions
      >["RecordType"];

      const ReplicacheSchema = yield* functions.pipe(
        Effect.map(({ map }) => map),
        Effect.map(HashMap.values),
        Effect.map(
          Iterable.map((fn) =>
            Schema.extend(
              ReplicacheContract.MutationV1.omit("name", "args"),
              Schema.Struct({
                name: Schema.Literal(fn.name),
                args: fn.Args,
              }) as {
                [TName in keyof MutationRecord]: Schema.Struct<{
                  name: Schema.Literal<[TName]>;
                  args: MutationRecord[TName]["Args"];
                }>;
              }[keyof MutationRecord],
            ),
          ),
        ),
        Effect.map((members) => Schema.Union(...members)),
        Effect.cached,
      );

      return { functions, ReplicacheSchema };
    }),
  },
) {}
