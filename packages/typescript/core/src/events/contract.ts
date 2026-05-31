// oxlint-disable typescript/no-explicit-any
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import type { HandlersContract } from "../handlers/contract";

export namespace EventsContract {
  export type EventHandler<TInput extends Schema.Top, TError, TServices> = (
    input: Schema.Schema.Type<TInput>,
  ) => Effect.Effect<void, TError, TServices>;

  export type Event<TName extends string, TInput extends Schema.Top, TError, TServices> = {
    readonly name: TName;
    readonly handler: EventHandler<TInput, TError, TServices>;
  };

  export const makeEvent = <THandler extends HandlersContract.Handler, TError, TServices>(
    handler: THandler,
    properties: Omit<Event<THandler["name"], THandler["Input"], TError, TServices>, "name">,
  ): Event<THandler["name"], THandler["Input"], TError, TServices> =>
    Object.assign(properties, { name: handler.name });

  type EventRecord<TName extends string = string, TError = any, TServices = any> = Record<
    TName,
    { readonly Error: TError; readonly Services: TServices }
  >;

  export class Dispatcher<
    THandlerRecord extends HandlersContract.HandlerRecord,
    // oxlint-disable-next-line typescript/no-empty-object-type
    TRecord extends EventRecord = {},
    TIsFinal extends boolean = false,
  > extends Data.Class<{
    readonly handlerRegistry: HandlersContract.Registry<THandlerRecord, true>;
  }> {
    #isFinal = false;
    #map = HashMap.empty<
      keyof THandlerRecord & string,
      Event<
        keyof THandlerRecord & string,
        THandlerRecord[keyof THandlerRecord]["Input"],
        TRecord[keyof TRecord]["Error"],
        TRecord[keyof TRecord]["Services"]
      >
    >();

    public readonly Record = {} as TRecord;

    public event<TName extends keyof THandlerRecord & string, TError, TServices>(
      this: TIsFinal extends false ? Dispatcher<THandlerRecord, TRecord, TIsFinal> : never,
      event: Event<TName, THandlerRecord[TName]["Input"], TError, TServices>,
    ) {
      if (!this.#isFinal) this.#map = HashMap.set(this.#map, event.name, event);

      return this as Dispatcher<
        THandlerRecord,
        TRecord & EventRecord<TName, TError, TServices>,
        TIsFinal
      >;
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
      input: Schema.Schema.Type<THandlerRecord[TName]["Input"]>,
    ) {
      return Effect.gen({ self: this }, function* () {
        const event = (yield* this.#map.pipe(
          HashMap.get(name),
          Effect.fromOption,
          Effect.orDie,
        )) as Event<
          TName,
          THandlerRecord[TName]["Input"],
          TRecord[TName]["Error"],
          TRecord[TName]["Services"]
        >;

        const { Input } = yield* Record.get(this.handlerRegistry.record, event.name).pipe(
          Effect.fromOption,
          Effect.orDie,
        );

        const safeInput = yield* Schema.decodeEffect(
          Input.pipe(Schema.toType) as Schema.Decoder<
            Schema.Schema.Type<THandlerRecord[TName]["Input"]>
          >,
        )(input);

        yield* event.handler(safeInput);
      });
    }
  }
}
