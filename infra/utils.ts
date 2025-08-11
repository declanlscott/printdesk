import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { Constants } from "@printdesk/core/utils/constants";
import { Iterable, Record, Struct } from "effect";

import { Link } from "~/.sst/platform/src/components/link";

export const normalizePath = (path: string, root = $cli.paths.root) =>
  join(root, path);

export const injectLinkables = (
  prefix: string,
  ...linkables: Array<$util.Input<unknown>>
) =>
  Link.getProperties(linkables).apply((properties) =>
    Record.fromEntries(
      Iterable.map(Struct.entries(properties), ([key, value]) => [
        `${prefix}${key}`,
        JSON.stringify(value),
      ]),
    ),
  );

export function calculateHash(dirPath: string) {
  const files = readdirSync(dirPath);
  const hashes: Array<string> = [];

  for (const file of files) {
    const filePath = normalizePath(file, dirPath);
    const stats = statSync(filePath);

    if (stats.isFile())
      hashes.push(
        `${file}:${createHash("sha256")
          .update(new Uint8Array(readFileSync(filePath)))
          .digest("hex")}`,
      );
    else if (stats.isDirectory())
      hashes.push(`${file}:${calculateHash(filePath)}`);
  }

  return createHash("sha256").update(hashes.sort().join("|")).digest("hex");
}

export const buildNameTemplate = <TIdentifier extends string>(
  identifier: TIdentifier,
) =>
  `pd-${$app.stage}-${Constants.TENANT_ID_PLACEHOLDER}-${identifier}` as const;
