import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import * as Struct from "effect/Struct";
import * as HttpBody from "effect/unstable/http/HttpBody";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import { Xml } from ".";
import { XmlRpcContract } from "./contracts";

import type { ParseOptions } from "effect/SchemaAST";
import type { HttpClientResponse } from "effect/unstable/http/HttpClientResponse";
import type { SchemaAndValue } from "../utils";

export namespace XmlRpc {
  export const boolean = (boolean: boolean): SchemaAndValue<typeof XmlRpcContract.Boolean> => ({
    schema: XmlRpcContract.Boolean,
    value: XmlRpcContract.Boolean.make({ value: { boolean } }),
  });

  export const double = (double: number): SchemaAndValue<typeof XmlRpcContract.Double> => ({
    schema: XmlRpcContract.Double,
    value: XmlRpcContract.Double.make({ value: { double } }),
  });

  export const int = (int: number): SchemaAndValue<typeof XmlRpcContract.Int> => ({
    schema: XmlRpcContract.Int,
    value: XmlRpcContract.Int.make({ value: { int } }),
  });

  export const string = (string: string): SchemaAndValue<typeof XmlRpcContract.String> => ({
    schema: XmlRpcContract.String,
    value: XmlRpcContract.String.make({ value: { string } }),
  });

  export const stringArray = (
    strings: Array<string>,
  ): SchemaAndValue<typeof XmlRpcContract.StringArray> => ({
    schema: XmlRpcContract.StringArray,
    value: XmlRpcContract.StringArray.make({
      value: { array: { data: { value: strings.map((string) => ({ string })) } } },
    }),
  });

  export class XmlRpc extends Context.Service<XmlRpc>()("@printdesk/core/xml/rpc/XmlRpc", {
    make: Effect.fn(function* (path: string) {
      const { build } = yield* Xml.Builder;
      const { parse } = yield* Xml.Parser;

      const request = Effect.fn("XmlRpc.request")(function* <
        TMethodName extends string,
        TSchemas extends Array<Schema.Encoder<any>>,
      >(
        methodName: TMethodName,
        schemas: { [TKey in keyof TSchemas]: SchemaAndValue<TSchemas[TKey]> },
        parseOptions?: ParseOptions,
      ) {
        const encode = Schema.String.pipe(
          Schema.decodeTo(
            Schema.Struct({
              methodCall: Schema.Struct({ methodName: Schema.Literal(methodName) }),
              params: Schema.Struct({ param: Schema.Tuple(schemas.map(Struct.get("schema"))) }),
            }),
            {
              decode: SchemaGetter.forbidden(() => "Not implemented"),
              encode: SchemaGetter.transformOrFail((input) =>
                build(input).pipe(
                  Effect.mapError(
                    (e) => new SchemaIssue.InvalidValue(Option.some(input), { message: e.message }),
                  ),
                ),
              ),
            },
          ),
          Schema.encodeUnknownEffect,
        );

        return yield* encode(
          { methodCall: { methodName, params: { param: schemas.map(Struct.get("value")) } } },
          parseOptions,
        ).pipe(
          Effect.mapError((error) => new HttpBody.HttpBodyError({ reason: error, cause: error })),
          Effect.map((body) =>
            HttpClientRequest.post(path).pipe(HttpClientRequest.bodyText(body, "application/xml")),
          ),
        );
      });

      function response<TType, TEncoded, TServices>(
        SuccessResponse: Schema.Codec<TType, TEncoded, TServices>,
        parseOptions?: ParseOptions,
      ) {
        const decode = Schema.String.pipe(
          Schema.decodeTo(Schema.Union([SuccessResponse, XmlRpcContract.FaultResponse]), {
            decode: SchemaGetter.transformOrFail((text) =>
              parse<TEncoded | typeof XmlRpcContract.FaultResponse.Encoded>(text).pipe(
                Effect.mapError(
                  (e) => new SchemaIssue.InvalidValue(Option.some(text), { message: e.message }),
                ),
              ),
            ),
            encode: SchemaGetter.forbidden(() => "Not implemented"),
          }),
          Schema.decodeEffect,
        );

        return Effect.fn("XmlRpc.response")((response: HttpClientResponse) =>
          response.text.pipe(
            Effect.flatMap((text) => decode(text, parseOptions)),
            Effect.flatMap((output) =>
              output instanceof XmlRpcContract.FaultError
                ? Effect.fail(output)
                : Effect.succeed(output),
            ),
          ),
        );
      }

      return { request, response } as const;
    }),
  }) {
    public static layer(...args: Parameters<typeof XmlRpc.make>) {
      return this.make(...args).pipe(Layer.effect(this));
    }
  }
}
