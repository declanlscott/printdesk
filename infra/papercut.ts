import { Constants } from "@printdesk/core/utils/constants";

import { identityProviders } from "./auth";
import { cloudfrontPrivateKey, cloudfrontPublicKey, routerSecret } from "./cdn";
import { dsqlCluster } from "./db";
import { domains, tenantDomains } from "./dns";
import { tenantRoles } from "./iam";
import * as lib from "./lib/components";
import {
  appData,
  aws_,
  headerNames,
  resourceFileName,
  resourcePrefix,
} from "./misc";
import { repository } from "./storage";
import { injectLinkables, normalizePath } from "./utils";

export const papercut = new sst.Linkable("Papercut", {
  properties: {
    servicePath: Constants.PAPERCUT_SERVICE_PATH,
    webServicesPath: Constants.PAPERCUT_WEB_SERVICES_PATH,
  },
});

const papercutGatewayPath = normalizePath("packages/services/papercut-gateway");

export const papercutGatewayResourceCiphertext = new lib.Ciphertext(
  "PapercutGatewayResourceCiphertext",
  {
    plaintext: $jsonStringify(
      injectLinkables(
        resourcePrefix,
        appData,
        aws_,
        headerNames,
        papercut,
        routerSecret,
        tenantDomains
      )
    ),
    writeToFile: normalizePath(resourceFileName, papercutGatewayPath),
  }
);

export const papercutGatewaySstKeyParameter = new aws.ssm.Parameter(
  "PapercutGatewaySstKey",
  {
    name: `/${$app.name}/${$app.stage}/papercut-gateway/sst-key`,
    type: aws.ssm.ParameterType.SecureString,
    value: papercutGatewayResourceCiphertext.encryptionKey,
  }
);

export const papercutGatewayImage = new awsx.ecr.Image(
  "PapercutGatewayImage",
  {
    repositoryUrl: repository.url,
    context: papercutGatewayPath,
    platform: "linux/arm64",
    imageTag: "latest",
  },
  { dependsOn: [papercutGatewayResourceCiphertext] }
);

// export const papercutSync = new lib.aws.lambda.Function("PapercutSync", {
//   handler: "packages/functions/src/papercut-sync.handler",
//   timeout: "20 seconds",
//   link: [
//     appData,
//     aws_,
//     cloudfrontPublicKey,
//     cloudfrontPrivateKey,
//     domains,
//     dsqlCluster,
//     identityProviders,
//     tenantDomains,
//     tenantRoles,
//   ],
// });

export const invoicesProcessor = new lib.aws.lambda.Function(
  "InvoicesProcessor",
  {
    handler: "packages/functions/src/invoices-processor.handler",
    timeout: "20 seconds",
    link: [
      appData,
      aws_,
      cloudfrontPublicKey,
      cloudfrontPrivateKey,
      domains,
      dsqlCluster,
      tenantDomains,
      tenantRoles,
    ],
    permissions: [
      {
        actions: ["sts:AssumeRole"],
        resources: [
          $interpolate`arn:aws:iam::${
            aws.getCallerIdentityOutput().accountId
          }:role/*`,
        ],
      },
    ],
  }
);
