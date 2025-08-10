import { Effect, HashMap, Iterable, Schema } from "effect";

import { DataAccess } from ".";
import { AccessControl } from "../access-control2";
import { AnnouncementsContract } from "../announcements2/contract";
import { Auth } from "../auth2";
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

export namespace DataAccessFunctions {
  export class Policies extends Effect.Service<Policies>()(
    "@printdesk/core/data-access/Policies",
    {
      accessors: true,
      succeed: {
        functions: new DataAccess.Functions()
          .add(BillingAccountsContract.hasActiveManagerAuthorization)
          .add(BillingAccountsContract.hasActiveCustomerAuthorization)
          .add(BillingAccountsContract.hasActiveAuthorization)
          .add(CommentsContract.isAuthor)
          .add(OrdersContract.isCustomer)
          .add(OrdersContract.isManager)
          .add(OrdersContract.isCustomerOrManager)
          .add(OrdersContract.hasActiveManagerAuthorization)
          .add(OrdersContract.canEdit)
          .add(OrdersContract.canApprove)
          .add(OrdersContract.canTransition)
          .add(OrdersContract.canDelete)
          .add(TenantsContract.isSubdomainAvailable)
          .add(LicensesContract.isAvailable)
          .add(UsersContract.isSelf)
          .done(),
      },
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/data-access/Mutations",
    {
      effect: Effect.gen(function* () {
        const session = yield* Auth.Session;

        const functions = Effect.succeed(
          new DataAccess.Functions()
            .add(AnnouncementsContract.create)
            .add(AnnouncementsContract.update)
            .add(AnnouncementsContract.delete_)
            .add(BillingAccountsContract.update)
            .add(BillingAccountsContract.delete_)
            .add(BillingAccountManagerAuthorizationsContract.create)
            .add(BillingAccountManagerAuthorizationsContract.delete_)
            .add(CommentsContract.create)
            .add(CommentsContract.update)
            .add(CommentsContract.delete_)
            .add(DeliveryOptionsContract.set)
            .add(InvoicesContract.create)
            .add(OrdersContract.create)
            .add(OrdersContract.edit)
            .add(OrdersContract.approve)
            .add(OrdersContract.transition)
            .add(OrdersContract.delete_)
            .add(ProductsContract.create)
            .add(ProductsContract.update)
            .add(ProductsContract.delete_)
            .add(RoomsContract.create)
            .add(RoomsContract.update)
            .add(RoomsContract.delete_)
            .add(RoomsContract.restore)
            .add(TenantsContract.update)
            .add(UsersContract.update)
            .add(UsersContract.delete_)
            .add(UsersContract.restore)
            .add(WorkflowsContract.set)
            .done(),
        );
        type MutationRecord = Effect.Effect.Success<
          typeof functions
        >["RecordType"];

        const dispatch = <
          TName extends keyof MutationRecord,
          TPolicyError,
          TPolicyContext,
          TMutatorSuccess extends Schema.Schema.Type<
            MutationRecord[TName]["Returns"]
          >,
          TMutatorError,
          TMutatorContext,
          TMutationError,
          TMutationContext,
        >(
          mutation: DataAccess.MutationShape<
            TName,
            MutationRecord[TName]["Args"],
            TPolicyError,
            TPolicyContext,
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TMutationError,
            TMutationContext
          >,
          args:
            | { encoded: Schema.Schema.Encoded<MutationRecord[TName]["Args"]> }
            | { decoded: Schema.Schema.Type<MutationRecord[TName]["Args"]> },
        ) =>
          Effect.gen(function* () {
            const { map } = yield* functions;

            const { name, mutator, makePolicy } = yield* mutation;

            const { Args, Returns } = yield* map.pipe(
              HashMap.get(name),
              Effect.orDie,
            );

            const decodedArgs = yield* "encoded" in args
              ? Effect.succeed(args.encoded).pipe(
                  Effect.flatMap(
                    Schema.decode<
                      Schema.Schema.Type<MutationRecord[TName]["Args"]>,
                      Schema.Schema.Encoded<MutationRecord[TName]["Args"]>,
                      never
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    >(Args),
                  ),
                )
              : Effect.succeed(args.decoded).pipe(
                  Effect.flatMap(
                    Schema.decode<
                      Schema.Schema.Type<MutationRecord[TName]["Args"]>,
                      Schema.Schema.Type<MutationRecord[TName]["Args"]>,
                      never
                    >(Schema.typeSchema(Args)),
                  ),
                );

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return yield* mutator(decodedArgs, session).pipe(
              AccessControl.enforce(makePolicy(decodedArgs)),
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<MutationRecord[TName]["Returns"]>,
                  Schema.Schema.Type<MutationRecord[TName]["Returns"]>,
                  never
                >(Schema.typeSchema(Returns)),
              ),
            );
          });

        const ReplicacheSchema = functions.pipe(
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
        );

        return { functions, dispatch, ReplicacheSchema };
      }),
    },
  ) {}
}
