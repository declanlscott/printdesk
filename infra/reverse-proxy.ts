import { Constants } from "@printdesk/core/utils/constants";

import { issuer } from "./auth";
import * as custom from "./custom";
import { configTable } from "./db";
import { domains, zoneId } from "./dns";
import { resourceFileName, resourcePrefix } from "./misc";
import { repository } from "./storage";
import { injectLinkables, normalizePath } from "./utils";

export const reverseProxyWorker = new sst.cloudflare.Worker(
  "ReverseProxyWorker",
  {
    handler: "packages/workers/src/reverse-proxy/index.ts",
    link: [issuer],
    url: false,
  },
);

export const reverseProxyWorkerAuxiliaryBindings =
  new custom.cloudflare.Workers.AuxiliaryBindings(
    "ReverseProxyWorkerAuxiliaryBindings",
    {
      scriptName: reverseProxyWorker.nodes.worker.scriptName,
      bindings: [
        {
          name: Constants.CLOUDFLARE_BINDING_NAMES.RATE_LIMITER,
          type: "ratelimit",
          namespace_id: "1001",
          simple: {
            limit: 100,
            period: 60,
          },
        },
      ],
    },
  );

export const reverseProxyApiRoute = new cloudflare.WorkersRoute(
  "ReverseProxyApiRoute",
  {
    zoneId,
    pattern: $interpolate`${domains.properties.api}/*`,
    script: reverseProxyWorker.nodes.worker.scriptName,
  },
);

export const reverseProxyAuthRoute = new cloudflare.WorkersRoute(
  "ReverseProxyAuthRoute",
  {
    zoneId,
    pattern: $interpolate`${domains.properties.auth}/*`,
    script: reverseProxyWorker.nodes.worker.scriptName,
  },
);

const papercutSecureReverseProxyDir = normalizePath(
  "packages/go/services/papercut-secure-reverse-proxy",
);

export const papercutSecureReverseProxyResourceCiphertext =
  new custom.Ciphertext("PapercutSecureReverseProxyResourceCiphertext", {
    plaintext: $jsonStringify(injectLinkables(resourcePrefix, configTable)),
    writeToFile: normalizePath(resourceFileName, papercutSecureReverseProxyDir),
  });

export const papercutSecureReverseProxyImage = new awsx.ecr.Image(
  "PapercutSecureReverseProxyImage",
  {
    repositoryUrl: repository.url,
    context: papercutSecureReverseProxyDir,
    platform: "linux/arm64",
    imageTag: "latest",
  },
  { dependsOn: [papercutSecureReverseProxyResourceCiphertext] },
);
