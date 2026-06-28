import * as Schema from "effect/Schema";

import { PapercutContract } from "../papercut/contract";

export namespace ConfigContract {
  export class SetPapercutApiAuthTokenPayload extends Schema.Class<SetPapercutApiAuthTokenPayload>(
    "SetPapercutApiAuthTokenPayload",
  )({ token: PapercutContract.ApiAuthToken }) {}
}
