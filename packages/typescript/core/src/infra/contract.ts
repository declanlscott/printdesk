import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import * as HttpServerRespondable from "effect/unstable/http/HttpServerRespondable";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

import { AttributesContract } from "../attributes/contract";
import { PapercutContract } from "../papercut/contract";
import { Constants } from "../utils/constants";

export namespace InfraContract {
  export class InputItem extends Schema.Class<InputItem>("InputItem")({
    [Constants.DYNAMO_KEYS.PK]: AttributesContract.TenantIdFromString,
    [Constants.DYNAMO_KEYS.SK]: AttributesContract.InfraInput,
    [Constants.DYNAMO_KEYS.GSI1_PK]: AttributesContract.TenantDeploymentIdFromString,
    [Constants.DYNAMO_KEYS.GSI1_SK]: AttributesContract.InfraInput,
    papercutConfig: PapercutContract.Config,
    updatedAt: Schema.DateTimeUtcFromString.pipe(Schema.withConstructorDefault(DateTime.now)),
  }) {}

  export const InputKey = InputItem.mapFields(
    Struct.pick([Constants.DYNAMO_KEYS.PK, Constants.DYNAMO_KEYS.SK]),
  );

  export class InputError
    extends Schema.TaggedErrorClass<InputError>()(
      "InfraInputError",
      { cause: Schema.Defect() },
      { httpApiStatus: 500 },
    )
    implements HttpServerRespondable.Respondable
  {
    public [HttpServerRespondable.symbol] = () =>
      HttpServerResponse.schemaJson(InputError)(this, { status: 500 });
  }

  export class OutputItem extends Schema.Class<OutputItem>("OutputItem")({
    [Constants.DYNAMO_KEYS.PK]: AttributesContract.TenantIdFromString,
    [Constants.DYNAMO_KEYS.SK]: AttributesContract.InfraOutput,
    [Constants.DYNAMO_KEYS.GSI1_PK]: AttributesContract.TenantDeploymentIdFromString,
    [Constants.DYNAMO_KEYS.GSI1_SK]: AttributesContract.InfraOutput,
    papercutApiTunnelId: Schema.String.pipe(Schema.NullOr),
    deployedAt: Schema.DateTimeUtcFromString,
  }) {}
}
