import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { SharedAccountWorkflowsPolicies } from ".";
import { AccessControl } from "../../../../access-control";
import { PoliciesContract } from "../../../../policies/contract";
import { SharedAccountWorkflowsContract } from "../../../contracts";
import { SharedAccountWorkflowsReadRepository } from "../read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* SharedAccountWorkflowsReadRepository;

  const isCustomerAuthorized = PoliciesContract.makePolicy(
    SharedAccountWorkflowsContract.isCustomerAuthorized,
    {
      make: ({ id, customerId }) =>
        AccessControl.userPolicy({ name: SharedAccountWorkflowsContract.Table.name, id }, (user) =>
          repository
            .findActiveCustomerAuthorized(customerId.pipe(Option.getOrElse(() => user.id)), id)
            .pipe(
              Effect.map(() => true),
              Effect.catchTag("NoSuchElementError", () => Effect.succeed(false)),
            ),
        ),
    },
  );

  const isManagerAuthorized = PoliciesContract.makePolicy(
    SharedAccountWorkflowsContract.isManagerAuthorized,
    {
      make: ({ id, managerId }) =>
        AccessControl.userPolicy({ name: SharedAccountWorkflowsContract.Table.name, id }, (user) =>
          repository
            .findActiveManagerAuthorized(managerId.pipe(Option.getOrElse(() => user.id)), id)
            .pipe(
              Effect.map(() => true),
              Effect.catchTag("NoSuchElementError", () => Effect.succeed(false)),
            ),
        ),
    },
  );

  return { isCustomerAuthorized, isManagerAuthorized } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountWorkflowsPolicies));
