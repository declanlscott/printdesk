import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as Schema from "effect/Schema";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

import type { X2jOptions, XmlBuilderOptions } from "fast-xml-parser";

export namespace Xml {
  export class BuildError extends Data.TaggedError("XmlBuildError")<{
    readonly cause: unknown;
  }> {}

  export class Builder extends Effect.Service<Builder>()(
    "@printdesk/core/xml/Builder",
    {
      succeed: (opts?: XmlBuilderOptions) => {
        const client = new XMLBuilder(opts);

        const build = <TStruct extends object>(
          Struct: Schema.Schema<TStruct>,
          struct: TStruct,
        ) =>
          Function.pipe(
            struct,
            Schema.encode(Struct),
            Effect.flatMap((struct) =>
              Effect.try({
                try: () => client.build(struct) as string,
                catch: (error) => new BuildError({ cause: error }),
              }),
            ),
          );

        return { build } as const;
      },
    },
  ) {}

  export class ParseError extends Data.TaggedClass("XmlParseError")<{
    readonly cause: unknown;
  }> {}

  export class Parser extends Effect.Service<Parser>()(
    "@printdesk/core/xml/Parser",
    {
      succeed: (opts?: X2jOptions) => {
        const client = new XMLParser(opts);

        const parse = <TStruct extends object>(
          Struct: Schema.Schema<TStruct>,
          ...props: Parameters<typeof client.parse>
        ) =>
          Effect.try({
            try: () => client.parse(...props) as unknown,
            catch: (error) => new ParseError({ cause: error }),
          }).pipe(Effect.flatMap(Schema.decodeUnknown(Struct)));

        return { parse } as const;
      },
    },
  ) {}
}
