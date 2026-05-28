import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { SharedAccountsReadRepository } from ".";
import { makeReadRepository } from "../../../database/client/read-repository";
import { SharedAccountsContract } from "../../contracts";
import { SharedAccountCustomerAccessReadRepository } from "../customer-access/read-repository";
import { SharedAccountCustomerGroupAccessReadRepository } from "../customer-group-access/read-repository";
import { SharedAccountManagerAccessReadRepository } from "../manager-access/read-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const base = yield* makeReadRepository(SharedAccountsContract.Table);

  const customerAccessRepository = yield* SharedAccountCustomerAccessReadRepository;
  const managerAccessRepository = yield* SharedAccountManagerAccessReadRepository;
  const customerGroupAccessRepository = yield* SharedAccountCustomerGroupAccessReadRepository;

  const findActiveAuthorizedCustomerIds = (
    id: (typeof SharedAccountsContract.Table.Model.Type)["id"],
  ) =>
    base
      .findById(id)
      .pipe(
        Effect.flatMap((sharedAccount) =>
          customerAccessRepository.findWhere((access) =>
            access.sharedAccountId === sharedAccount.id && access.deletedAt === null
              ? Result.succeed(access.customerId)
              : Result.failVoid,
          ),
        ),
      );

  const findActiveAuthorizedManagerIds = (
    id: (typeof SharedAccountsContract.Table.Model.Type)["id"],
  ) =>
    base
      .findById(id)
      .pipe(
        Effect.flatMap((sharedAccount) =>
          managerAccessRepository.findWhere((access) =>
            access.sharedAccountId === sharedAccount.id && access.deletedAt === null
              ? Result.succeed(access.managerId)
              : Result.failVoid,
          ),
        ),
      );

  const findActiveAuthorizedCustomerGroupIds = (
    id: (typeof SharedAccountsContract.Table.Model.Type)["id"],
  ) =>
    base
      .findById(id)
      .pipe(
        Effect.flatMap((sharedAccount) =>
          customerGroupAccessRepository.findWhere((access) =>
            access.sharedAccountId === sharedAccount.id && access.deletedAt === null
              ? Result.succeed(access.customerGroupId)
              : Result.failVoid,
          ),
        ),
      );

  return {
    ...base,
    findActiveAuthorizedCustomerIds,
    findActiveAuthorizedManagerIds,
    findActiveAuthorizedCustomerGroupIds,
  };
});

export const layer = makeService.pipe(Layer.effect(SharedAccountsReadRepository));
