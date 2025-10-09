import * as Data from "effect/Data";
import * as HashMap from "effect/HashMap";
import * as Iterable from "effect/Iterable";
import * as Schema from "effect/Schema";

export namespace ProceduresContract {
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

  export type ProcedureRecord<TProcedure extends Procedure = Procedure> =
    Record<TProcedure["name"], TProcedure>;

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
}
