/* eslint-disable @typescript-eslint/no-explicit-any */
import { Data, Effect, HashMap, Iterable, Schema } from "effect";

import { AccessControl } from "../access-control2";

import type { AuthContract } from "../auth2/contract";

export namespace DataAccessContract {
  export class Function<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
    TReturns extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{
    readonly name: TName;
    readonly Args: TArgs;
    readonly Returns: TReturns;
  }> {
    makeInvocation = (args: Schema.Schema.Type<TArgs>) => ({
      name: this.name,
      args,
    });
  }

  type FunctionRecord<TFunction extends Function = Function> = Record<
    TFunction["name"],
    TFunction
  >;

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export class Functions<TRecord extends FunctionRecord = {}, TIsDone = false> {
    #isDone = false;
    #map = HashMap.empty<Function["name"], Function>();

    readonly RecordType = {} as {
      [TName in keyof TRecord]: Function<
        TName & string,
        TRecord[TName]["Args"]
      >;
    };

    set<TFunction extends Function>(
      fn: TIsDone extends false ? TFunction : never,
    ) {
      if (!this.#isDone) this.#map = HashMap.set(this.#map, fn.name, fn);

      return this as Functions<TRecord & FunctionRecord<TFunction>, TIsDone>;
    }

    done(this: TIsDone extends false ? Functions<TRecord, TIsDone> : never) {
      this.#isDone = true;

      return this as Functions<TRecord, true>;
    }

    get map() {
      return this.#map;
    }

    get Invocation() {
      return Schema.Union(
        ...this.#map.pipe(
          HashMap.values,
          Iterable.map(
            (fn) =>
              Schema.Struct({
                name: Schema.tag(fn.name),
                args: fn.Args,
              }) as {
                [TName in keyof TRecord]: Schema.Struct<{
                  name: Schema.tag<TName & string>;
                  args: TRecord[TName]["Args"];
                }>;
              }[keyof TRecord],
          ),
        ),
      );
    }
  }

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
  > & { readonly name: TName };

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
  > =>
    Object.assign(
      make.pipe(Effect.map((rest) => ({ name: fn.name, ...rest }))),
      { name: fn.name },
    );

  type PolicyRecord<
    TName extends string = string,
    TPolicyError = any,
    TPolicyContext = any,
    TMakePolicyError = any,
    TMakePolicyContext = any,
  > = Record<
    TName,
    {
      readonly PolicyError: TPolicyError;
      readonly PolicyContext: TPolicyContext;
      readonly MakePolicyError: TMakePolicyError;
      readonly MakePolicyContext: TMakePolicyContext;
    }
  >;

