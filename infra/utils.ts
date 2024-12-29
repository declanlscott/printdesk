import { join } from "node:path";

import type { Resource } from "sst";

export const normalizePath = (path: string, root = $cli.paths.root) =>
  join(root, path);

export function injectLinkables(
  linkables: {
    [TKey in keyof Resource]?: $util.Input<Record<string, unknown>>;
  },
  prefix: string,
) {
  const vars: Record<string, $util.Output<string>> = {};
  for (const logicalName in linkables) {
    const value = linkables[logicalName as keyof Resource];

    vars[`${prefix}${logicalName}`] = $jsonStringify($output(value));
  }

  return vars;
}
