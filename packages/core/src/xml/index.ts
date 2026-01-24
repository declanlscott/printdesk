import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

import { StringFromUnknown } from "../utils";

import type { HttpClientResponse } from "@effect/platform/HttpClientResponse";
import type { ParseOptions } from "effect/SchemaAST";
import type { SchemaAndValue } from "../utils";

export namespace Xml {
  export const implicitValue = <TValue extends Schema.Schema.Any>(
    Value: TValue,
  ) => Schema.Struct({ value: Value });
  export type ImplicitValue<TValue extends Schema.Schema.Any> = ReturnType<
    typeof implicitValue<TValue>
  >;

  export const ImplicitString = implicitValue(StringFromUnknown);

  export class ExplicitString extends Schema.Class<ExplicitString>(
    "ExplicitString",
  )({ value: Schema.Struct({ string: Schema.String }) }) {
    static with(string: string) {
      const schema = Schema.Struct(this.fields);

      return {
        schema,
        value: schema.make({ value: { string } }),
      };
    }
  }

  export class ExplicitInt extends Schema.Class<ExplicitInt>("ExplicitInt")({
    value: Schema.Struct({ int: Schema.Int }),
  }) {
    static with(int: number) {
      const schema = Schema.Struct(this.fields);

      return {
        schema,
        value: schema.make({ value: { int } }),
      };
    }
  }

  export class ExplicitDouble extends Schema.Class<ExplicitDouble>(
    "ExplicitDouble",
  )({ value: Schema.Struct({ double: Schema.Number }) }) {
    static with(double: number) {
      const schema = Schema.Struct(this.fields);

      return {
        schema,
        value: schema.make({ value: { double } }),
      };
    }
  }

  export class ExplicitBoolean extends Schema.Class<ExplicitBoolean>(
    "ExplicitBoolean",
  )({
    value: Schema.Struct({
      boolean: Schema.Literal(0, 1).pipe(
        Schema.transform(Schema.Boolean, {
          strict: true,
          decode: (binary) => binary === 1,
          encode: (boolean) => (boolean ? 1 : 0),
        }),
      ),
    }),
  }) {
    static with(boolean: boolean) {
      const schema = Schema.Struct(this.fields);

      return {
        schema,
        value: schema.make({ value: { boolean } }),
      };
    }
  }

  export class ExplicitStringArray extends Schema.Class<ExplicitStringArray>(
    "ExplicitStringArray",
  )({
    value: Schema.Struct({
      array: Schema.Struct({
        data: Schema.Struct({
          value: Schema.Array(Schema.Struct({ string: Schema.String })),
        }),
      }),
    }),
  }) {
    static with(strings: Array<string>) {
      const schema = Schema.Struct(this.fields);

      return {
        schema,
        value: schema.make({
          value: {
            array: { data: { value: strings.map((string) => ({ string })) } },
          },
        }),
      };
    }
  }

  export const member = <
    TName extends string,
    TValue extends Schema.Schema.Any,
  >(
    name: TName,
    Value: TValue,
  ) => Schema.Struct({ name: Schema.Literal(name), value: Value });

  export const struct = <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TMembers extends Array<ReturnType<typeof member<any, any>>>,
  >(
    ...members: TMembers
  ) =>
    Schema.Struct({
      value: Schema.Struct({
        struct: Schema.Struct({ member: Schema.Tuple(...members) }),
      }),
    });

  export class BuilderError extends Data.TaggedError("XmlBuilderError")<{
    readonly cause: unknown;
  }> {}

  export class Builder extends Effect.Service<Builder>()(
    "@printdesk/core/xml/Builder",
    {
      effect: Effect.gen(function* () {
        const client = yield* Effect.try({
          try: () => new XMLBuilder(),
          catch: (error) => new BuilderError({ cause: error }),
        });

        const build = <TInput>(input: TInput) =>
          Effect.try({
            try: () => client.build(input),
            catch: (error) => new BuilderError({ cause: error }),
          });

        return { build } as const;
      }),
    },
  ) {}

  export class ParserError extends Data.TaggedError("XmlParserError")<{
    readonly cause: unknown;
  }> {}

