// oxlint-disable typescript/no-explicit-any
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { AccessControl } from "../access-control";
import { Actor } from "../actors";

import type { ActorsContract } from "../actors/contract";
import type { ProceduresContract } from "../procedures/contract";

export namespace MutationsContract {
  export type Mutator<TArgs extends Schema.Top, TSuccess, TError, TServices> = (
    args: Schema.Schema.Type<TArgs>,
    user: ActorsContract.UserActor,
  ) => Effect.Effect<TSuccess, TError, TServices>;

  export type Mutation<
    TName extends string,
    TArgs extends Schema.Top,
    TMutatorSuccess,
    TMutatorError,
    TMutatorContext,
    TPolicyError,
    TPolicyContext,
  > = {
    readonly name: TName;
    readonly makePolicy: AccessControl.MakePolicy<TArgs, TPolicyError, TPolicyContext>;
    readonly mutator: Mutator<TArgs, TMutatorSuccess, TMutatorError, TMutatorContext>;
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
    // oxlint-disable-next-line typescript/no-empty-object-type
    TRecord extends MutationRecord = {},
    TIsFinal extends boolean = false,
  > extends Data.Class<{
    readonly procedureRegistry: ProceduresContract.Registry<TProcedureRecord, true>;
  }> {
    #isFinal = false;
    #map = HashMap.empty<
      keyof TProcedureRecord & string,
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

    public readonly Record = {} as TRecord;

    public mutation<
      TName extends keyof TProcedureRecord & string,
      TMutatorSuccess extends Schema.Schema.Type<TProcedureRecord[TName]["Returns"]>,
      TMutatorError,
      TMutatorContext,
      TPolicyError,
      TPolicyContext,
    >(
      this: TIsFinal extends false ? Dispatcher<TProcedureRecord, TRecord, TIsFinal> : never,
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
      if (!this.#isFinal) this.#map = HashMap.set(this.#map, mutation.name, mutation);

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

    public final(
      this: keyof TProcedureRecord extends keyof TRecord
        ? Dispatcher<TProcedureRecord, TRecord, TIsFinal>
        : never,
    ) {
      this.#isFinal = true;

      return this as Dispatcher<TProcedureRecord, TRecord, true>;
    }

    public dispatch<TName extends keyof TRecord & string>(
      this: TIsFinal extends true ? Dispatcher<TProcedureRecord, TRecord, TIsFinal> : never,
      name: TName,
      args: Schema.Schema.Type<TProcedureRecord[TName]["Args"]>,
    ) {
      return Effect.gen({ self: this }, function* () {
        const user = yield* Actor.pipe(Effect.flatMap(Struct.get("assertUser")));

        const mutation = (yield* this.#map.pipe(
          HashMap.get(name),
          Effect.fromOption,
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

        const { Args, Returns } = yield* Record.get(
          this.procedureRegistry.record,
          mutation.name,
        ).pipe(Effect.fromOption, Effect.orDie);

        const safeArgs = yield* Schema.decodeEffect(
          Args.pipe(Schema.toType) as Schema.Decoder<
            Schema.Schema.Type<TProcedureRecord[TName]["Args"]>
          >,
        )(args);

        return yield* mutation
          .mutator(safeArgs, user)
          .pipe(
            AccessControl.enforce(mutation.makePolicy(safeArgs)),
            Effect.flatMap(
              Schema.decodeEffect(
                Returns.pipe(Schema.toType) as Schema.Decoder<
                  Schema.Schema.Type<TProcedureRecord[TName]["Returns"]>
                >,
              ),
            ),
          );
      });
    }
  }
}
