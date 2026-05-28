import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { SharedAccountWorkflowsReadRepository } from ".";
import { makeReadRepository } from "../../../../database/client/read-repository";
import { SharedAccountCustomerAccessReadRepository } from "../../../../shared-accounts/client/customer-access/read-repository";
import { SharedAccountManagerAccessReadRepository } from "../../../../shared-accounts/client/manager-access/read-repository";
import { SharedAccountWorkflowsContract } from "../../../contracts";

import type {
  SharedAccountCustomerAccessContract,
  SharedAccountManagerAccessContract,
} from "../../../../shared-accounts/contracts";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const base = yield* makeReadRepository(SharedAccountWorkflowsContract.Table);

  const sharedAccountCustomerAccessRepository = yield* SharedAccountCustomerAccessReadRepository;
  const sharedAccountManagerAccessRepository = yield* SharedAccountManagerAccessReadRepository;

  const findActiveCustomerAuthorized = (
    customerId: (typeof SharedAccountCustomerAccessContract.Table.Model.Type)["customerId"],
    id: (typeof SharedAccountWorkflowsContract.Table.Model.Type)["id"],
  ) =>
    base
      .findById(id)
      .pipe(
        Effect.flatMap((workflow) =>
          sharedAccountCustomerAccessRepository.findWhere((access) =>
            access.sharedAccountId === workflow.sharedAccountId && access.customerId === customerId
              ? Result.succeed(workflow)
              : Result.failVoid,
          ),
        ),
      );

  const findActiveManagerAuthorized = (
    managerId: (typeof SharedAccountManagerAccessContract.Table.Model.Type)["managerId"],
    id: (typeof SharedAccountWorkflowsContract.Table.Model.Type)["id"],
  ) =>
    base.findById(id).pipe(
      Effect.flatMap((workflow) =>
        sharedAccountManagerAccessRepository.findWhere((access) =>
          access.sharedAccountId === workflow.sharedAccountId && access.managerId === managerId
            ? Result.succeed(workflow)
            : Result.failVoid,
        ),
      ),
      Effect.map(Array.head),
      Effect.flatMap(Effect.fromOption),
    );

  return {
    ...base,
    findActiveCustomerAuthorized,
    findActiveManagerAuthorized,
  };
});

export const layer = makeService.pipe(Layer.effect(SharedAccountWorkflowsReadRepository));
