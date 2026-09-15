import * as Context from "effect/Context";
import * as Struct from "effect/Struct";

import type { IamRoleShape } from "../iam";

export class AppsyncPublisherRole extends Context.Service<AppsyncPublisherRole, IamRoleShape>()(
  "@printdesk/core/aws/AppsyncPublisherRole",
) {
  public static readonly arn = this.use(Struct.get("arn"));
}

export class AppsyncSubscriberRole extends Context.Service<AppsyncSubscriberRole, IamRoleShape>()(
  "@printdesk/core/aws/AppsyncSubscriberRole",
) {
  public static readonly arn = this.use(Struct.get("arn"));
}
