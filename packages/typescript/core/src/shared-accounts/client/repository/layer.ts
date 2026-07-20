import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";

import { SharedAccountsRepository } from ".";
import { repositoryFactory } from "../../../database/client/repository-factory";
import { SharedAccountsContract } from "../../contracts";
import { SharedAccountCustomerAccessRepository } from "../customer-access/repository";
import { SharedAccountGroupCustomerAccessRepository } from "../group-customer-access/repository";
import { SharedAccountManagerAccessRepository } from "../manager-access/repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* repositoryFactory(SharedAccountsContract.Table);
  const customerAccessRepository = yield* SharedAccountCustomerAccessRepository;
  const managerAccessRepository = yield* SharedAccountManagerAccessRepository;
  const customerGroupAccessRepository = yield* SharedAccountGroupCustomerAccessRepository;

  const findActiveAuthorizedCustomerIds = (id: typeof SharedAccountsContract.Table.Model.Type.id) =>
    repository
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

  const findActiveAuthorizedManagerIds = (id: typeof SharedAccountsContract.Table.Model.Type.id) =>
    repository
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
    id: typeof SharedAccountsContract.Table.Model.Type.id,
  ) =>
    repository
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
    ...repository,
    findActiveAuthorizedCustomerIds,
    findActiveAuthorizedManagerIds,
    findActiveAuthorizedCustomerGroupIds,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(SharedAccountsRepository));
