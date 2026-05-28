import * as Schema from "effect/Schema";

import { AttributesContract } from "../attributes/contract";
import { PapercutContract } from "../papercut/contract";
import { Constants } from "../utils/constants";

export namespace InfraContract {
  export class InputItem extends Schema.Class<InputItem>("InputItem")({
    [Constants.DYNAMO_KEYS.PK]: AttributesContract.TenantIdFromString,
    [Constants.DYNAMO_KEYS.SK]: AttributesContract.InfraInput,
    papercutConfig: PapercutContract.Config,
    updatedAt: Schema.DateTimeUtc,
  }) {}

  export class OutputItem extends Schema.Class<OutputItem>("OutputItem")({
    [Constants.DYNAMO_KEYS.PK]: AttributesContract.TenantIdFromString,
    [Constants.DYNAMO_KEYS.SK]: AttributesContract.InfraOutput,
    papercutApiTunnelId: Schema.String.pipe(Schema.NullOr),
    deployedAt: Schema.DateTimeUtc,
  }) {}
}
