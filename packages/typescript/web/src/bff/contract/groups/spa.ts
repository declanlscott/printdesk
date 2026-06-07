import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

export namespace SpaApi {
  export const assets = HttpApiEndpoint.get("assets", "*", {
    error: [HttpApiError.InternalServerError],
  });

  export class Group extends HttpApiGroup.make("spa").add(assets) {}
}
