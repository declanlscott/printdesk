import * as Schema from "effect/Schema";
import * as Tuple from "effect/Tuple";

import { PolicyHandlers } from "../handlers/policies";

export namespace PoliciesContract {
  export const QueryParameters = PolicyHandlers.registry.Schema;

  export const QuerySuccess = QueryParameters.mapMembers(
    Tuple.map(Schema.fieldsAssign({ output: Schema.Boolean })),
  );
}
