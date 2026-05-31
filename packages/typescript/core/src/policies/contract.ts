// oxlint-disable typescript/no-explicit-any
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import type { AccessControl } from "../access-control";
import type { HandlersContract } from "../handlers/contract";

export namespace PoliciesContract {
  export interface Policymaker<TName extends string, TArgs extends Schema.Top, TError, TServices> {
    readonly name: TName;
    readonly make: AccessControl.MakePolicy<TArgs, TError, TServices>;
  }

  export const makePolicy = <THandler extends HandlersContract.Handler, TError, TServices>(
    handler: THandler,
    properties: Omit<Policymaker<THandler["name"], THandler["Input"], TError, TServices>, "name">,
  ): Policymaker<THandler["name"], THandler["Input"], TError, TServices> =>
    Object.assign(properties, { name: handler.name });

  type PolicyRecord<TName extends string = string, TError = any, TServices = any> = Record<
    TName,
    { readonly Error: TError; readonly Context: TServices }
  >;

  export class Dispatcher<
    THandlerRecord extends HandlersContract.HandlerRecord,
    // oxlint-disable-next-line typescript/no-empty-object-type
    TRecord extends PolicyRecord = {},
    TIsFinal extends boolean = false,
  > extends Data.Class<{
    readonly handlerRegistry: HandlersContract.Registry<THandlerRecord, true>;
  }> {
    #isFinal = false;
    #map = HashMap.empty<
      keyof THandlerRecord,
      Policymaker<
        keyof THandlerRecord & string,
        THandlerRecord[keyof THandlerRecord]["Input"],
        TRecord[keyof TRecord]["Error"],
        TRecord[keyof TRecord]["Context"]
      >
    >();

    public policy<TName extends keyof THandlerRecord & string, TError, TServices>(
      this: TIsFinal extends false ? Dispatcher<THandlerRecord, TRecord, TIsFinal> : never,
      policy: Policymaker<TName, THandlerRecord[TName]["Input"], TError, TServices>,
    ): Dispatcher<THandlerRecord, TRecord & PolicyRecord<TName, TError, TServices>, TIsFinal> {
      if (!this.#isFinal) this.#map = HashMap.set(this.#map, policy.name, policy);

      return this;
    }

    public final(
      this: keyof THandlerRecord extends keyof TRecord
        ? Dispatcher<THandlerRecord, TRecord, TIsFinal>
        : never,
    ) {
      this.#isFinal = true;

      return this as Dispatcher<THandlerRecord, TRecord, true>;
    }

    public dispatch<TName extends keyof TRecord & string>(
      this: TIsFinal extends true ? Dispatcher<THandlerRecord, TRecord, TIsFinal> : never,
      name: TName,
      args: Schema.Schema.Type<THandlerRecord[TName]["Input"]>,
    ) {
      return Effect.gen({ self: this }, function* () {
        const policymaker = (yield* this.#map.pipe(
          HashMap.get(name),
          Effect.fromOption,
          Effect.orDie,
        )) as Policymaker<
          TName,
          THandlerRecord[TName]["Input"],
          TRecord[TName]["Error"],
          TRecord[TName]["Context"]
        >;

        const { Input: Args } = yield* Record.get(
          this.handlerRegistry.record,
          policymaker.name,
        ).pipe(Effect.fromOption, Effect.orDie);

        const safeArgs = yield* Schema.decodeEffect(
          Args.pipe(Schema.toType) as Schema.Decoder<
            Schema.Schema.Type<THandlerRecord[TName]["Input"]>
          >,
        )(args);

        const policy = policymaker.make(safeArgs);

        yield* policy;
      });
    }
  }
}
