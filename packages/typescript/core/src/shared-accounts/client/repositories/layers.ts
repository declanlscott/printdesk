import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { SharedAccountsReadRepository, SharedAccountsWriteRepository } from ".";
import {
  readRepositoryFactory,
  writeRepositoryFactory,
} from "../../../database/client/repositories";
import { SharedAccountsContract } from "../../contracts";
import { SharedAccountCustomerAccessReadRepository } from "../customer-access/repositories";
import { SharedAccountGroupCustomerAccessReadRepository } from "../group-customer-access/repositories";
import { SharedAccountManagerAccessReadRepository } from "../manager-access/repositories";

export type ReadRepository = Effect.Success<typeof makeReadRepository>;
export const makeReadRepository = Effect.gen(function* () {
  const base = yield* readRepositoryFactory(SharedAccountsContract.Table);

  const customerAccessRepository = yield* SharedAccountCustomerAccessReadRepository;
  const managerAccessRepository = yield* SharedAccountManagerAccessReadRepository;
  const customerGroupAccessRepository = yield* SharedAccountGroupCustomerAccessReadRepository;

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
              ? Result.succeed(access.groupId)
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
export const readRepositoryLayer = makeReadRepository.pipe(
  Layer.effect(SharedAccountsReadRepository),
);

export type WriteRepository = Effect.Success<typeof makeWriteRepository>;
export const makeWriteRepository = SharedAccountsReadRepository.pipe(
  Effect.flatMap((repository) => writeRepositoryFactory(SharedAccountsContract.Table, repository)),
);
export const writeRepositoryLayer = makeWriteRepository.pipe(
  Layer.effect(SharedAccountsWriteRepository),
);
