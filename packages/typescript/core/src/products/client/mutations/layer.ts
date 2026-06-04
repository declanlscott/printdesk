import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { ProductsMutations } from ".";
import { AccessControl } from "../../../access-control";
import { Mutation } from "../../../mutations";
import { ProductsContract } from "../../contract";
import { ProductsPolicies } from "../policies";
import { ProductsWriteRepository } from "../write-repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* ProductsWriteRepository;

  const policies = yield* ProductsPolicies;

  const create = Mutation.make(ProductsContract.create, {
    makePolicy: () => AccessControl.userPermissionPolicy("products:create"),
    mutator: (product, { tenantId }) =>
      ProductsContract.Table.Dto.makeEffect({ ...product, tenantId }).pipe(
        Effect.flatMap(repository.create),
      ),
  });

  const edit = Mutation.make(ProductsContract.edit, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, ...product }) => repository.updateById(id, () => Effect.succeed(product)),
  });

  const publish = Mutation.make(ProductsContract.publish, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, updatedAt }) =>
      repository.updateById(id, ({ config }) =>
        ProductsContract.Configuration.makeEffect({ ...config, status: "published" }).pipe(
          Effect.map((config) => ({ status: config.status, config, updatedAt })),
        ),
      ),
  });

  const draft = Mutation.make(ProductsContract.draft, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:update"),
        policies.canEdit.make({ id }),
      ),
    mutator: ({ id, updatedAt }) =>
      repository.updateById(id, ({ config }) =>
        ProductsContract.Configuration.makeEffect({ ...config, status: "draft" }).pipe(
          Effect.map((config) => ({ status: config.status, config, updatedAt })),
        ),
      ),
  });

  const delete_ = Mutation.make(ProductsContract.delete_, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:delete"),
        policies.canDelete.make({ id }),
      ),
    mutator: ({ id, deletedAt }) =>
      repository
        .updateById(id, () => Effect.succeed({ deletedAt }))
        .pipe(
          AccessControl.enforce(AccessControl.userPermissionPolicy("products:read")),
          Effect.catchTag("AccessDeniedError", () => repository.deleteById(id)),
        ),
  });

  const restore = Mutation.make(ProductsContract.restore, {
    makePolicy: ({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:delete"),
        policies.canRestore.make({ id }),
      ),
    mutator: ({ id }) => repository.updateById(id, () => Effect.succeed({ deletedAt: null })),
  });

  return {
    create,
    edit,
    publish,
    draft,
    delete: delete_,
    restore,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(ProductsMutations));
