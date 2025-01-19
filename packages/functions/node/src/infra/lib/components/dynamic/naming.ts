// Modified from https://github.com/sst/sst/blob/a3fd8fa92d559c91b89731faa6a9b843c60f95af/platform/src/components/naming.ts by SST

import crypto from "crypto";

import * as pulumi from "@pulumi/pulumi";

export function logicalName(name: string) {
  name = name.replace(/[^a-zA-Z0-9]/g, "");

  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function physicalName(maxLength: number, name: string, suffix = "") {
  // This function does the following:
  // - Removes all non-alphanumeric characters
  // - Prefixes the name with the project and stack names
  // - Truncates the name if it's too long

  name = name.replace(/[^a-zA-Z0-9]/g, "");

  const prefixedName = (() => {
    const L = maxLength - suffix.length;
    const project = pulumi.getProject();
    const stack = pulumi.getStack();
    const projectLen = project.length;
    const stackLen = stack.length;
    const nameLen = name.length;

    if (projectLen + stackLen + nameLen + 2 <= L)
      return `${project}-${stack}-${name}`;

    if (stackLen + nameLen + 1 <= L) {
      const projectTruncated = project.substring(0, L - stackLen - nameLen - 2);

      return projectTruncated === ""
        ? `${project}-${name}`
        : `${projectTruncated}-${stack}-${name}`;
    }

    const stackTruncated = stack.substring(0, Math.max(8, L - nameLen - 1));
    const nameTruncated = name.substring(0, L - stackTruncated.length - 1);

    return `${stackTruncated}-${nameTruncated}`;
  })();

  return `${prefixedName}${suffix}`;
}

export function hashNumberToPrettyString(number: number, length: number) {
  const charLength = PRETTY_CHARS.length;
  let hash = "";
  while (number > 0) {
    hash = PRETTY_CHARS[number % charLength] + hash;
    number = Math.floor(number / charLength);
  }

  // Padding with 's'
  hash = hash.slice(0, length);
  while (hash.length < length) {
    hash = "s" + hash;
  }

  return hash;
}

export function hashStringToPrettyString(str: string, length: number) {
  const hash = crypto.createHash("sha256");
  hash.update(str);
  const num = Number("0x" + hash.digest("hex").substring(0, 16));
  return hashNumberToPrettyString(num, length);
}

export const PRETTY_CHARS = "abcdefhkmnorstuvwxz";
