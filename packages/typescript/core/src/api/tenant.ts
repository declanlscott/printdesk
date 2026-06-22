import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import { AccessControl } from "../access-control";
import { ActorsContract } from "../actors/contract";
import { InfraContract } from "../infra/contract";
import { LicensesContract } from "../licenses/contract";
import { OauthContract } from "../oauth/contract";
import { TenantsContract } from "../tenants/contract";

export namespace TenantApi {
  export class RegistrationGroup extends HttpApiGroup.make("TenantRegistration")
    .add(
      HttpApiEndpoint.post("register", "/", {
        payload: TenantsContract.RegistrationPayload,
        success: TenantsContract.RegistrationSuccess,
        error: [
          ActorsContract.ForbiddenActorError,
          AccessControl.AccessDeniedError,
          LicensesContract.NoSuchLicenseError,
          LicensesContract.LicenseKeyConflictError,
          TenantsContract.TenantSlugConflictError,
          OauthContract.ClientCredentialsError,
          InfraContract.InputError,
          HttpApiError.InternalServerError,
        ],
      }),
    )
    .prefix("/tenant/registration") {}

  export class SetupGroup extends HttpApiGroup.make("TenantSetup")
    .add(
      HttpApiEndpoint.post("setup", "/", {
        payload: TenantsContract.SetupPayload,
        success: TenantsContract.SetupSuccess,
        error: [
          ActorsContract.ForbiddenActorError,
          InfraContract.OutputError,
          InfraContract.NotDeployedError,
          TenantsContract.UnexpectedPapercutApiAuthTokenPayloadError,
          HttpApiError.InternalServerError,
        ],
      }),
    )
    .prefix("/tenant/setup") {}
}
