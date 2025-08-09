/* eslint-disable @typescript-eslint/no-empty-object-type */
import { Data, Effect, HashMap, Schema } from "effect";

import { AccessControl } from "../access-control2";

import type { Tenant } from "../tenants2/sql";
import type { User } from "../users2/sql";

// TODO: Implement real session service in another module
interface Session {
  userId: User["id"];
  tenantId: Tenant["id"];
}

export namespace DataAccess {
  export class Function<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{
    readonly name: TName;
    readonly Args: TArgs;
  }> {}

  export type MakePolicyShape<
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = Effect.Effect<
    { readonly make: AccessControl.MakePolicy<TArgs, TError, TContext> },
    TError,
    TContext
  >;

  export const makePolicy = <TFunction extends Function, TError, TContext>(
    _policy: TFunction,
    make: MakePolicyShape<TFunction["Args"], TError, TContext>,
  ) => make;

  type FunctionRegister<TFunction extends Function = Function> = Record<
    TFunction["name"],
    TFunction
  >;

  export class PolicyRegistry<TRegister extends FunctionRegister = {}> {
    #policies = HashMap.empty<Function["name"], Function>();

    register<TFunction extends Function>(
      policy: TFunction,
    ): PolicyRegistry<TRegister & FunctionRegister<TFunction>> {
      this.#policies = HashMap.set(this.#policies, policy.name, policy);

      return this;
    }

    dispatch<TName extends keyof TRegister & string, TError, TContext>(
      name: TName,
      args: Schema.Schema.Type<TRegister[TName]["Args"]>,
      makePolicy: MakePolicyShape<TRegister[TName]["Args"], TError, TContext>,
    ) {
      return makePolicy.pipe(
        Effect.flatMap(({ make }) => make(args)),
        Effect.withSpan("DataAccess.PolicyRegistry.dispatch", {
          attributes: { name },
        }),
      );
    }
  }

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
    TFunction extends Function,
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext,
  >(
    _mutation: TFunction,
    make: MutationShape<
      TFunction["Args"],
      TPolicyError,
      TPolicyContext,
      TMutatorSuccess,
      TMutatorError,
      TMutatorContext,
      TMutationError,
      TMutationContext
    >,
  ) => make;

  export class MutationRegistry<
    TRegister extends FunctionRegister = {},
  > extends Data.Class<{ readonly session: Session }> {
    #mutations = HashMap.empty<Function["name"], Function>();

    register<TFunction extends Function>(
      mutation: TFunction,
    ): MutationRegistry<TRegister & FunctionRegister<TFunction>> {
      this.#mutations = HashMap.set(this.#mutations, mutation.name, mutation);

      return this;
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
      args:
        | { encoded: Schema.Schema.Encoded<TRegister[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TRegister[TName]["Args"]> },
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
      const mutate = (args: Schema.Schema.Type<TRegister[TName]["Args"]>) =>
        Effect.succeed(args).pipe(
          Effect.flatMap((args) =>
            mutation.pipe(
              Effect.flatMap(({ mutator, makePolicy }) =>
                mutator(args, this.session).pipe(
                  AccessControl.enforce(makePolicy(args)),
                ),
              ),
            ),
          ),
        );

      if ("encoded" in args)
        return this.#mutations.pipe(
          HashMap.get(name),
          Effect.map(({ Args }) => Args as TRegister[TName]["Args"]),
          Effect.map(
            Schema.decode<
              Schema.Schema.Type<TRegister[TName]["Args"]>,
              Schema.Schema.Encoded<TRegister[TName]["Args"]>,
              never
            >,
          ),
          Effect.flatMap((decode) => decode(args.encoded)),
          Effect.flatMap(mutate),
        );

      return mutate(args.decoded);
    }
  }
}
