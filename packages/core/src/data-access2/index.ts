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
  > extends Data.Class<{ readonly name: TName; readonly Args: TArgs }> {}

  // TODO: Invocation

  type FunctionMap = HashMap.HashMap<Function["name"], Function>;

  type FunctionRecord<TFunction extends Function = Function> = Record<
    TFunction["name"],
    TFunction
  >;

  export type MakePolicyShape<
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMakePolicyError,
    TMakePolicyContext,
  > = Effect.Effect<
    {
      readonly make: AccessControl.MakePolicy<
        TArgs,
        TPolicyError,
        TPolicyContext
      >;
    },
    TMakePolicyError,
    TMakePolicyContext
  >;

  export const makePolicy = <
    TFunction extends Function,
    TPolicyError,
    TPolicyContext,
    TMakePolicyError,
    TMakePolicyContext,
  >(
    _policy: TFunction,
    make: MakePolicyShape<
      TFunction["Args"],
      TPolicyError,
      TPolicyContext,
      TMakePolicyError,
      TMakePolicyContext
    >,
  ) => make;

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export class Functions<TRecord extends FunctionRecord = {}, TIsDone = false> {
    #isDone = false;
    #map = HashMap.empty<Function["name"], Function>() satisfies FunctionMap;

    add<TFunction extends Function>(
      function_: TIsDone extends false ? TFunction : never,
    ) {
      if (!this.#isDone)
        this.#map = HashMap.set(this.#map, function_.name, function_);

      return this as Functions<TRecord & FunctionRecord<TFunction>, TIsDone>;
    }

    done(this: TIsDone extends false ? Functions<TRecord, TIsDone> : never) {
      this.#isDone = true;

      return this as Functions<TRecord, true>;
    }

    get $inferRecord() {
      return {} as {
        [TName in keyof TRecord]: Function<
          TName & string,
          TRecord[TName]["Args"]
        >;
      };
    }

    get map() {
      return this.#map;
    }
  }

  export class PolicyDispatcher<
    TRecord extends FunctionRecord,
  > extends Data.Class<{ map: FunctionMap }> {
    dispatch<
      TName extends keyof TRecord & string,
      TPolicyError,
      TPolicyContext,
      TMakePolicyError,
      TMakePolicyContext,
    >(
      name: TName,
      args:
        | { encoded: Schema.Schema.Encoded<TRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TRecord[TName]["Args"]> },
      makePolicy: MakePolicyShape<
        TRecord[TName]["Args"],
        TPolicyError,
        TPolicyContext,
        TMakePolicyError,
        TMakePolicyContext
      >,
    ) {
      const make = (args: Schema.Schema.Type<TRecord[TName]["Args"]>) =>
        Effect.succeed(args).pipe(
          Effect.flatMap((args) =>
            makePolicy.pipe(Effect.flatMap(({ make }) => make(args))),
          ),
        );

      if ("encoded" in args)
        return this.map.pipe(
          HashMap.get(name),
          Effect.map(({ Args }) => Args as TRecord[TName]["Args"]),
          Effect.map(
            Schema.decode<
              Schema.Schema.Type<TRecord[TName]["Args"]>,
              Schema.Schema.Encoded<TRecord[TName]["Args"]>,
              never
            >,
          ),
          Effect.flatMap((decode) => decode(args.encoded)),
          Effect.flatMap(make),
        );

      return make(args.decoded);
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

  export class MutationDispatcher<
    TRecord extends FunctionRecord,
  > extends Data.Class<{
    readonly session: Session;
    readonly map: FunctionMap;
  }> {
    dispatch<
      TName extends keyof TRecord & string,
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
        | { encoded: Schema.Schema.Encoded<TRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TRecord[TName]["Args"]> },
      mutation: MutationShape<
        TRecord[TName]["Args"],
        TPolicyError,
        TPolicyContext,
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext,
        TMutationError,
        TMutationContext
      >,
    ) {
      const mutate = (args: Schema.Schema.Type<TRecord[TName]["Args"]>) =>
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
        return this.map.pipe(
          HashMap.get(name),
          Effect.map(({ Args }) => Args as TRecord[TName]["Args"]),
          Effect.map(
            Schema.decode<
              Schema.Schema.Type<TRecord[TName]["Args"]>,
              Schema.Schema.Encoded<TRecord[TName]["Args"]>,
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
