// oxlint-disable typescript/no-non-null-assertion
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { Constants } from "@printdesk/core/utils/constants";

import { Link } from "~/sst/link";

export const isDevMode = $dev;
export const isProdStage = $app.stage === "prod";

export const aws_ = new sst.Linkable("Aws", {
  properties: {
    account: { id: aws.getCallerIdentityOutput().accountId },
    region: $app.providers!.aws.region as string,
  },
});

export const cloudflare_ = new sst.Linkable("Cloudflare", {
  properties: {
    account: { id: cloudflare.getAccountsOutput().results[0]!.id },
    apiToken: $util.secret($app.providers!.cloudflare.apiToken as string),
  },
});

export const environment = new sst.Linkable("Environment", {
  properties: {
    isDevMode,
    isProdStage,
  },
});

export const nanoId = new sst.Linkable("NanoId", {
  properties: {
    alphabet: Constants.NANOID_ALPHABET,
    length: Constants.NANOID_LENGTH,
    pattern: Constants.NANOID_REGEX.source,
  },
});

export const snsTopicEmail = new sst.Secret("SnsTopicEmail");

export const injectLinkables = (prefix: string, ...linkables: Array<$util.Input<unknown>>) =>
  Link.getProperties(linkables).apply((properties) =>
    Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [`${prefix}${key}`, JSON.stringify(value)]),
    ),
  );

export function hashFiles(path: string) {
  const files = readdirSync(path);
  const hashes: Array<string> = [];

  for (const file of files) {
    const filePath = join(path, file);
    const stats = statSync(filePath);

    if (stats.isFile())
      hashes.push(
        `${file}:${createHash("sha256")
          .update(new Uint8Array(readFileSync(filePath)))
          .digest("hex")}`,
      );
    else if (stats.isDirectory()) hashes.push(`${file}:${hashFiles(filePath)}`);
  }

  return createHash("sha256").update(hashes.toSorted().join("|")).digest("hex");
}
