import * as HttpApi from "effect/unstable/httpapi/HttpApi";

import { AuthApi } from "./groups/auth";
import { SpaApi } from "./groups/spa";

export class Bff extends HttpApi.make("bff").add(AuthApi.Group).add(SpaApi.Group) {}
