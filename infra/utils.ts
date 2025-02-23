import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { Resource } from "sst";

export const tenantIdPlaceholder = "{{tenant_id}}";

export const normalizePath = (path: string, root = $cli.paths.root) =>
  join(root, path);

export function injectLinkables(
  linkables: {
    [TLogicalName in keyof Resource]?: {
      getSSTLink: () => sst.Definition<
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Record<keyof Omit<Resource[TLogicalName], "type">, any>
      >;
    };
  },
  prefix = "",
) {
  const vars: Record<string, $util.Output<string>> = {};
  for (const logicalName in linkables) {
    const value =
      linkables[logicalName as keyof Resource]?.getSSTLink().properties;

    if (value) vars[`${prefix}${logicalName}`] = $jsonStringify($output(value));
  }

  return vars;
}

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
