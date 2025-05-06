import { Constants } from "@printdesk/core/utils/constants";

import { env } from "~/.sst/platform/src/components";
import { dsqlCluster } from "./db";
import { fqdn } from "./dns";
import { aws_, isProdStage } from "./misc";
import { router, routerSecret } from "./router";

const oauthAppName = isProdStage
  ? $app.name.charAt(0).toUpperCase() + $app.name.slice(1)
  : `${$app.name}-${$app.stage}`;

export const entraIdApplication = new azuread.ApplicationRegistration(
  "EntraIdApplicationRegistration",
  {
    displayName: oauthAppName,
    signInAudience: "AzureADMultipleOrgs",
    implicitAccessTokenIssuanceEnabled: true,
    implicitIdTokenIssuanceEnabled: true,
    homepageUrl: $interpolate`https://${fqdn}`,
  },
);

const wellKnown = azuread.getApplicationPublishedAppIds();
const graphAppId = await wellKnown.then(({ result }) => result?.MicrosoftGraph);

const graphServicePrincipal = new azuread.ServicePrincipal(
  "GraphServicePrincipal",
  {
    clientId: graphAppId,
    useExisting: true,
  },
);

export const entraIdApplicationApiAccess = new azuread.ApplicationApiAccess(
  "EntraIdApplicationApiAccess",
  {
    applicationId: entraIdApplication.id,
    apiClientId: graphAppId,
    scopeIds: Constants.ENTRA_ID_OAUTH_SCOPES.map(
      (scope) => graphServicePrincipal.oauth2PermissionScopeIds[scope],
    ),
    roleIds: Constants.ENTRA_ID_APP_ROLES.map(
      (role) => graphServicePrincipal.appRoleIds[role],
    ),
  },
);

export const rotationHours = 24 * 7 * 26; // 6 months
export const clientSecretRotation = new time.Rotating("ClientSecretRotation", {
  rotationHours,
});

export const entraIdClientSecret = new azuread.ApplicationPassword(
  "EntraIdClientSecret",
  {
    applicationId: entraIdApplication.id,
    endDateRelative: `${rotationHours.toString()}h`,
    rotateWhenChanged: {
      rotation: clientSecretRotation.id,
    },
  },
);

// TODO: Google oauth

export const oauth2 = new sst.Linkable("Oauth2", {
  properties: {
    entraId: {
      clientId: entraIdApplication.clientId,
      clientSecret: entraIdClientSecret.value,
    },
  },
});

sst.Linkable.wrap(sst.aws.Auth, () => {
  const url = $interpolate`https://${fqdn}/auth`;

  return {
    properties: { url },
    include: [env({ OPENAUTH_ISSUER: url })],
  };
});

export const auth = new sst.aws.Auth("Auth", {
  issuer: {
    handler: "packages/functions/node/src/issuer.handler",
    link: [aws_, dsqlCluster, oauth2, routerSecret],
    architecture: "arm64",
    runtime: "nodejs22.x",
    url: true,
  },
});
router.route("/auth", auth.url, {
  rewrite: {
    regex: "^/auth/(.*)$",
    to: "/$1",
  },
});

export const entraIdApplicationRedirectUris =
  new azuread.ApplicationRedirectUris("EntraIdApplicationRedirectUris", {
    applicationId: entraIdApplication.id,
    type: "Web",
    redirectUris: [
      $interpolate`https://${fqdn}/auth/${Constants.ENTRA_ID}/callback`,
    ],
  });

export const outputs = {
  auth: auth.getSSTLink().properties.url,
};
