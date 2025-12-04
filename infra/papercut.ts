import { Constants } from "@printdesk/core/utils/constants";

import { identityProviders } from "./auth";
import { cloudfrontPrivateKey, cloudfrontPublicKey } from "./cdn";
import { dsqlCluster } from "./db";
import { domains, tenantDomains } from "./dns";
import { tenantRoles } from "./iam";
import * as lib from "./lib";
import {
  appData,
  aws_,
  headerKeys,
  resourceFileName,
  resourcePrefix,
} from "./misc";
import { repository } from "./storage";
import { injectLinkables, normalizePath } from "./utils";

export const papercutServer = new sst.Linkable("PapercutServer", {
  properties: {
    paths: {
      prefix: Constants.PAPERCUT_SERVER_PATH_PREFIX,
      webServicesApi: Constants.PAPERCUT_WEB_SERVICES_API_PATH,
    },
  },
});

const papercutTailgatePath = normalizePath(
  "packages/go/services/papercut-tailgate",
);

export const papercutTailgateResourceCiphertext = new lib.Ciphertext(
  "PapercutTailgateResourceCiphertext",
  {
    plaintext: $jsonStringify(
      injectLinkables(
        resourcePrefix,
        appData,
        aws_,
        headerKeys,
        papercutServer,
        tenantDomains,
      ),
    ),
    writeToFile: normalizePath(resourceFileName, papercutTailgatePath),
  },
);

export const papercutTailgateSstKeyParameter = new aws.ssm.Parameter(
  "PapercutTailgateSstKey",
  {
    name: `/${$app.name}/${$app.stage}/papercut-tailgate/sst-key`,
    type: aws.ssm.ParameterType.SecureString,
    value: papercutTailgateResourceCiphertext.encryptionKey,
  },
);

export const papercutTailgateImage = new awsx.ecr.Image(
  "PapercutTailgateImage",
  {
    repositoryUrl: repository.url,
    context: papercutTailgatePath,
    platform: "linux/arm64",
    imageTag: "latest",
  },
  { dependsOn: [papercutTailgateResourceCiphertext] },
);

export const papercutSync = new lib.aws.Function("PapercutSync", {
  handler: "packages/functions/src/papercut-sync.handler",
  timeout: "20 seconds",
  link: [
    appData,
    aws_,
    cloudfrontPublicKey,
    cloudfrontPrivateKey,
    domains,
    dsqlCluster,
    identityProviders,
    tenantDomains,
    tenantRoles,
  ],
});

export const invoicesProcessor = new lib.aws.Function("InvoicesProcessor", {
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
        $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:role/*`,
      ],
    },
  ],
});
