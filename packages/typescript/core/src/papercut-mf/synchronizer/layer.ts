import * as Chunk from "effect/Chunk";
import * as Data from "effect/Data";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { PapercutMfSynchronizer } from ".";
import { Actor } from "../../actors";
import { GroupsRepository } from "../../groups/repositories";
import { SharedAccountCustomerAccessRepository } from "../../shared-accounts/customer-access/repositories";
import { SharedAccountGroupCustomerAccessRepository } from "../../shared-accounts/group-customer-access/repositories";
import { SharedAccountsRepository } from "../../shared-accounts/repositories";
import { UsersRepository } from "../../users/repositories";
import { PapercutMfApi } from "../api";

import type { InferInsertModel } from "drizzle-orm";
import type { Group } from "../../groups/sql";
import type {
  SharedAccount,
  SharedAccountByOrigin,
  SharedAccountCustomerAccess,
  SharedAccountCustomerAccessTable,
  SharedAccountGroupCustomerAccess,
  SharedAccountGroupCustomerAccessTable,
  SharedAccountsTable,
} from "../../shared-accounts/sql";
import type { User } from "../../users/sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export class SharedAccountCustomerAccessKey extends Data.Class<{
  sharedAccountPapercutMfId: NonNullable<SharedAccount["papercutMfId"]>;
  username: User["username"];
}> {}

export class SharedAccountGroupCustomerAccessKey extends Data.Class<{
  groupName: Group["name"];
  sharedAccountPapercutMfId: NonNullable<SharedAccount["papercutMfId"]>;
}> {}

