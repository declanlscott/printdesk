import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

import { pluck, StringFromUnknown } from "../utils";

export namespace XmlContract {
  export class BuilderError extends Schema.TaggedErrorClass<BuilderError>()("BuilderError", {
    cause: Schema.Defect(),
  }) {}

  export class ParserError extends Schema.TaggedErrorClass<ParserError>()("ParserError", {
    cause: Schema.Defect(),
  }) {}
}

export namespace XmlRpcContract {
  export const Boolean = Schema.Struct({
    value: Schema.Struct({
      boolean: Schema.Literals([0, 1]).pipe(
        Schema.decodeTo(Schema.Boolean, {
          decode: SchemaGetter.transform((binary) => binary === 1),
          encode: SchemaGetter.transform((boolean) => (boolean ? 1 : 0)),
        }),
      ),
    }),
  });

  export const Double = Schema.Struct({ value: Schema.Struct({ double: Schema.Number }) });

  export const Int = Schema.Struct({ value: Schema.Struct({ int: Schema.Int }) });

  export const String = Schema.Struct({ value: Schema.Struct({ string: Schema.String }) });

  export const StringArray = Schema.Struct({
    value: Schema.Struct({
      array: Schema.Struct({
        data: Schema.Struct({
          value: Schema.Array(Schema.Struct({ string: Schema.String })),
        }),
      }),
    }),
  });

  export const Value = Schema.Struct({ value: StringFromUnknown });

  export const member = <TName extends string, TValue extends Schema.Top>(
    name: TName,
    Value: TValue,
  ) => Schema.Struct({ name: Schema.Literal(name), value: Value });

  export const struct = <
    // oxlint-disable-next-line typescript/no-explicit-any
    TMembers extends Array<ReturnType<typeof member<any, any>>>,
  >(
    ...members: TMembers
  ) =>
    Schema.Struct({
      value: Schema.Struct({ struct: Schema.Struct({ member: Schema.Tuple(members) }) }),
    });

  export const methodResponse = <TFields extends Schema.Struct.Fields>(fields: TFields) =>
    Schema.Struct({ "?xml": Schema.Literal(""), methodResponse: Schema.Struct(fields) }).pipe(
      pluck("methodResponse"),
    );

  export class FaultError extends Schema.TaggedErrorClass<FaultError>()("FaultError", {
    string: Schema.String,
    code: Schema.Int,
  }) {}
  export const FaultResponse = methodResponse({
    fault: struct(
      member("faultString", Schema.Union([String.fields.value, Value.fields.value])),
      member("faultCode", Int.fields.value),
    ),
  }).pipe(
    Schema.decodeTo(FaultError, {
      decode: SchemaGetter.transform((response) => {
        const [string, code] = response.fault.value.struct.member;

        return new FaultError({
          string: typeof string.value === "string" ? string.value : string.value.string,
          code: code.value.int,
        });
      }),
      encode: SchemaGetter.forbidden(() => "Not implemented"),
    }),
  );

  export const BooleanResponse = methodResponse({
    params: Schema.Struct({ param: Boolean.pipe(Schema.toEncoded) }),
  }).pipe(
    Schema.decodeTo(Schema.Boolean, {
      decode: SchemaGetter.transform((response) => response.params.param.value.boolean === 1),
      encode: SchemaGetter.forbidden(() => "Not implemented"),
    }),
  );

  export const IntResponse = methodResponse({
    params: Schema.Struct({ param: Int.pipe(Schema.toEncoded) }),
  }).pipe(
    Schema.decodeTo(Schema.Int, {
      decode: SchemaGetter.transform((response) => response.params.param.value.int),
      encode: SchemaGetter.forbidden(() => "Not implemented"),
    }),
  );

  // oxlint-disable-next-line typescript/no-explicit-any
  export const tupleResponse = <TValues extends Array<Schema.Decoder<any>>>(...Values: TValues) =>
    methodResponse({
      params: Schema.Struct({
        param: Schema.Struct({
          value: Schema.Struct({
            array: Schema.Struct({
              data: Schema.Struct({
                value: Schema.Tuple(Values).pipe(Schema.toEncoded),
              }),
            }),
          }),
        }),
      }),
    }).pipe(
      Schema.decodeTo(Schema.Tuple(Values), {
        decode: SchemaGetter.transform((response) => response.params.param.value.array.data.value),
        encode: SchemaGetter.forbidden(() => "Not implemented"),
      }),
    );

  // oxlint-disable-next-line typescript/no-explicit-any
  export const arrayResponse = <TValue extends Schema.Decoder<any>>(Value: TValue) =>
    methodResponse({
      params: Schema.Struct({
        param: Schema.Struct({
          value: Schema.Struct({
            array: Schema.Struct({
              data: Schema.Struct({
                value: Schema.Array(Value.pipe(Schema.toEncoded)),
              }),
            }),
          }),
        }),
      }),
    }).pipe(
      Schema.decodeTo(Value.pipe(Schema.Array), {
        decode: SchemaGetter.transform((response) => response.params.param.value.array.data.value),
        encode: SchemaGetter.forbidden(() => "Not implemented"),
      }),
    );

  export const structResponse = <
    // oxlint-disable-next-line typescript/no-explicit-any
    TMembers extends Array<ReturnType<typeof member<any, any>>>,
  >(
    ...Members: TMembers
  ) =>
    methodResponse({
      params: Schema.Struct({
        param: struct(...Members).pipe(Schema.toEncoded),
      }),
    }).pipe(
      Schema.decodeTo(Schema.Tuple(Members), {
        decode: SchemaGetter.transform((response) => response.params.param.value.struct.member),
        encode: SchemaGetter.forbidden(() => "Not implemented"),
      }),
    );
}
