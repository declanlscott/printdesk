import * as Data from "effect/Data";
import * as HashMap from "effect/HashMap";
import * as Iterable from "effect/Iterable";
import * as Record from "effect/Record";
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

  export class Registry<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    TRecord extends ProcedureRecord = {},
    TIsFinal extends boolean = false,
  > {
    #isFinal = false;
    #map = HashMap.empty<Procedure["name"], Procedure>();

    procedure<TProcedure extends Procedure>(
      this: TIsFinal extends false ? Registry<TRecord, TIsFinal> : never,
      procedure: TProcedure,
    ) {
      if (!this.#isFinal)
        this.#map = HashMap.set(this.#map, procedure.name, procedure);

      return this as Registry<TRecord & ProcedureRecord<TProcedure>, TIsFinal>;
    }

    final(this: TIsFinal extends false ? Registry<TRecord, TIsFinal> : never) {
      this.#isFinal = true;

      return this as Registry<TRecord, true>;
    }

    get record() {
      return this.#map.pipe(HashMap.entries, Record.fromEntries) as {
        [TName in keyof TRecord]: TName extends string
          ? Procedure<TName, TRecord[TName]["Args"]>
          : never;
      };
    }

    get Schema() {
      return this.#map.pipe(
        HashMap.values,
        Iterable.map(
          (procedure) =>
            Schema.Struct({
              name: Schema.tag(procedure.name),
              args: procedure.Args,
            }) as {
              [TName in keyof TRecord]: TName extends string
                ? Schema.Struct<{
                    name: Schema.tag<TName>;
                    args: TRecord[TName]["Args"];
                  }>
                : never;
            }[keyof TRecord],
        ),
        (members) => Schema.Union(...members),
      );
    }
  }
}
