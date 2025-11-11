/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import type { AccessControl } from "../access-control2";
import type { ProceduresContract } from "../procedures/contract";

export namespace PoliciesContract {
  export type Policy<
    TName extends string,
    TArgs extends Schema.Schema.AnyNoContext,
    TError,
    TContext,
  > = {
    readonly name: TName;
    readonly make: AccessControl.MakePolicy<TArgs, TError, TContext>;
  };

  export const makePolicy = <
    TProcedure extends ProceduresContract.Procedure,
    TError,
    TContext,
  >(
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

  export class Dispatcher<
    TProcedureRecord extends ProceduresContract.ProcedureRecord,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRecord extends PolicyRecord = {},
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
      Policy<
        keyof TProcedureRecord & string,
        TProcedureRecord[keyof TProcedureRecord]["Args"],
        TRecord[keyof TRecord]["Error"],
        TRecord[keyof TRecord]["Context"]
      >
    >();

    policy<TName extends keyof TProcedureRecord & string, TError, TContext>(
      this: TIsFinal extends false
        ? Dispatcher<TProcedureRecord, TRecord, TIsFinal>
        : never,
      policy: Policy<TName, TProcedureRecord[TName]["Args"], TError, TContext>,
    ): Dispatcher<
      TProcedureRecord,
      TRecord & PolicyRecord<TName, TError, TContext>,
      TIsFinal
    > {
      if (!this.#isFinal)
        this.#map = HashMap.set(this.#map, policy.name, policy);

      return this;
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
    ) {
      return this.#map.pipe(
        HashMap.get(name),
        Effect.orDie,
        Effect.map(
          (p) =>
            p as Policy<
              TName,
              TProcedureRecord[TName]["Args"],
              TRecord[TName]["Error"],
              TRecord[TName]["Context"]
            >,
        ),
        Effect.flatMap((policy) =>
          Record.get(this.procedureRegistry.record, policy.name).pipe(
            Option.match({
              onNone: () =>
                Effect.dieMessage(
                  `Procedure "${policy.name}" missing from record.`,
                ),
              onSome: ({ Args }) =>
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
                ).pipe(Effect.flatMap(policy.make)),
            }),
          ),
        ),
      );
    }
  }
}
