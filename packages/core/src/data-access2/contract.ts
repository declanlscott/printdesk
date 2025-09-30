/* eslint-disable @typescript-eslint/no-explicit-any */
import { Data, Effect, HashMap, Iterable, Schema } from "effect";

import { AccessControl } from "../access-control2";

import type { AuthContract } from "../auth2/contract";

export namespace DataAccessContract {
  export class Procedure<
    TName extends string = string,
    TArgs extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
    TReturns extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  > extends Data.Class<{
    readonly name: TName;
    readonly Args: TArgs;
    readonly Returns: TReturns;
  }> {
    make = (args: Schema.Schema.Type<TArgs>) => ({
      name: this.name,
      args,
    });
  }

  type ProcedureRecord<TProcedure extends Procedure = Procedure> = Record<
    TProcedure["name"],
    TProcedure
  >;

  export class Procedures<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRecord extends ProcedureRecord = {},
    TIsDone = false,
  > {
    #isDone = false;
    #map = HashMap.empty<Procedure["name"], Procedure>();

    readonly RecordType = {} as {
      [TName in keyof TRecord]: Procedure<
        TName & string,
        TRecord[TName]["Args"]
      >;
    };

    set<TProcedure extends Procedure>(
      fn: TIsDone extends false ? TProcedure : never,
    ) {
      if (!this.#isDone) this.#map = HashMap.set(this.#map, fn.name, fn);

      return this as Procedures<TRecord & ProcedureRecord<TProcedure>, TIsDone>;
    }

    done(this: TIsDone extends false ? Procedures<TRecord, TIsDone> : never) {
      this.#isDone = true;

      return this as Procedures<TRecord, true>;
    }

    get map() {
      return this.#map;
    }

    get Procedure() {
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

  export type Policy<
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = {
    readonly name: TName;
    readonly make: AccessControl.MakePolicy<TArgs, TError, TContext>;
  };

  export const makePolicy = <TProcedure extends Procedure, TError, TContext>(
    procedure: TProcedure,
    properties: Omit<
      Policy<TProcedure["name"], TProcedure["Args"], TError, TContext>,
      "name"
    >,
  ): Policy<TProcedure["name"], TProcedure["Args"], TError, TContext> =>
    Object.assign(properties, { name: procedure.name });

  type PolicyRecord<
    TName extends string = string,
    TError = any,
    TContext = any,
  > = Record<TName, { readonly Error: TError; readonly Context: TContext }>;

  export class PolicyDispatcher<
    TProcedureRecord extends ProcedureRecord,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRecord extends PolicyRecord = {},
    TIsDone = false,
  > extends Data.Class<{
    readonly procedures: Procedures<TProcedureRecord, true>;
  }> {
    #isDone = false;
    #map = HashMap.empty<
      keyof TProcedureRecord,
      Policy<
        keyof TProcedureRecord & string,
        TProcedureRecord[keyof TProcedureRecord]["Args"],
        TRecord[keyof TRecord]["Error"],
        TRecord[keyof TRecord]["Context"]
      >
    >();

    set<TName extends keyof TProcedureRecord & string, TError, TContext>(
      makePolicy: TIsDone extends false
        ? Policy<TName, TProcedureRecord[TName]["Args"], TError, TContext>
        : never,
    ): PolicyDispatcher<
      TProcedureRecord,
      TRecord & PolicyRecord<TName, TError, TContext>,
      TIsDone
    > {
      if (!this.#isDone)
        this.#map = HashMap.set(this.#map, makePolicy.name, makePolicy);

      return this;
    }

    done(
      this: keyof TProcedureRecord extends keyof TRecord
        ? PolicyDispatcher<TProcedureRecord, TRecord, TIsDone>
        : never,
    ) {
      this.#isDone = true;

      return this as PolicyDispatcher<TProcedureRecord, TRecord, true>;
    }

    dispatch<TName extends keyof TRecord & string>(
      name: TName,
      args:
        | { encoded: Schema.Schema.Encoded<TProcedureRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TProcedureRecord[TName]["Args"]> },
    ) {
      const astMap = this.procedures;
      const map = this.#map;

      return Effect.gen(function* () {
        const makePolicy = (yield* map.pipe(
          HashMap.get(name),
          Effect.orDie,
        )) as Policy<
          TName,
          TProcedureRecord[TName]["Args"],
          TRecord[TName]["Error"],
          TRecord[TName]["Context"]
        >;

        const { Args } = yield* astMap.map.pipe(
          HashMap.get(makePolicy.name),
          Effect.orDie,
        );

        const decodedArgs = yield* "encoded" in args
          ? Effect.succeed(args.encoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                  Schema.Schema.Encoded<TProcedureRecord[TName]["Args"]>,
                  never
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                >(Args),
              ),
            )
          : Effect.succeed(args.decoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                  Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                  never
                >(Schema.typeSchema(Args)),
              ),
            );

        return yield* makePolicy.make(decodedArgs);
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

  export type Mutation<
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TPolicyError,
    TPolicyContext,
  > = {
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
  };

  export const makeMutation = <
    TProcedure extends Procedure,
    TMutatorSuccess extends Schema.Schema.Type<TProcedure["Returns"]>,
    TMutatorError,
    TMutatorContext,
    TPolicyError,
    TPolicyContext,
  >(
    procedure: TProcedure,
    properties: Omit<
      Mutation<
        TProcedure["name"],
        TProcedure["Args"],
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext,
        TPolicyError,
        TPolicyContext
      >,
      "name"
    >,
  ): Mutation<
    TProcedure["name"],
    TProcedure["Args"],
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TPolicyError,
    TPolicyContext
  > => Object.assign(properties, { name: procedure.name });

  type MutationRecord<
    TName extends string = string,
    TMutatorSuccess = any,
    TMutatorError = any,
    TMutatorContext = any,
    TPolicyError = any,
    TPolicyContext = any,
  > = Record<
    TName,
    {
      readonly MutatorSuccess: TMutatorSuccess;
      readonly MutatorError: TMutatorError;
      readonly MutatorContext: TMutatorContext;
      readonly PolicyError: TPolicyError;
      readonly PolicyContext: TPolicyContext;
    }
  >;

  export class MutationDispatcher<
    TProcedureRecord extends ProcedureRecord,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRecord extends MutationRecord = {},
    TIsDone = false,
  > extends Data.Class<{
    readonly session: AuthContract.Session;
    readonly procedures: Procedures<TProcedureRecord, true>;
  }> {
    #isDone = false;
    #map = HashMap.empty<
      keyof TProcedureRecord,
      Mutation<
        keyof TProcedureRecord & string,
        TProcedureRecord[keyof TProcedureRecord]["Args"],
        TProcedureRecord[keyof TProcedureRecord]["Returns"]["Type"],
        TRecord[keyof TRecord]["MutatorError"],
        TRecord[keyof TRecord]["MutatorContext"],
        TRecord[keyof TRecord]["PolicyError"],
        TRecord[keyof TRecord]["PolicyContext"]
      >
    >();

    set<
      TName extends keyof TProcedureRecord & string,
      TMutatorSuccess extends Schema.Schema.Type<
        TProcedureRecord[TName]["Returns"]
      >,
      TMutatorError,
      TMutatorContext,
      TPolicyError,
      TPolicyContext,
    >(
      mutation: TIsDone extends false
        ? Mutation<
            TName,
            TProcedureRecord[TName]["Args"],
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TPolicyError,
            TPolicyContext
          >
        : never,
    ) {
      if (!this.#isDone)
        this.#map = HashMap.set(this.#map, mutation.name, mutation);

      return this as MutationDispatcher<
        TProcedureRecord,
        TRecord &
          MutationRecord<
            TName,
            TMutatorSuccess,
            TMutatorError,
            TMutatorContext,
            TPolicyError,
            TPolicyContext
          >,
        TIsDone
      >;
    }

    done(
      this: keyof TProcedureRecord extends keyof TRecord
        ? MutationDispatcher<TProcedureRecord, TRecord, TIsDone>
        : never,
    ) {
      this.#isDone = true;

      return this as MutationDispatcher<TProcedureRecord, TRecord, true>;
    }

    dispatch<TName extends keyof TRecord & string>(
      name: TName,
      args:
        | { encoded: Schema.Schema.Encoded<TProcedureRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TProcedureRecord[TName]["Args"]> },
    ) {
      const session = this.session;
      const procedures = this.procedures;
      const map = this.#map;

      return Effect.gen(function* () {
        const mutation = (yield* map.pipe(
          HashMap.get(name),
          Effect.orDie,
        )) as Mutation<
          TName,
          TProcedureRecord[TName]["Args"],
          TRecord[TName]["MutatorSuccess"],
          TRecord[TName]["MutatorError"],
          TRecord[TName]["MutatorContext"],
          TRecord[TName]["PolicyError"],
          TRecord[TName]["PolicyContext"]
        >;

        const { Args, Returns } = yield* procedures.map.pipe(
          HashMap.get(mutation.name),
          Effect.orDie,
        );

        const decodedArgs = yield* "encoded" in args
          ? Effect.succeed(args.encoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                  Schema.Schema.Encoded<TProcedureRecord[TName]["Args"]>,
                  never
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                >(Args),
              ),
            )
          : Effect.succeed(args.decoded).pipe(
              Effect.flatMap(
                Schema.decode<
                  Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                  Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                  never
                >(Schema.typeSchema(Args)),
              ),
            );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return yield* mutation
          .mutator(decodedArgs, session)
          .pipe(
            AccessControl.enforce(mutation.makePolicy(decodedArgs)),
            Effect.flatMap(
              Schema.decode<
                Schema.Schema.Type<TProcedureRecord[TName]["Returns"]>,
                Schema.Schema.Type<TProcedureRecord[TName]["Returns"]>,
                never
              >(Schema.typeSchema(Returns)),
            ),
          );
      });
    }
  }
}
