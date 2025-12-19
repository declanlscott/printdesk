import { identityProviders, issuer } from "./auth";
import {
  cloudfrontPrivateKey,
  cloudfrontPublicKey,
  router,
  routerSecret,
} from "./cdn";
import { dsqlCluster } from "./db";
import { domains, tenantDomains } from "./dns";
import {
  realtimePublisherRole,
  realtimePublisherRoleExternalId,
  realtimeSubscriberRole,
  realtimeSubscriberRoleExternalId,
  tenantRoles,
} from "./iam";
import * as lib from "./lib/components";
import { appData, aws_, resourceFileName, resourcePrefix } from "./misc";
import { appsyncEventApi } from "./realtime";
import { infraQueue, repository, temporaryBucket } from "./storage";
import { injectLinkables, normalizePath } from "./utils";

// export const api = new lib.aws.lambda.Function("Api", {
//   handler: "packages/functions/node/src/api/index.handler",
//   url: {
//     router: {
//       instance: router,
//       domain: domains.properties.api,
//     },
//   },
//   link: [
//     appData,
//     appsyncEventApi,
//     aws_,
//     cloudfrontPublicKey,
//     cloudfrontPrivateKey,
//     domains,
//     dsqlCluster,
//     identityProviders,
//     infraQueue,
//     issuer,
//     realtimePublisherRole,
//     realtimePublisherRoleExternalId,
//     realtimeSubscriberRole,
//     realtimeSubscriberRoleExternalId,
//     routerSecret,
//     temporaryBucket,
//     tenantDomains,
//     tenantRoles,
//   ],
//   permissions: [
//     {
//       actions: ["sts:AssumeRole"],
//       resources: [
//         $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:role/*`,
//       ],
//     },
//   ],
// });

const tenantApiFunctionPath = normalizePath("packages/functions/tenant-api");

export const tenantApiFunctionResourceCiphertext = new lib.Ciphertext(
  "TenantApiFunctionResourceCiphertext",
  {
    plaintext: $jsonStringify(
      injectLinkables(
        resourcePrefix,
        appData,
        aws_,
        routerSecret,
        tenantDomains
      )
    ),
    writeToFile: normalizePath(resourceFileName, tenantApiFunctionPath),
  }
);

export const tenantApiFunctionImage = new awsx.ecr.Image(
  "TenantApiFunctionImage",
  {
    repositoryUrl: repository.url,
    context: tenantApiFunctionPath,
    platform: "linux/arm64",
    imageTag: "latest",
  },
  { dependsOn: [tenantApiFunctionResourceCiphertext] }
);

export const outputs = {
  // api: api.url,
};
