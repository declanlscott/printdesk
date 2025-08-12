/* eslint-disable @typescript-eslint/no-explicit-any */
import { Data, Effect, HashMap, Schema } from "effect";

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
    ): MutationDispatcher<
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
    > {
      if (!this.#isDone)
        this.#map = HashMap.set(this.#map, mutation.name, mutation);

      return this;
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
