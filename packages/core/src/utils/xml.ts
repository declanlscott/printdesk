import { XMLBuilder, XMLParser } from "fast-xml-parser";

import { Utils } from ".";

export type XmlContext = {
  builder: XMLBuilder;
  parser: XMLParser;
};
export const XmlContext = Utils.createContext<XmlContext>("Xml");

export const useXml = XmlContext.use;

export const withXml = <TCallback extends () => ReturnType<TCallback>>(
  callback: TCallback,
) =>
  XmlContext.with(
    () => ({
      builder: new Xml.Builder(),
      parser: new Xml.Parser({ preserveOrder: true }),
    }),
    callback,
  );

export namespace Xml {
  export const Builder = XMLBuilder;
  export type Builder = XMLBuilder;

  export const Parser = XMLParser;
  export type Parser = XMLParser;
}
