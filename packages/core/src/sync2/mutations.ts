import { Data, Effect, HashMap, Iterable, Schema } from "effect";

import { AccessControl } from "../access-control2";
import { Announcements } from "../announcements2";
import { BillingAccounts } from "../billing-accounts2";
import { Comments } from "../comments2";
import { Invoices } from "../invoices2";
import { Orders } from "../orders2";
import { Products } from "../products2";
import { ReplicacheMutationV1 } from "../replicache2/shared";
import { Rooms } from "../rooms2";
import { Tenants } from "../tenants2";
import { Users } from "../users2";

import type { Sync } from ".";
import type { Session } from "./shared";

type MutationRegister<
  TName extends string = string,
  TMutation extends Sync.Mutation = Sync.Mutation,
> = Record<TName, TMutation>;

type InferMutationSchema<TRegister extends MutationRegister> = {
  [TName in keyof TRegister]: Schema.Struct<{
    name: Schema.Literal<[TName & string]>;
    args: TRegister[TName]["Args"];
  }>;
}[keyof TRegister];

export class MutationClient<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TRegister extends MutationRegister = {},
> extends Data.Class<{ readonly session: Session }> {
  #mutations = HashMap.empty<string, Sync.Mutation>();

  register<
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
  >(
    mutation: Sync.Mutation<
      TName,
      TArgs,
      TPolicyError,
      TPolicyContext,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext
    >,
  ) {
    this.#mutations = HashMap.set(this.#mutations, mutation.name, mutation);

    return this as unknown as MutationClient<
      TRegister &
        MutationRegister<
          TName,
          Sync.Mutation<
            TName,
            TArgs,
            TPolicyError,
            TPolicyContext,
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext
          >
        >
    >;
  }

  dispatch<TName extends keyof TRegister & string>(
    name: TName,
    args: Schema.Schema.Type<TRegister[TName]["Args"]>,
  ) {
    const mutations = this.#mutations;
    const session = this.session;

    return Effect.gen(function* () {
      const mutation = (yield* HashMap.get(mutations, name)) as Sync.Mutation<
        TName,
        TRegister[TName]["Args"],
        Effect.Effect.Error<ReturnType<TRegister[TName]["makePolicy"]>>,
        Effect.Effect.Context<ReturnType<TRegister[TName]["makePolicy"]>>,
        Effect.Effect.Success<ReturnType<TRegister[TName]["mutator"]>>,
        Effect.Effect.Error<ReturnType<TRegister[TName]["mutator"]>>,
        Effect.Effect.Context<ReturnType<TRegister[TName]["mutator"]>>
      >;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return yield* mutation
        .mutator(args, session)
        .pipe(AccessControl.enforce(mutation.makePolicy(args)));
    }).pipe(
      Effect.withSpan("MutationClient.dispatch", { attributes: { name } }),
    );
  }

  get ReplicacheSchema() {
    return Schema.Union(
      ...this.#mutations.pipe(
        HashMap.values,
        Iterable.map((mutation) =>
          Schema.extend(
            ReplicacheMutationV1.omit("name", "args"),
            Schema.Struct({
              name: Schema.Literal(mutation.name),
              args: mutation.Args,
            }) as InferMutationSchema<TRegister>,
          ),
        ),
      ),
    );
  }
}

export class Mutations extends Effect.Service<Mutations>()(
  "@printdesk/core/sync/Mutations",
  {
    accessors: true,
    dependencies: [
      Announcements.SyncMutations.Default,
      BillingAccounts.SyncMutations.Default,
      BillingAccounts.ManagerAuthorizationsSyncMutations.Default,
      Comments.SyncMutations.Default,
      Rooms.DeliveryOptionsSyncMutations.Default,
      Invoices.SyncMutations.Default,
      Orders.SyncMutations.Default,
      Products.SyncMutations.Default,
      Rooms.SyncMutations.Default,
      Tenants.SyncMutations.Default,
      Users.SyncMutations.Default,
      Rooms.WorkflowSyncMutations.Default,
    ],
    effect: Effect.gen(function* () {
      const announcements = yield* Announcements.SyncMutations;
      const billingAccounts = yield* BillingAccounts.SyncMutations;
      const billingAccountManagerAuthorizations =
        yield* BillingAccounts.ManagerAuthorizationsSyncMutations;
      const comments = yield* Comments.SyncMutations;
      const deliveryOptions = yield* Rooms.DeliveryOptionsSyncMutations;
      const invoices = yield* Invoices.SyncMutations;
      const orders = yield* Orders.SyncMutations;
      const products = yield* Products.SyncMutations;
      const rooms = yield* Rooms.SyncMutations;
      const tenants = yield* Tenants.SyncMutations;
      const users = yield* Users.SyncMutations;
      const workflow = yield* Rooms.WorkflowSyncMutations;

      const session = yield* Effect.succeed({
        userId: "TODO",
        tenantId: "TODO",
      } satisfies Session);

      const client = new MutationClient({ session })
        .register(announcements.create)
        .register(announcements.update)
        .register(announcements.delete)
        .register(billingAccounts.update)
        .register(billingAccounts.delete)
        .register(billingAccountManagerAuthorizations.create)
        .register(billingAccountManagerAuthorizations.delete)
        .register(comments.create)
        .register(comments.update)
        .register(comments.delete)
        .register(deliveryOptions.set)
        .register(invoices.create)
        .register(orders.create)
        .register(orders.edit)
        .register(orders.approve)
        .register(orders.transition)
        .register(orders.delete)
        .register(products.create)
        .register(products.update)
        .register(products.delete)
        .register(rooms.create)
        .register(rooms.update)
        .register(rooms.delete)
        .register(rooms.restore)
        .register(tenants.update)
        .register(users.update)
        .register(users.delete)
        .register(users.restore)
        .register(workflow.set);

      return { client } as const;
    }),
  },
) {}
