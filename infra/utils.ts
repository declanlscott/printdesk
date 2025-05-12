import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { Link } from "~/.sst/platform/src/components/link";

export const normalizePath = (path: string, root = $cli.paths.root) =>
  join(root, path);

export const injectLinkables = (
  prefix: string,
  ...linkables: Array<Link.Linkable>
) =>
  Link.getProperties(linkables).apply((properties) =>
    Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [
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
