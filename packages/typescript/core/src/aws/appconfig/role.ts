import * as Context from "effect/Context";
import * as Struct from "effect/Struct";

import type { IamRoleShape } from "../iam";

export class AppconfigRole extends Context.Service<AppconfigRole, IamRoleShape>()(
  "@printdesk/core/aws/AppconfigRole",
) {
  public static readonly arn = this.use(Struct.get("arn"));
}