export const makeService = Effect.gen(function* () {
  const papercutMfApi = yield* PapercutMfApi;

  const groupsRepository = yield* GroupsRepository;
  const sharedAccountsRepository = yield* SharedAccountsRepository;
  const sharedAccountCustomerAccessRepository = yield* SharedAccountCustomerAccessRepository;
  const sharedAccountGroupCustomerAccessRepository =
    yield* SharedAccountGroupCustomerAccessRepository;
  const usersRepository = yield* UsersRepository;

  const syncSharedAccounts = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    const [prev, next] = yield* Effect.all(
      [
        sharedAccountsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((sharedAccount) => Tuple.make(sharedAccount.papercutMfId, sharedAccount)),
          Stream.runFold(
            HashMap.empty<
              NonNullable<SharedAccount["papercutMfId"]>,
              SharedAccountByOrigin<"papercut">
            >,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
        papercutMfApi.listSharedAccountsStream.pipe(
          Stream.mapEffect((name) =>
            papercutMfApi
              .getSharedAccountProperties(name, "account-id")
              .pipe(Effect.map(([accountId]) => Tuple.make(accountId, name))),
          ),
          Stream.runFold(
            HashMap.empty<NonNullable<SharedAccount["papercutMfId"]>, SharedAccount["name"]>,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
      ],
      { concurrency: "unbounded" },
    );

    const now = yield* DateTime.now;
    const upserts = prev.pipe(
      HashMap.keys,
      HashSet.fromIterable,
      HashSet.union(next.pipe(HashMap.keys, HashSet.fromIterable)),
      HashSet.reduce(
        Chunk.empty<InferInsertModel<SharedAccountsTable>>(),
        (chunk, papercutMfId) => {
          const sharedAccount = prev.pipe(HashMap.get(papercutMfId));
          const name = next.pipe(HashMap.get(papercutMfId));

          const base = {
            origin: "papercut",
            papercutMfId,
            tenantId,
          } as const;

          // create
          if (Option.isNone(sharedAccount) && Option.isSome(name))
            return chunk.pipe(Chunk.append({ ...base, name: name.value }));

          // update
          if (
            Option.isSome(sharedAccount) &&
            Option.isSome(name) &&
            sharedAccount.value.name !== name.value
          )
            return chunk.pipe(
              Chunk.append({ ...base, id: sharedAccount.value.id, name: name.value }),
            );

          // delete
          if (Option.isSome(sharedAccount) && Option.isNone(name))
            return chunk.pipe(
              Chunk.append({
                ...base,
                ...Struct.pick(sharedAccount.value, ["id", "name"]),
                deletedAt: now,
              }),
            );

          // no change
          return chunk;
        },
      ),
    );

    if (Chunk.isNonEmpty(upserts))
      return yield* upserts.pipe(Chunk.toArray, sharedAccountsRepository.upsertMany);

    return [];
  }).pipe(Effect.withSpan("PapercutMfSynchronizer.syncSharedAccounts"));

  const syncSharedAccountCustomerAccess = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    const lookup = yield* Effect.all(
      {
        customers: usersRepository.findByTenantId(tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((customer) => Tuple.make(customer.username, customer.id)),
          Stream.runFold(HashMap.empty<User["username"], User["id"]>, (map, entry) =>
            map.pipe(HashMap.set(...entry)),
          ),
        ),
        sharedAccounts: sharedAccountsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((sharedAccount) => Tuple.make(sharedAccount.papercutMfId, sharedAccount.id)),
          Stream.runFold(
            HashMap.empty<NonNullable<SharedAccount["papercutMfId"]>, SharedAccount["id"]>,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
      },
      { concurrency: "unbounded" },
    );

    const [prev, next] = yield* Effect.all(
      [
        sharedAccountCustomerAccessRepository
          .findWithCustomerAndSharedAccountByOrigin("papercut", tenantId)
          .pipe(
            Stream.fromArrayEffect,
            Stream.map(({ access, customer, sharedAccount }) =>
              Tuple.make(
                new SharedAccountCustomerAccessKey({
                  sharedAccountPapercutMfId: sharedAccount.papercutMfId,
                  username: customer.username,
                }),
                access,
              ),
            ),
            Stream.runFold(
              HashMap.empty<SharedAccountCustomerAccessKey, SharedAccountCustomerAccess>,
              (map, entry) => map.pipe(HashMap.set(...entry)),
            ),
          ),
        papercutMfApi.listSharedAccountsStream.pipe(
          Stream.mapEffect((name) =>
            papercutMfApi.getSharedAccountProperties(name, "account-id", "access-users"),
          ),
          Stream.flatMap(([sharedAccountPapercutMfId, usernames]) =>
            Stream.fromArray(usernames).pipe(
              Stream.map(
                (username) =>
                  new SharedAccountCustomerAccessKey({ sharedAccountPapercutMfId, username }),
              ),
            ),
          ),
          Stream.filterMap((key) =>
            Option.product(
              lookup.customers.pipe(HashMap.get(key.username)),
              lookup.sharedAccounts.pipe(HashMap.get(key.sharedAccountPapercutMfId)),
            ).pipe(
              Option.map(([customerId, sharedAccountId]) =>
                Tuple.make(key, { customerId, sharedAccountId }),
              ),
              Result.fromOption(() => undefined),
            ),
          ),
          Stream.runFold(
            HashMap.empty<
              SharedAccountCustomerAccessKey,
              { customerId: User["id"]; sharedAccountId: SharedAccount["id"] }
            >,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
      ],
      { concurrency: "unbounded" },
    );

    const now = yield* DateTime.now;
    const upserts = prev.pipe(
      HashMap.keys,
      HashSet.fromIterable,
      HashSet.union(next.pipe(HashMap.keys, HashSet.fromIterable)),
      HashSet.reduce(
        Chunk.empty<InferInsertModel<SharedAccountCustomerAccessTable>>(),
        (chunk, key) => {
          const access = prev.pipe(HashMap.get(key));
          const data = next.pipe(HashMap.get(key));

          // create
          if (Option.isNone(access) && Option.isSome(data))
            return chunk.pipe(Chunk.append({ tenantId, ...data.value }));

          // delete
          if (Option.isSome(access) && Option.isNone(data))
            return chunk.pipe(
              Chunk.append({
                tenantId,
                ...Struct.pick(access.value, ["customerId", "sharedAccountId"]),
                deletedAt: now,
              }),
            );

          return chunk;
        },
      ),
    );

    if (Chunk.isNonEmpty(upserts))
      return yield* upserts.pipe(Chunk.toArray, sharedAccountCustomerAccessRepository.upsertMany);

    return [];
  }).pipe(Effect.withSpan("PapercutMfSynchronizer.syncSharedAccountCustomerAccess"));

  const syncSharedAccountCustomerGroupAccess = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    const lookup = yield* Effect.all(
      {
        groups: groupsRepository.findByTenantId(tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((customerGroup) => Tuple.make(customerGroup.name, customerGroup.id)),
          Stream.runFold(HashMap.empty<Group["name"], Group["id"]>, (map, entry) =>
            map.pipe(HashMap.set(...entry)),
          ),
        ),
        sharedAccounts: sharedAccountsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((sharedAccount) => Tuple.make(sharedAccount.papercutMfId, sharedAccount.id)),
          Stream.runFold(
            HashMap.empty<NonNullable<SharedAccount["papercutMfId"]>, SharedAccount["id"]>,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
      },
      { concurrency: "unbounded" },
    );

    const [prev, next] = yield* Effect.all(
      [
        sharedAccountGroupCustomerAccessRepository
          .findWithGroupAndSharedAccountByOrigin("papercut", tenantId)
          .pipe(
            Stream.fromArrayEffect,
            Stream.map(({ access, group: customerGroup, sharedAccount }) =>
              Tuple.make(
                new SharedAccountGroupCustomerAccessKey({
                  groupName: customerGroup.name,
                  sharedAccountPapercutMfId: sharedAccount.papercutMfId,
                }),
                access,
              ),
            ),
            Stream.runFold(
              HashMap.empty<SharedAccountGroupCustomerAccessKey, SharedAccountGroupCustomerAccess>,
              (map, entry) => map.pipe(HashMap.set(...entry)),
            ),
          ),
        papercutMfApi.listSharedAccountsStream.pipe(
          Stream.mapEffect((name) =>
            papercutMfApi.getSharedAccountProperties(name, "account-id", "access-groups"),
          ),
          Stream.flatMap(([sharedAccountPapercutMfId, customerGroupNames]) =>
            Stream.fromArray(customerGroupNames).pipe(
              Stream.map(
                (groupName) =>
                  new SharedAccountGroupCustomerAccessKey({ sharedAccountPapercutMfId, groupName }),
              ),
            ),
          ),
          Stream.filterMap((key) =>
            Option.product(
              lookup.groups.pipe(HashMap.get(key.groupName)),
              lookup.sharedAccounts.pipe(HashMap.get(key.sharedAccountPapercutMfId)),
            ).pipe(
              Option.map(([groupId, sharedAccountId]) =>
                Tuple.make(key, { groupId, sharedAccountId }),
              ),
              Result.fromOption(() => undefined),
            ),
          ),
          Stream.runFold(
            HashMap.empty<
              SharedAccountGroupCustomerAccessKey,
              { groupId: Group["id"]; sharedAccountId: SharedAccount["id"] }
            >,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
      ],
      { concurrency: "unbounded" },
    );

    const now = yield* DateTime.now;
    const upserts = prev.pipe(
      HashMap.keys,
      HashSet.fromIterable,
      HashSet.union(next.pipe(HashMap.keys, HashSet.fromIterable)),
      HashSet.reduce(
        Chunk.empty<InferInsertModel<SharedAccountGroupCustomerAccessTable>>(),
        (chunk, key) => {
          const access = prev.pipe(HashMap.get(key));
          const data = next.pipe(HashMap.get(key));

          // create
          if (Option.isNone(access) && Option.isSome(data))
            return chunk.pipe(Chunk.append({ tenantId, ...data.value }));

          // delete
          if (Option.isSome(access) && Option.isNone(data))
            return chunk.pipe(
              Chunk.append({
                tenantId,
                ...Struct.pick(access.value, ["groupId", "sharedAccountId"]),
                deletedAt: now,
              }),
            );

          return chunk;
        },
      ),
    );

    if (Chunk.isNonEmpty(upserts))
      return yield* upserts.pipe(
        Chunk.toArray,
        sharedAccountGroupCustomerAccessRepository.upsertMany,
      );

    return [];
  }).pipe(Effect.withSpan("PapercutMfSynchronizer.syncSharedAccountCustomerGroupAccess"));

  const syncAll = Effect.all([
    syncSharedAccounts,
    syncSharedAccountCustomerAccess,
    syncSharedAccountCustomerGroupAccess,
  ]).pipe(Effect.withSpan("PapercutMfSynchronizer.syncAll"));

  return {
    syncAll,
    syncSharedAccounts,
    syncSharedAccountCustomerAccess,
    syncSharedAccountCustomerGroupAccess,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(PapercutMfSynchronizer));
