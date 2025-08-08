import { Data, Effect, HashMap, Iterable, Schema } from "effect";

import { AccessControl } from "../access-control2";
import { ReplicacheMutationV1 } from "../replicache2/shared";

import type { Tenant } from "../tenants2/sql";
import type { User } from "../users2/sql";

// TODO: Implement real session service in another module
interface Session {
  userId: User["id"];
  tenantId: Tenant["id"];
}

export namespace DataAccess {
  export class Policy<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{ readonly name: TName; readonly Args: TArgs }> {}

  export type PolicyShape<
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = Effect.Effect<
    { readonly make: AccessControl.MakePolicy<TArgs, TError, TContext> },
    TError,
    TContext
  >;

  export const makePolicy = <
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  >(
    _policy: Policy<TName, TArgs>,
    make: PolicyShape<TArgs, TError, TContext>,
  ) => make;

  type PolicyRegister<
    TName extends string = string,
    TPolicy extends Policy = Policy,
  > = Record<TName, TPolicy>;

  type InferPolicySchema<TRegister extends PolicyRegister> = {
    [TName in keyof TRegister]: Schema.Struct<{
      name: Schema.Literal<[TName & string]>;
      args: TRegister[TName]["Args"];
    }>;
  }[keyof TRegister];

  export class PolicyClient<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRegister extends PolicyRegister = {},
  > extends Data.Class {
    #policies = HashMap.empty<string, Policy>();

    register<TName extends string, TArgs extends Schema.Schema.AnyNoContext>(
      policy: Policy<TName, TArgs>,
    ): PolicyClient<TRegister & PolicyRegister<TName, Policy<TName, TArgs>>> {
      this.#policies = HashMap.set(this.#policies, policy.name, policy);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return this as any;
    }

    dispatch<TName extends keyof TRegister & string, TError, TContext>(
      name: TName,
      args: Schema.Schema.Type<TRegister[TName]["Args"]>,
      policy: PolicyShape<TRegister[TName]["Args"], TError, TContext>,
    ) {
      return policy.pipe(
        Effect.flatMap(({ make }) => make(args)),
        Effect.withSpan("DataAccess.PolicyClient.dispatch", {
          attributes: { name },
        }),
      );
    }

    get Schema() {
      return Schema.Union(
        ...this.#policies.pipe(
          HashMap.values,
          Iterable.map(
            (policy) =>
              Schema.Struct({
                name: Schema.Literal(policy.name),
                args: policy.Args,
              }) as InferPolicySchema<TRegister>,
          ),
        ),
      );
    }
  }

  export class Mutation<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{ readonly name: TName; readonly Args: TArgs }> {}

  export type Mutator<
    TArgs extends Schema.Schema.AnyNoContext,
    TSuccess,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
    session: Session,
  ) => Effect.Effect<TSuccess, TError, TContext>;

  export type MutationShape<
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext,
  > = Effect.Effect<
    {
      readonly makePolicy: AccessControl.MakePolicy<
        TArgs,
        TPolicyError,
        TPolicyContext
      >;
      readonly mutator: Mutator<
        TArgs,
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext
      >;
    },
    TMutationError,
    TMutationContext
  >;

  export const makeMutation = <
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext,
  >(
    _mutation: Mutation<TName, TArgs>,
    make: MutationShape<
      TArgs,
      TPolicyError,
      TPolicyContext,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext,
      TMutationError,
      TMutationContext
    >,
  ) => make;

  type MutationRegister<
    TName extends string = string,
    TMutation extends Mutation = Mutation,
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
    #mutations = HashMap.empty<string, Mutation>();

    register<TName extends string, TArgs extends Schema.Schema.AnyNoContext>(
      mutation: Mutation<TName, TArgs>,
    ): MutationClient<
      TRegister & MutationRegister<TName, Mutation<TName, TArgs>>
    > {
      this.#mutations = HashMap.set(this.#mutations, mutation.name, mutation);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
      return this as any;
    }

    dispatch<
      TName extends keyof TRegister & string,
      TPolicyError,
      TPolicyContext,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext,
      TMutationError,
      TMutationContext,
    >(
      name: TName,
      args: Schema.Schema.Type<TRegister[TName]["Args"]>,
      mutation: MutationShape<
        TRegister[TName]["Args"],
        TPolicyError,
        TPolicyContext,
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext,
        TMutationError,
        TMutationContext
      >,
    ) {
      return mutation.pipe(
        Effect.flatMap(({ makePolicy, mutator }) =>
          mutator(args, this.session).pipe(
            AccessControl.enforce(makePolicy(args)),
          ),
        ),
        Effect.withSpan("DataAccess.MutationClient.dispatch", {
          attributes: { name },
        }),
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
}
