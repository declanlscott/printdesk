/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Schema from "effect/Schema";

import { AccessControl } from "../access-control2";

import type { AuthContract } from "../auth2/contract";
import type { ProceduresContract } from "../procedures/contract";

export namespace MutationsContract {
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
    TProcedure extends ProceduresContract.Procedure,
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

  export class Dispatcher<
    TProcedureRecord extends ProceduresContract.ProcedureRecord,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRecord extends MutationRecord = {},
    TIsDone = false,
  > extends Data.Class<{
    readonly session: AuthContract.Session;
    readonly procedures: ProceduresContract.Procedures<TProcedureRecord, true>;
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

      return this as Dispatcher<
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
        ? Dispatcher<TProcedureRecord, TRecord, TIsDone>
        : never,
    ) {
      this.#isDone = true;

      return this as Dispatcher<TProcedureRecord, TRecord, true>;
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
