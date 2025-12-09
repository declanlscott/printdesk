/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import { AccessControl } from "../access-control";

import type { ActorsContract } from "../actors/contract";
import type { ProceduresContract } from "../procedures/contract";

export namespace MutationsContract {
  export type Mutator<
    TArgs extends Schema.Schema.AnyNoContext,
    TSuccess,
    TError,
    TContext,
  > = (
    args: Schema.Schema.Type<TArgs>,
    user: ActorsContract.User,
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
    TIsFinal extends boolean = false,
  > extends Data.Class<{
    readonly procedureRegistry: ProceduresContract.Registry<
      TProcedureRecord,
      true
    >;
  }> {
    #isFinal = false;
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

    mutation<
      TName extends keyof TProcedureRecord & string,
      TMutatorSuccess extends Schema.Schema.Type<
        TProcedureRecord[TName]["Returns"]
      >,
      TMutatorError,
      TMutatorContext,
      TPolicyError,
      TPolicyContext,
    >(
      this: TIsFinal extends false
        ? Dispatcher<TProcedureRecord, TRecord, TIsFinal>
        : never,
      mutation: Mutation<
        TName,
        TProcedureRecord[TName]["Args"],
        TMutatorSuccess,
        TMutatorError,
        TMutatorContext,
        TPolicyError,
        TPolicyContext
      >,
    ) {
      if (!this.#isFinal)
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
        TIsFinal
      >;
    }

    final(
      this: keyof TProcedureRecord extends keyof TRecord
        ? Dispatcher<TProcedureRecord, TRecord, TIsFinal>
        : never,
    ) {
      this.#isFinal = true;

      return this as Dispatcher<TProcedureRecord, TRecord, true>;
    }

    dispatch<TName extends keyof TRecord & string>(
      this: TIsFinal extends true
        ? Dispatcher<TProcedureRecord, TRecord, TIsFinal>
        : never,
      name: TName,
      args:
        | { encoded: Schema.Schema.Encoded<TProcedureRecord[TName]["Args"]> }
        | { decoded: Schema.Schema.Type<TProcedureRecord[TName]["Args"]> },
      user: ActorsContract.User,
    ) {
      return this.#map.pipe(
        HashMap.get(name),
        Effect.orDie,
        Effect.map(
          (m) =>
            m as Mutation<
              TName,
              TProcedureRecord[TName]["Args"],
              TRecord[TName]["MutatorSuccess"],
              TRecord[TName]["MutatorError"],
              TRecord[TName]["MutatorContext"],
              TRecord[TName]["PolicyError"],
              TRecord[TName]["PolicyContext"]
            >,
        ),
        Effect.flatMap((mutation) =>
          Record.get(this.procedureRegistry.record, mutation.name).pipe(
            Option.match({
              onNone: () =>
                Effect.dieMessage(
                  `Procedure "${mutation.name}" missing from record.`,
                ),
              onSome: ({ Args, Returns }) =>
                ("encoded" in args
                  ? Schema.decode<
                      Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                      Schema.Schema.Encoded<TProcedureRecord[TName]["Args"]>,
                      never
                    >(Args)(args.encoded)
                  : Schema.decode<
                      Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                      Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
                      never
                    >(Schema.typeSchema(Args))(args.decoded)
                ).pipe(
                  Effect.flatMap((args) =>
                    mutation
                      .mutator(args, user)
                      .pipe(
                        AccessControl.enforce(mutation.makePolicy(args)),
                        Effect.flatMap(
                          Schema.decode<
                            Schema.Schema.Type<
                              TProcedureRecord[TName]["Returns"]
                            >,
                            Schema.Schema.Type<
                              TProcedureRecord[TName]["Returns"]
                            >,
                            never
                          >(Schema.typeSchema(Returns)),
                        ),
                      ),
                  ),
                ),
            }),
          ),
        ),
      );
    }
  }
}
