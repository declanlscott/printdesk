import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

export namespace SpaApi {
  export const assets = HttpApiEndpoint.get("assets", "*");

  export class Group extends HttpApiGroup.make("spa").add(assets) {}
}