  export class Parser extends Effect.Service<Parser>()(
    "@printdesk/core/xml/Parser",
    {
      effect: Effect.gen(function* () {
        const client = yield* Effect.try({
          try: () => new XMLParser(),
          catch: (error) => new ParserError({ cause: error }),
        });

        const parse = <TOutput>(...props: Parameters<typeof client.parse>) =>
          Effect.try({
            try: () => client.parse(...props) as TOutput,
            catch: (error) => new ParserError({ cause: error }),
          });

        return { parse } as const;
      }),
    },
  ) {}

  export namespace Rpc {
    export const methodResponse = <TFields extends Schema.Struct.Fields>(
      fields: TFields,
    ) =>
      Schema.Struct({
        "?xml": Schema.Literal(""),
        methodResponse: Schema.Struct(fields),
      }).pipe(Schema.pluck("methodResponse"));

    export class FaultError extends Schema.TaggedError<FaultError>(
      "FaultError",
    )("FaultError", {
      string: Schema.String,
      code: Schema.Int,
    }) {}
    export const FaultResponse = methodResponse({
      fault: Xml.struct(
        Xml.member(
          "faultString",
          Schema.Union(
            ImplicitString.fields.value,
            ExplicitString.fields.value,
          ),
        ),
        Xml.member("faultCode", ExplicitInt.fields.value),
      ),
    }).pipe(
      Schema.transformOrFail(FaultError, {
        strict: true,
        decode: (response) => {
          const [string, code] = response.fault.value.struct.member;

          return ParseResult.succeed(
            new FaultError({
              string:
                typeof string.value === "string"
                  ? string.value
                  : string.value.string,
              code: code.value.int,
            }),
          );
        },
        encode: (fault, _, ast) =>
          ParseResult.fail(
            new ParseResult.Forbidden(ast, fault, "Not implemented"),
          ),
      }),
    );

    export const BooleanResponse = methodResponse({
      params: Schema.Struct({
        param: ExplicitBoolean.pipe(Schema.encodedSchema),
      }),
    }).pipe(
      Schema.transformOrFail(Schema.Boolean, {
        strict: true,
        decode: (response) =>
          ParseResult.succeed(response.params.param.value.boolean === 1),
        encode: (boolean, _, ast) =>
          ParseResult.fail(
            new ParseResult.Forbidden(ast, boolean, "Not implemented"),
          ),
      }),
    );

    export const IntResponse = methodResponse({
      params: Schema.Struct({
        param: ExplicitInt.pipe(Schema.encodedSchema),
      }),
    }).pipe(
      Schema.transformOrFail(Schema.Int, {
        strict: true,
        decode: (response) =>
          ParseResult.succeed(response.params.param.value.int),
        encode: (int, _, ast) =>
          ParseResult.fail(
            new ParseResult.Forbidden(ast, int, "Not implemented"),
          ),
      }),
    );

    export const tupleResponse = <TValues extends Array<Schema.Schema.Any>>(
      ...Values: TValues
    ) =>
      methodResponse({
        params: Schema.Struct({
          param: Schema.Struct({
            value: Schema.Struct({
              array: Schema.Struct({
                data: Schema.Struct({
                  value: Schema.Tuple(...Values).pipe(Schema.encodedSchema),
                }),
              }),
            }),
          }),
        }),
      }).pipe(
        Schema.transformOrFail(Schema.Tuple(...Values), {
          strict: true,
          decode: (response) =>
            ParseResult.succeed(response.params.param.value.array.data.value),
          encode: (tuple, _, ast) =>
            ParseResult.fail(
              new ParseResult.Forbidden(ast, tuple, "Not implemented"),
            ),
        }),
      );

    export const arrayResponse = <TValue extends Schema.Schema.Any>(
      Value: TValue,
    ) =>
      methodResponse({
        params: Schema.Struct({
          param: Schema.Struct({
            value: Schema.Struct({
              array: Schema.Struct({
                data: Schema.Struct({
                  value: Schema.Array(Value.pipe(Schema.encodedSchema)),
                }),
              }),
            }),
          }),
        }),
      }).pipe(
        Schema.transformOrFail(Schema.Array(Value), {
          strict: true,
          decode: (response) =>
            ParseResult.succeed(response.params.param.value.array.data.value),
          encode: (array, _, ast) =>
            ParseResult.fail(
              new ParseResult.Forbidden(ast, array, "Not implemented"),
            ),
        }),
      );

