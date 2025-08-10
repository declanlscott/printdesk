import { Context } from "effect";

import type { AuthContract } from "./contract";

export namespace Auth {
  export class Session extends Context.Tag("@printdesk/core/auth/Session")<
    Session,
    AuthContract.Session
  >() {}
}
