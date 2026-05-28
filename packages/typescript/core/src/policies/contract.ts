// oxlint-disable typescript/no-explicit-any
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import type { AccessControl } from "../access-control";
import type { ProceduresContract } from "../procedures/contract";

export namespace PoliciesContract {
  export interface Policymaker<TName extends string, TArgs extends Schema.Top, TError, TServices> {
    readonly name: TName;
    readonly make: AccessControl.MakePolicy<TArgs, TError, TServices>;
  }

  export const makePolicy = <TProcedure extends ProceduresContract.Procedure, TError, TServices>(
    procedure: TProcedure,
    properties: Omit<
      Policymaker<TProcedure["name"], TProcedure["Args"], TError, TServices>,
      "name"
    >,
  ): Policymaker<TProcedure["name"], TProcedure["Args"], TError, TServices> =>
    Object.assign(properties, { name: procedure.name });

  type PolicyRecord<TName extends string = string, TError = any, TServices = any> = Record<
    TName,
    { readonly Error: TError; readonly Context: TServices }
  >;

  export class Dispatcher<
    TProcedureRecord extends ProceduresContract.ProcedureRecord,
    // oxlint-disable-next-line typescript/no-empty-object-type
    TRecord extends PolicyRecord = {},
    TIsFinal extends boolean = false,
  > extends Data.Class<{
    readonly procedureRegistry: ProceduresContract.Registry<TProcedureRecord, true>;
  }> {
    #isFinal = false;
    #map = HashMap.empty<
      keyof TProcedureRecord,
      Policymaker<
        keyof TProcedureRecord & string,
        TProcedureRecord[keyof TProcedureRecord]["Args"],
        TRecord[keyof TRecord]["Error"],
        TRecord[keyof TRecord]["Context"]
      >
    >();

    public policy<TName extends keyof TProcedureRecord & string, TError, TServices>(
      this: TIsFinal extends false ? Dispatcher<TProcedureRecord, TRecord, TIsFinal> : never,
      policy: Policymaker<TName, TProcedureRecord[TName]["Args"], TError, TServices>,
    ): Dispatcher<TProcedureRecord, TRecord & PolicyRecord<TName, TError, TServices>, TIsFinal> {
      if (!this.#isFinal) this.#map = HashMap.set(this.#map, policy.name, policy);

      return this;
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
        const policymaker = (yield* this.#map.pipe(
          HashMap.get(name),
          Effect.fromOption,
          Effect.orDie,
        )) as Policymaker<
          TName,
          TProcedureRecord[TName]["Args"],
          TRecord[TName]["Error"],
          TRecord[TName]["Context"]
        >;

        const { Args } = yield* Record.get(this.procedureRegistry.record, policymaker.name).pipe(
          Effect.fromOption,
          Effect.orDie,
        );

        const safeArgs = yield* Schema.decodeEffect(
          Args.pipe(Schema.toType) as Schema.Decoder<
            Schema.Schema.Type<TProcedureRecord[TName]["Args"]>
          >,
        )(args);

        const policy = policymaker.make(safeArgs);

        yield* policy;
      });
    }
  }
}
