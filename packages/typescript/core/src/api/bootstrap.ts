import * as Schema from "effect/Schema";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiSchema from "effect/unstable/httpapi/HttpApiSchema";

import { BootstrapContract } from "../bootstrap/contract";
import { LicensesContract } from "../licenses/contract";

export namespace Bootstrap {
  export class Group extends HttpApiGroup.make("Bootstrap").add(
    HttpApiEndpoint.post("bootstrap", "/", {
      payload: BootstrapContract.Payload,
      success: Schema.Void.pipe(HttpApiSchema.status(202)),
      error: [
        LicensesContract.LicenseConflictError,
        LicensesContract.InvalidLicenseKeyError,
        LicensesContract.NoSuchLicenseError,
      ],
    }),
  ) {}

  export class Api extends HttpApi.make("BootstrapApi").add(Group) {}
}
