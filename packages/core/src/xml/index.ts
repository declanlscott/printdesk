import { XMLBuilder, XMLParser } from "fast-xml-parser";

export namespace Xml {
  export const Builder = XMLBuilder;
  export type Builder = XMLBuilder;

  export const Parser = XMLParser;
  export type Parser = XMLParser;
}
