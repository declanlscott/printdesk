/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
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
    TIsDone = false,
  > extends Data.Class<{
    readonly procedures: ProceduresContract.Procedures<TProcedureRecord, true>;
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
    ): Dispatcher<
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
}
