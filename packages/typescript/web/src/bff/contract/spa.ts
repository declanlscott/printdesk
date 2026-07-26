import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

export namespace Spa {
  export class Group extends HttpApiGroup.make("Spa").add(HttpApiEndpoint.get("assets", "*")) {}

  export class Api extends HttpApi.make("SpaApi").add(Group) {}
}
