import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";

import { ProductsMutations } from ".";
import { AccessControl } from "../../access-control";
import { MutationsContract } from "../../mutations/contract";
import { ReplicacheContract } from "../../replicache/contracts";
import { ReplicacheNotifier } from "../../replicache/notifier";
import { RoomsRepository } from "../../rooms/repository";
import { ProductsContract } from "../contract";
import { ProductsPolicies } from "../policies";
import { ProductsRepository } from "../repository";

export type ServiceShape = Effect.Success<typeof makeService>;

export const makeService = Effect.gen(function* () {
  const repository = yield* ProductsRepository;
  const roomsRepository = yield* RoomsRepository;

  const policies = yield* ProductsPolicies;

  const notifier = yield* ReplicacheNotifier;

  const notifyCreate = (product: typeof ProductsContract.Table.Model.Type) =>
    Match.value(product).pipe(
      Match.when({ status: Match.is("published") }, () =>
        roomsRepository.findById(product.roomId, product.tenantId).pipe(
          Effect.map((room) =>
            Match.value(room).pipe(
              Match.whenAnd({ deletedAt: Match.null }, { status: Match.is("published") }, () =>
                Array.make(
                  ReplicacheContract.PullPermission.make({ permission: "products:read" }),
                  ReplicacheContract.PullPermission.make({ permission: "active_products:read" }),
                  ReplicacheContract.PullPermission.make({
                    permission: "active_published_products:read",
                  }),
                ),
              ),
              Match.orElse(() =>
                Array.make(
                  ReplicacheContract.PullPermission.make({ permission: "products:read" }),
                  ReplicacheContract.PullPermission.make({ permission: "active_products:read" }),
                ),
              ),
            ),
          ),
        ),
      ),
      Match.orElse(() =>
        Effect.succeed(
          Array.make(
            ReplicacheContract.PullPermission.make({ permission: "products:read" }),
            ReplicacheContract.PullPermission.make({ permission: "active_products:read" }),
          ),
        ),
      ),
      Effect.flatMap(notifier.notify),
      Effect.catch(() => Effect.void),
    );
  const notifyEdit = notifyCreate;

  const notifyPublish = (product: typeof ProductsContract.Table.Model.Type) =>
    roomsRepository.findById(product.roomId, product.tenantId).pipe(
      Effect.map((room) =>
        Match.value(room).pipe(
          Match.whenAnd({ deletedAt: Match.null }, { status: Match.is("published") }, () =>
            Array.make(
              ReplicacheContract.PullPermission.make({ permission: "products:read" }),
              ReplicacheContract.PullPermission.make({ permission: "active_products:read" }),
              ReplicacheContract.PullPermission.make({
                permission: "active_published_products:read",
              }),
            ),
          ),
          Match.orElse(() =>
            Array.make(
              ReplicacheContract.PullPermission.make({ permission: "products:read" }),
              ReplicacheContract.PullPermission.make({ permission: "active_products:read" }),
            ),
          ),
        ),
      ),
      Effect.flatMap(notifier.notify),
      Effect.catch(() => Effect.void),
    );
  const notifyDraft = notifyPublish;

  const notifyDelete = notifyCreate;
  const notifyRestore = notifyCreate;

  const create = MutationsContract.makeMutation(ProductsContract.create, {
    makePolicy: Effect.fn("Products.Mutations.create.makePolicy")(() =>
      AccessControl.userPermissionPolicy("products:create"),
    ),
    mutator: Effect.fn("Products.Mutations.create.mutator")((product, { tenantId }) =>
      repository.create({ ...product, tenantId }).pipe(Effect.tap(notifyCreate)),
    ),
  });

  const edit = MutationsContract.makeMutation(ProductsContract.edit, {
    makePolicy: Effect.fn("Products.Mutations.edit.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Products.Mutations.edit.mutator")(({ id, ...product }, user) =>
      repository.updateById(id, product, user.tenantId).pipe(Effect.tap(notifyEdit)),
    ),
  });

  const publish = MutationsContract.makeMutation(ProductsContract.publish, {
    makePolicy: Effect.fn("Products.Mutations.publish.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Products.Mutations.publish.mutator")(({ id, updatedAt }, user) =>
      repository.findByIdForUpdate(id, user.tenantId).pipe(
        Effect.flatMap((prev) =>
          repository
            .updateById(
              id,
              {
                status: "published",
                config: ProductsContract.Configuration.make({
                  ...prev.config,
                  status: "published",
                }),
                updatedAt,
              },
              user.tenantId,
            )
            .pipe(Effect.tap(notifyPublish)),
        ),
      ),
    ),
  });

  const draft = MutationsContract.makeMutation(ProductsContract.draft, {
    makePolicy: Effect.fn("Products.Mutations.draft.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:update"),
        policies.canEdit.make({ id }),
      ),
    ),
    mutator: Effect.fn("Products.Mutations.draft.mutator")(({ id, updatedAt }, user) =>
      repository.findByIdForUpdate(id, user.tenantId).pipe(
        Effect.flatMap((prev) =>
          repository
            .updateById(
              id,
              {
                status: "draft",
                config: ProductsContract.Configuration.make({
                  ...prev.config,
                  status: "draft",
                }),
                updatedAt,
              },
              user.tenantId,
            )
            .pipe(Effect.tap(notifyDraft)),
        ),
      ),
    ),
  });

  const delete_ = MutationsContract.makeMutation(ProductsContract.delete_, {
    makePolicy: Effect.fn("Products.Mutations.delete.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:delete"),
        policies.canDelete.make({ id }),
      ),
    ),
    mutator: Effect.fn("Products.Mutations.delete.mutator")(({ id, deletedAt }, user) =>
      repository
        .updateById(id, { deletedAt, status: "draft" }, user.tenantId)
        .pipe(Effect.tap(notifyDelete)),
    ),
  });

  const restore = MutationsContract.makeMutation(ProductsContract.restore, {
    makePolicy: Effect.fn("Products.Mutations.restore.makePolicy")(({ id }) =>
      AccessControl.every(
        AccessControl.userPermissionPolicy("products:delete"),
        policies.canRestore.make({ id }),
      ),
    ),
    mutator: Effect.fn("Products.Mutations.restore.mutator")(({ id }, user) =>
      repository.updateById(id, { deletedAt: null }, user.tenantId).pipe(Effect.tap(notifyRestore)),
    ),
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