    export const structResponse = <
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TMembers extends Array<ReturnType<typeof Xml.member<any, any>>>,
    >(
      ...Members: TMembers
    ) =>
      methodResponse({
        params: Schema.Struct({
          param: Xml.struct(...Members).pipe(Schema.encodedSchema),
        }),
      }).pipe(
        Schema.transformOrFail(Schema.Tuple(...Members), {
          strict: true,
          decode: (response) =>
            ParseResult.succeed(response.params.param.value.struct.member),
          encode: (struct, _, ast) =>
            ParseResult.fail(
              new ParseResult.Forbidden(ast, struct, "Not implemented"),
            ),
        }),
      );

    export class Client extends Effect.Service<Client>()(
      "@printdesk/core/xml/RpcClient",
      {
        dependencies: [Builder.Default, Parser.Default],
        effect: (path: string) =>
          Effect.gen(function* () {
            const { build } = yield* Builder;
            const { parse } = yield* Parser;

            const request = <
              TMethodName extends string,
              TValues extends Array<Schema.Schema.Any>,
            >(
              methodName: TMethodName,
              values: {
                [TKey in keyof TValues]: SchemaAndValue<TValues[TKey]>;
              },
              parseOptions?: ParseOptions,
            ) => {
              const encode = Schema.encodeUnknown(
                Schema.String.pipe(
                  Schema.transformOrFail(
                    Schema.Struct({
                      methodCall: Schema.Struct({
                        methodName: Schema.Literal(methodName),
                        params: Schema.Struct({
                          param: Schema.Tuple(
                            ...values.map(Struct.get("schema")),
                          ) as Schema.Tuple<{
                            [TKey in keyof TValues]: TValues[TKey];
                          }>,
                        }),
                      }),
                    }),
                    {
                      strict: true,
                      decode: (text, _, ast) =>
                        ParseResult.fail(
                          new ParseResult.Forbidden(
                            ast,
                            text,
                            "Not implemented",
                          ),
                        ),
                      encode: (input, _, ast) =>
                        build(input).pipe(
                          Effect.mapError(
                            (e) => new ParseResult.Type(ast, input, e.message),
                          ),
                        ),
                    },
                  ),
                ),
                parseOptions,
              );

              return encode({
                methodCall: {
                  methodName,
                  params: { param: values.map(Struct.get("value")) },
                },
              }).pipe(
                Effect.mapError((error) =>
                  HttpBody.HttpBodyError({ _tag: "SchemaError", error }),
                ),
                Effect.map((body) =>
                  HttpClientRequest.post(path).pipe(
                    HttpClientRequest.bodyText(body, "application/xml"),
                  ),
                ),
              );
            };

            const response =
              <TType, TEncoded, TContext>(
                SuccessResponse: Schema.Schema<TType, TEncoded, TContext>,
                parseOptions?: ParseOptions,
              ) =>
              (response: HttpClientResponse) =>
                response.text.pipe(
                  Effect.flatMap(
                    Schema.decode(
                      Schema.String.pipe(
                        Schema.transformOrFail(
                          Schema.Union(SuccessResponse, FaultResponse),
                          {
                            strict: true,
                            decode: (text, _, ast) =>
                              parse<TEncoded | typeof FaultResponse.Encoded>(
                                text,
                              ).pipe(
                                Effect.mapError(
                                  (e) =>
                                    new ParseResult.Type(ast, text, e.message),
                                ),
                              ),
                            encode: (output, _, ast) =>
                              ParseResult.fail(
                                new ParseResult.Forbidden(
                                  ast,
                                  output,
                                  "Not implemented",
                                ),
                              ),
                          },
                        ),
                      ),
                      parseOptions,
                    ),
                  ),
                  Effect.flatMap((output) =>
                    output instanceof FaultError
                      ? Effect.fail(output)
                      : Effect.succeed(output),
                  ),
                );

            return { request, response } as const;
          }),
      },
    ) {}
  }
}
