import * as Array from "effect/Array";
import * as Data from "effect/Data";
import * as HashMap from "effect/HashMap";
import * as Iterable from "effect/Iterable";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

export namespace ProceduresContract {
  export class Procedure<
    TName extends string = string,
    TArgs extends Schema.Top = Schema.Top,
    TReturns extends Schema.Top = Schema.Top,
  > extends Data.Class<{ readonly name: TName; readonly Args: TArgs; readonly Returns: TReturns }> {
    public readonly make = (args: Schema.Schema.Type<TArgs>) => ({ name: this.name, args });
  }

  export type ProcedureRecord<TProcedure extends Procedure = Procedure> = Record<
    TProcedure["name"],
    TProcedure
  >;

  export class Registry<
    // oxlint-disable-next-line typescript/no-empty-object-type
    TRecord extends ProcedureRecord = {},
    TIsFinal extends boolean = false,
  > {
    #isFinal = false;
    #map = HashMap.empty<Procedure["name"], Procedure>();

    public procedure<TProcedure extends Procedure>(
      this: TIsFinal extends false ? Registry<TRecord, TIsFinal> : never,
      procedure: TProcedure,
    ) {
      if (!this.#isFinal) this.#map = HashMap.set(this.#map, procedure.name, procedure);

      return this as Registry<TRecord & ProcedureRecord<TProcedure>, TIsFinal>;
    }

    public final(this: TIsFinal extends false ? Registry<TRecord, TIsFinal> : never) {
      this.#isFinal = true;

      return this as Registry<TRecord, true>;
    }

    public get record() {
      return this.#map.pipe(HashMap.entries, Record.fromEntries) as {
        readonly [TName in keyof TRecord]: TName extends string
          ? Procedure<TName, TRecord[TName]["Args"], TRecord[TName]["Returns"]>
          : never;
      };
    }

    public get Schema() {
      return this.#map.pipe(
        HashMap.values,
        Iterable.map(
          (procedure) =>
            Schema.Struct({
              name: Schema.tag(procedure.name),
              args: procedure.Args,
            }) as {
              readonly [TName in keyof TRecord]: TName extends string
                ? Schema.Struct<{
                    name: Schema.tag<TName>;
                    args: TRecord[TName]["Args"];
                  }>
                : never;
            }[keyof TRecord],
        ),
        (members) => Schema.Union(Array.fromIterable(members)),
      );
    }

    public get ReplicacheMutationV0Schema() {
      return this.#map.pipe(
        HashMap.values,
        Iterable.map(
          (procedure) =>
            Schema.Struct({
              id: Schema.Int,
              name: Schema.tag(procedure.name),
              args: procedure.Args,
              timestamp: Schema.Number,
            }) as {
              readonly [TName in keyof TRecord]: TName extends string
                ? Schema.Struct<{
                    id: Schema.Int;
                    name: Schema.tag<TName>;
                    args: TRecord[TName]["Args"];
                    timestamp: Schema.Number;
                  }>
                : never;
            }[keyof TRecord],
        ),
        (members) => Schema.Union(Array.fromIterable(members)),
      );
    }

    public get ReplicacheMutationV1Schema() {
      return this.#map.pipe(
        HashMap.values,
        Iterable.map(
          (procedure) =>
            Schema.Struct({
              id: Schema.Int,
              name: Schema.tag(procedure.name),
              args: procedure.Args,
              timestamp: Schema.Number,
              clientId: Schema.String.pipe(Schema.check(Schema.isUUID())),
            }).pipe(Schema.encodeKeys({ clientId: "clientID" })) as {
              readonly [TName in keyof TRecord]: TName extends string
                ? Schema.encodeKeys<
                    Schema.Struct<{
                      id: Schema.Int;
                      name: Schema.tag<TName>;
                      args: TRecord[TName]["Args"];
                      timestamp: Schema.Number;
                      clientId: Schema.String;
                    }>,
                    { clientId: "clientID" }
                  >
                : never;
            }[keyof TRecord],
        ),
        (members) => Schema.Union(Array.fromIterable(members)),
      );
    }
  }
}
