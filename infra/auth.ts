import { dsqlCluster } from "./db";
import { authFqdn, fqdn } from "./dns";

const oauthAppName =
  $app.stage === "production"
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

export const entraIdApplicationIServicePrincipal = new azuread.ServicePrincipal(
  "EntraIdApplicationServicePrincipal",
  { clientId: entraIdApplication.clientId },
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
    scopeIds: [
      "openid",
      "profile",
      "email",
      "offline_access",
      "User.Read",
      "User.ReadBasic.All",
    ].map((scope) => graphServicePrincipal.oauth2PermissionScopeIds[scope]),
    roleIds: ["User.ReadBasic.All"].map(
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

export const auth = new sst.aws.Auth("Auth", {
  authorizer: {
    handler: "packages/functions/node/src/authorizer.handler",
    link: [dsqlCluster, oauth2],
    architecture: "arm64",
    runtime: "nodejs22.x",
  },
  domain: {
    name: authFqdn,
    dns: sst.cloudflare.dns(),
  },
});

export const entraIdApplicationRedirectUris =
  new azuread.ApplicationRedirectUris("EntraIdApplicationRedirectUris", {
    applicationId: entraIdApplication.id,
    type: "Web",
    redirectUris: [$interpolate`${auth.url}/callback`],
  });
