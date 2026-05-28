import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Builder as XMLBuilder } from "fast-xml-builder";
import { XMLParser } from "fast-xml-parser";

import { XmlContract } from "./contracts";

export namespace Xml {
  export class Builder extends Context.Service<Builder>()("@printdesk/core/xml/Builder", {
    make: Effect.gen(function* () {
      const client = yield* Effect.try({
        try: () => new XMLBuilder(),
        catch: (error) => new XmlContract.BuilderError({ cause: error }),
      });

      const build = <TInput>(input: TInput) =>
        Effect.try({
          try: () => client.build(input),
          catch: (error) => new XmlContract.BuilderError({ cause: error }),
        });

      return { build } as const;
    }),
  }) {
    public static readonly layer = this.make.pipe(Layer.effect(this));
  }

  export class Parser extends Context.Service<Parser>()("@printdesk/core/xml/Parser", {
    make: Effect.gen(function* () {
      const client = yield* Effect.try({
        try: () => new XMLParser(),
        catch: (error) => new XmlContract.ParserError({ cause: error }),
      });

      const parse = <TOutput>(xmlData: string | Uint8Array) =>
        Effect.try({
          try: () => client.parse(xmlData) as TOutput,
          catch: (error) => new XmlContract.ParserError({ cause: error }),
        });

      return { parse } as const;
    }),
  }) {
    public static readonly layer = this.make.pipe(Layer.effect(this));
  }
}
