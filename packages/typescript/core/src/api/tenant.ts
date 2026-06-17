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
  export const registration = HttpApiEndpoint.post("registration", "/registration", {
    payload: TenantsContract.RegistrationPayload,
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
    success: TenantsContract.RegistrationSuccess,
  });

  export class Group extends HttpApiGroup.make("tenant").add(registration).prefix("/tenant") {}
}