  export class PolicyDispatcher<
    TFunctionRecord extends FunctionRecord,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TPolicyRecord extends PolicyRecord = {},
    TIsDone = false,
  > extends Data.Class<{
    readonly functions: Functions<TFunctionRecord, true>;
  }> {
    #isDone = false;
    #map = HashMap.empty<
      keyof TFunctionRecord,
      MakePolicyShape<
        keyof TFunctionRecord & string,
        TFunctionRecord[keyof TFunctionRecord]["Args"],
        TPolicyRecord[keyof TPolicyRecord]["PolicyError"],
        TPolicyRecord[keyof TPolicyRecord]["PolicyContext"],
        TPolicyRecord[keyof TPolicyRecord]["MakePolicyError"],
        TPolicyRecord[keyof TPolicyRecord]["MakePolicyContext"]
      >
    >();

    set<
      TName extends keyof TFunctionRecord & string,
      TPolicyError,
      TPolicyContext,
      TMakePolicyError,
      TMakePolicyContext,
    >(
      makePolicy: TIsDone extends false
        ? MakePolicyShape<
            TName,
            TFunctionRecord[TName]["Args"],
            TPolicyError,
            TPolicyContext,
            TMakePolicyError,
            TMakePolicyContext
          >
        : never,
    ): PolicyDispatcher<
      TFunctionRecord,
      TPolicyRecord &
        PolicyRecord<
          TName,
          TPolicyError,
          TPolicyContext,
          TMakePolicyError,
          TMakePolicyContext
        >,
      TIsDone
    > {
      if (!this.#isDone)
        this.#map = HashMap.set(this.#map, makePolicy.name, makePolicy);

      return this;
    }

    done(
      this: keyof TFunctionRecord extends keyof TPolicyRecord
        ? PolicyDispatcher<TFunctionRecord, TPolicyRecord, TIsDone>
        : never,
    ) {
      this.#isDone = true;

      return this as PolicyDispatcher<TFunctionRecord, TPolicyRecord, true>;
    }

    dispatch<TName extends keyof TPolicyRecord & string>(
      name: TName,
      args:
        | { encoded: Schema.Schema.Encoded<TFunctionRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TFunctionRecord[TName]["Args"]> },
    ) {
      const functions = this.functions;
      const map = this.#map;

      return Effect.gen(function* () {
        const makePolicy = (yield* map.pipe(
          HashMap.get(name),
          Effect.orDie,
        )) as MakePolicyShape<
          TName,
          TFunctionRecord[TName]["Args"],
          TPolicyRecord[TName]["PolicyError"],
          TPolicyRecord[TName]["PolicyContext"],
          TPolicyRecord[TName]["MakePolicyError"],
          TPolicyRecord[TName]["MakePolicyContext"]
        >;

        const { make } = yield* makePolicy;

        const { Args } = yield* functions.map.pipe(
          HashMap.get(makePolicy.name),
          Effect.orDie,
        );

        const decodedArgs = yield* "encoded" in args
          ? Effect.succeed(args.encoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TFunctionRecord[TName]["Args"]>,
                  Schema.Schema.Encoded<TFunctionRecord[TName]["Args"]>,
                  never
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                >(Args),
              ),
            )
          : Effect.succeed(args.decoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TFunctionRecord[TName]["Args"]>,
                  Schema.Schema.Type<TFunctionRecord[TName]["Args"]>,
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
    session: AuthContract.Session,
  ) => Effect.Effect<TSuccess, TError, TContext>;

  export type MutationShape<
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TPolicyError,
    TPolicyContext,
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
  > & { readonly name: TName };

  export const makeMutation = <
    TFunction extends Function,
    TMutatorSuccess extends Schema.Schema.Type<TFunction["Returns"]>,
    TMutatorError,
    TMutatorContext,
    TPolicyError,
    TPolicyContext,
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
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TPolicyError,
            TPolicyContext,
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
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TPolicyError,
    TPolicyContext,
    TMutationError,
    TMutationContext
  > =>
    Object.assign(
      make.pipe(Effect.map((rest) => ({ name: fn.name, ...rest }))),
      { name: fn.name },
    );

  type MutationRecord<
    TName extends string = string,
    TMutatorSuccess = any,
    TMutatorError = any,
    TMutatorContext = any,
    TPolicyError = any,
    TPolicyContext = any,
    TMutationError = any,
    TMutationContext = any,
  > = Record<
    TName,
    {
      readonly MutatorSuccess: TMutatorSuccess;
      readonly MutatorError: TMutatorError;
      readonly MutatorContext: TMutatorContext;
      readonly PolicyError: TPolicyError;
      readonly PolicyContext: TPolicyContext;
      readonly MutationError: TMutationError;
      readonly MutationContext: TMutationContext;
    }
  >;

  export class MutationDispatcher<
    TFunctionRecord extends FunctionRecord,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TMutationRecord extends MutationRecord = {},
    TIsDone = false,
  > extends Data.Class<{
    readonly session: AuthContract.Session;
    readonly functions: Functions<TFunctionRecord, true>;
  }> {
    #isDone = false;
    #map = HashMap.empty<
      keyof TFunctionRecord,
      MutationShape<
        keyof TFunctionRecord & string,
        TFunctionRecord[keyof TFunctionRecord]["Args"],
        TFunctionRecord[keyof TFunctionRecord]["Returns"]["Type"],
        TMutationRecord[keyof TMutationRecord]["MutatorError"],
        TMutationRecord[keyof TMutationRecord]["MutatorContext"],
        TMutationRecord[keyof TMutationRecord]["PolicyError"],
        TMutationRecord[keyof TMutationRecord]["PolicyContext"],
        TMutationRecord[keyof TMutationRecord]["MutationError"],
        TMutationRecord[keyof TMutationRecord]["MutationContext"]
      >
    >();

    set<
      TName extends keyof TFunctionRecord & string,
      TMutatorSuccess extends Schema.Schema.Type<
        TFunctionRecord[TName]["Returns"]
      >,
      TMutatorError,
      TMutatorContext,
      TPolicyError,
      TPolicyContext,
      TMutationError,
      TMutationContext,
    >(
      mutation: TIsDone extends false
        ? MutationShape<
            TName,
            TFunctionRecord[TName]["Args"],
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TPolicyError,
            TPolicyContext,
            TMutationError,
            TMutationContext
          >
        : never,
    ) {
      if (!this.#isDone)
        this.#map = HashMap.set(this.#map, mutation.name, mutation);

      return this as MutationDispatcher<
        TFunctionRecord,
        TMutationRecord &
          MutationRecord<
            TName,
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TPolicyError,
            TPolicyContext,
            TMutationError,
            TMutationContext
          >,
        TIsDone
      >;
    }

    done(
      this: keyof TFunctionRecord extends keyof TMutationRecord
        ? MutationDispatcher<TFunctionRecord, TMutationRecord, TIsDone>
        : never,
    ) {
      this.#isDone = true;

      return this as MutationDispatcher<TFunctionRecord, TMutationRecord, true>;
    }

    dispatch<TName extends keyof TMutationRecord & string>(
      name: TName,
      args:
        | { encoded: Schema.Schema.Encoded<TFunctionRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TFunctionRecord[TName]["Args"]> },
    ) {
      const session = this.session;
      const functions = this.functions;
      const map = this.#map;

      return Effect.gen(function* () {
        const mutation = (yield* map.pipe(
          HashMap.get(name),
          Effect.orDie,
        )) as MutationShape<
          TName,
          TFunctionRecord[TName]["Args"],
          TMutationRecord[TName]["MutatorSuccess"],
          TMutationRecord[TName]["MutatorError"],
          TMutationRecord[TName]["MutatorContext"],
          TMutationRecord[TName]["PolicyError"],
          TMutationRecord[TName]["PolicyContext"],
          TMutationRecord[TName]["MutationError"],
          TMutationRecord[TName]["MutationContext"]
        >;

        const { mutator, makePolicy } = yield* mutation;

        const { Args, Returns } = yield* functions.map.pipe(
          HashMap.get(mutation.name),
          Effect.orDie,
        );

        const decodedArgs = yield* "encoded" in args
          ? Effect.succeed(args.encoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TFunctionRecord[TName]["Args"]>,
                  Schema.Schema.Encoded<TFunctionRecord[TName]["Args"]>,
                  never
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                >(Args),
              ),
            )
          : Effect.succeed(args.decoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TFunctionRecord[TName]["Args"]>,
                  Schema.Schema.Type<TFunctionRecord[TName]["Args"]>,
                  never
                >(Schema.typeSchema(Args)),
              ),
            );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return yield* mutator(decodedArgs, session).pipe(
          AccessControl.enforce(makePolicy(decodedArgs)),
          Effect.flatMap(
            Schema.decode<
              Schema.Schema.Type<TFunctionRecord[TName]["Returns"]>,
              Schema.Schema.Type<TFunctionRecord[TName]["Returns"]>,
              never
            >(Schema.typeSchema(Returns)),
          ),
        );
      });
    }
  }
}
