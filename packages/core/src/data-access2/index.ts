import { Data, Effect, HashMap, Schema } from "effect";

import { AccessControl } from "../access-control2";

import type { ParseResult } from "effect";
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
    TReturns extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{
    readonly name: TName;
    readonly Args: TArgs;
    readonly Returns: TReturns;
  }> {}

  // TODO: Invocation

  type FunctionMap = HashMap.HashMap<Function["name"], Function>;

  type FunctionRecord<TFunction extends Function = Function> = Record<
    TFunction["name"],
    TFunction
  >;

  export type MakePolicyShape<
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TPolicyError,
    TPolicyContext,
    TMakePolicyError,
    TMakePolicyContext,
  > = Effect.Effect<
    {
      readonly name: TName;
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
    fn: TFunction,
    make: Effect.Effect<
      Omit<
        Effect.Effect.Success<
          MakePolicyShape<
            TFunction["name"],
            TFunction["Args"],
            TPolicyError,
            TPolicyContext,
            TMakePolicyError,
            TMakePolicyContext
          >
        >,
        "name"
      >,
      TMakePolicyError,
      TMakePolicyContext
    >,
  ): MakePolicyShape<
    TFunction["name"],
    TFunction["Args"],
    TPolicyError,
    TPolicyContext,
    TMakePolicyError,
    TMakePolicyContext
  > => make.pipe(Effect.map((rest) => ({ name: fn.name, ...rest })));

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export class Functions<TRecord extends FunctionRecord = {}, TIsDone = false> {
    #isDone = false;
    #map = HashMap.empty<Function["name"], Function>() satisfies FunctionMap;

    readonly RecordType = {} as {
      [TName in keyof TRecord]: Function<
        TName & string,
        TRecord[TName]["Args"]
      >;
    };

    add<TFunction extends Function>(
      fn: TIsDone extends false ? TFunction : never,
    ): Functions<TRecord & FunctionRecord<TFunction>, TIsDone> {
      if (!this.#isDone) this.#map = HashMap.set(this.#map, fn.name, fn);

      return this;
    }

    done(
      this: TIsDone extends false ? Functions<TRecord, TIsDone> : never,
    ): Functions<TRecord, true> {
      this.#isDone = true;

      return this;
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
      makePolicy: MakePolicyShape<
        TName,
        TRecord[TName]["Args"],
        TPolicyError,
        TPolicyContext,
        TMakePolicyError,
        TMakePolicyContext
      >,
      args:
        | { encoded: Schema.Schema.Encoded<TRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TRecord[TName]["Args"]> },
    ): AccessControl.Policy<
      TPolicyError | TMakePolicyError | ParseResult.ParseError,
      TPolicyContext | TMakePolicyContext
    > {
      const map = this.map;

      return Effect.gen(function* () {
        const { name, make } = yield* makePolicy;

        const { Args } = yield* map.pipe(HashMap.get(name), Effect.orDie);

        const decodedArgs = yield* "encoded" in args
          ? Effect.succeed(args.encoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TRecord[TName]["Args"]>,
                  Schema.Schema.Encoded<TRecord[TName]["Args"]>,
                  never
                >(Args as TRecord[TName]["Args"]),
              ),
            )
          : Effect.succeed(args.decoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TRecord[TName]["Args"]>,
                  Schema.Schema.Type<TRecord[TName]["Args"]>,
                  never
                >(Schema.typeSchema(Args)),
              ),
            );

        return yield* make(decodedArgs);
      });
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
    TName extends string,
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
      readonly name: TName;
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
    TMutatorSuccess extends Schema.Schema.Type<TFunction["Returns"]>,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext,
  >(
    fn: TFunction,
    make: Effect.Effect<
      Omit<
        Effect.Effect.Success<
          MutationShape<
            TFunction["name"],
            TFunction["Args"],
            TPolicyError,
            TPolicyContext,
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TMutationError,
            TMutationContext
          >
        >,
        "name"
      >,
      TMutationError,
      TMutationContext
    >,
  ): MutationShape<
    TFunction["name"],
    TFunction["Args"],
    TPolicyError,
    TPolicyContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TMutationError,
    TMutationContext
  > => make.pipe(Effect.map((rest) => ({ name: fn.name, ...rest })));

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
      TMutatorSuccess extends Schema.Schema.Type<TRecord[TName]["Returns"]>,
      TMutatorError,
      TMutatorContext,
      TMutationError,
      TMutationContext,
    >(
      mutation: MutationShape<
        TName,
        TRecord[TName]["Args"],
        TPolicyError,
        TPolicyContext,
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext,
        TMutationError,
        TMutationContext
      >,
      args:
        | { encoded: Schema.Schema.Encoded<TRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TRecord[TName]["Args"]> },
    ): Effect.Effect<
      TMutatorSuccess,
      | TPolicyError
      | TMutatorError
      | TMutationError
      | ParseResult.ParseError
      | AccessControl.AccessDeniedError,
      | TPolicyContext
      | TMutatorContext
      | TMutationContext
      | AccessControl.Principal
    > {
      const map = this.map;
      const session = this.session;

      return Effect.gen(function* () {
        const { name, mutator, makePolicy } = yield* mutation;

        const { Args, Returns } = yield* map.pipe(
          HashMap.get(name),
          Effect.orDie,
        );

        const decodedArgs = yield* "encoded" in args
          ? Effect.succeed(args.encoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TRecord[TName]["Args"]>,
                  Schema.Schema.Encoded<TRecord[TName]["Args"]>,
                  never
                >(Args as TRecord[TName]["Args"]),
              ),
            )
          : Effect.succeed(args.decoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TRecord[TName]["Args"]>,
                  Schema.Schema.Type<TRecord[TName]["Args"]>,
                  never
                >(Schema.typeSchema(Args)),
              ),
            );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return yield* mutator(decodedArgs, session).pipe(
          AccessControl.enforce(makePolicy(decodedArgs)),
          Effect.flatMap(
            Schema.decode<
              Schema.Schema.Type<TRecord[TName]["Returns"]>,
              Schema.Schema.Type<TRecord[TName]["Returns"]>,
              never
            >(Schema.typeSchema(Returns)),
          ),
        );
      });
    }
  }
}
