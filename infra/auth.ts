import { Constants } from "@printdesk/core/utils/constants";

import { router, routerSecret } from "./cdn";
import { dsqlCluster } from "./db";
import { domains } from "./dns";

const oauthAppName =
  {
    production: $output($app.name.charAt(0).toUpperCase() + $app.name.slice(1)),
    dev: $interpolate`${$app.name}-${$app.stage}`,
  }[$app.stage] ?? $interpolate`${$app.name}-dev-${$app.stage}`;

export const entraIdApplication = new azuread.ApplicationRegistration(
  "EntraIdApplicationRegistration",
  {
    displayName: oauthAppName,
    signInAudience: "AzureADMultipleOrgs",
    implicitAccessTokenIssuanceEnabled: true,
    implicitIdTokenIssuanceEnabled: true,
    homepageUrl: $interpolate`https://${domains.properties.web}`,
  },
);

export const entraIdApplicationRedirectUris =
  new azuread.ApplicationRedirectUris("EntraIdApplicationRedirectUris", {
    applicationId: entraIdApplication.id,
    type: "Web",
    redirectUris: [
      $interpolate`https://${domains.properties.auth}/${Constants.ENTRA_ID}/callback`,
    ],
  });

const graphAppId = azuread
  .getApplicationPublishedAppIdsOutput()
  .result.apply((result) => result.MicrosoftGraph);

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
export const entraIdClientSecretRotation = new time.Rotating(
  "EntraIdClientSecretRotation",
  { rotationHours },
);

export const entraIdClientSecret = new azuread.ApplicationPassword(
  "EntraIdClientSecret",
  {
    applicationId: entraIdApplication.id,
    endDateRelative: `${rotationHours.toString()}h`,
    rotateWhenChanged: {
      rotation: entraIdClientSecretRotation.id,
    },
  },
);

export const identityProviders = new sst.Linkable("IdentityProviders", {
  properties: {
    [Constants.ENTRA_ID]: {
      clientId: entraIdApplication.clientId,
      clientSecret: entraIdClientSecret.value,
    },
    [Constants.GOOGLE]: {
      // TODO: Google oauth
    },
  },
});

export const authTable = new sst.aws.Dynamo("AuthTable", {
  fields: { pk: "string", sk: "string" },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  ttl: "expiry",
});

export const issuer = new sst.aws.Function("Issuer", {
  handler: "packages/functions/node/src/issuer.handler",
  link: [authTable, dsqlCluster, identityProviders, routerSecret],
  environment: {
    OPENAUTH_STORAGE: $jsonStringify({
      type: "dynamo",
      options: { table: authTable.name },
    }),
  },
  url: {
    router: {
      instance: router,
      domain: domains.properties.auth,
    },
    cors: false,
  },
});

export const outputs = {
  issuer: issuer.url,
};
