import * as Array from "effect/Array";
import * as Chunk from "effect/Chunk";
import * as Data from "effect/Data";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { PapercutSyncer } from ".";
import { Actor } from "../../actors";
import { Graph, GraphLayerMap } from "../../graph";
import { CustomerGroupMembershipsRepository } from "../../groups/customer-memberships/repository";
import { CustomerGroupsRepository } from "../../groups/customers/repository";
import { IdentityProvidersContract } from "../../identity/contract";
import { IdentityProvidersRepository } from "../../identity/providers-repository";
import { SharedAccountCustomerAccessRepository } from "../../shared-accounts/customer-access/repository";
import { SharedAccountCustomerGroupAccessRepository } from "../../shared-accounts/customer-group-access/repository";
import { SharedAccountsRepository } from "../../shared-accounts/repository";
import { UsersRepository } from "../../users/repository";
import { Constants } from "../../utils/constants";
import { IncompleteTaskStatusError, PapercutApi } from "../api";

import type { InferInsertModel } from "drizzle-orm";
import type {
  CustomerGroup,
  CustomerGroupByOrigin,
  CustomerGroupMembership,
  CustomerGroupMembershipsTable,
  CustomerGroupsTable,
} from "../../groups/sql";
import type { IdentityProvider } from "../../identity/sql";
import type {
  SharedAccount,
  SharedAccountByOrigin,
  SharedAccountCustomerAccess,
  SharedAccountCustomerAccessTable,
  SharedAccountCustomerGroupAccess,
  SharedAccountCustomerGroupAccessTable,
  SharedAccountsTable,
} from "../../shared-accounts/sql";
import type { User, UserByOrigin, UsersTable } from "../../users/sql";

export type ServiceShape = Effect.Success<typeof makeService>;

export class CustomerGroupMembershipKey extends Data.Class<{
  customerGroupName: CustomerGroup["name"];
  username: User["username"];
}> {}

export class IdentityProviderKey extends Data.Class<IdentityProvider> {}

export class SharedAccountCustomerAccessKey extends Data.Class<{
  sharedAccountPapercutId: NonNullable<SharedAccount["papercutId"]>;
  username: User["username"];
}> {}

export class SharedAccountCustomerGroupAccessKey extends Data.Class<{
  customerGroupName: CustomerGroup["name"];
  sharedAccountPapercutId: NonNullable<SharedAccount["papercutId"]>;
}> {}

export const makeService = Effect.gen(function* () {
  const papercutApi = yield* PapercutApi;

  const customerGroupsRepository = yield* CustomerGroupsRepository;
  const customerGroupMembershipsRepository = yield* CustomerGroupMembershipsRepository;
  const identityProvidersRepository = yield* IdentityProvidersRepository;
  const sharedAccountsRepository = yield* SharedAccountsRepository;
  const sharedAccountCustomerAccessRepository = yield* SharedAccountCustomerAccessRepository;
  const sharedAccountCustomerGroupAccessRepository =
    yield* SharedAccountCustomerGroupAccessRepository;
  const usersRepository = yield* UsersRepository;

  const syncCustomerGroups = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    yield* papercutApi.getTaskStatus.pipe(
      Effect.filterOrFail(
        (taskStatus) => taskStatus[0].value.boolean,
        (taskStatus) => new IncompleteTaskStatusError({ message: taskStatus[1].value }),
      ),
    );

    const [prev, next] = yield* Effect.all(
      [
        customerGroupsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((group) => Tuple.make(group.name, group)),
          Stream.runFold(
            HashMap.empty<CustomerGroup["name"], CustomerGroupByOrigin<"papercut">>,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
        identityProvidersRepository.findByTenantId(tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.mapEffect(
            Effect.fn(function* (identityProvider) {
              const names = yield* papercutApi.listUserGroupsStream.pipe(
                Stream.runFold(HashSet.empty<CustomerGroup["name"]>, (set, name) =>
                  set.pipe(HashSet.add(name)),
                ),
              );

              return yield* Match.value(identityProvider).pipe(
                Match.when({ kind: Match.is(Constants.ENTRA_ID) }, (entraId) =>
                  Graph.use(Struct.get("groups")).pipe(
                    Effect.provide(GraphLayerMap.get(entraId.externalTenantId)),
                    Stream.fromArrayEffect,
                    Stream.filterMapEffect((group) =>
                      Match.value(group).pipe(
                        Match.when(
                          { displayName: Predicate.isNotNullish, id: Predicate.isNotNullish },
                          (group) =>
                            Effect.succeed(group).pipe(
                              Effect.flatMap(
                                Schema.decodeEffect(IdentityProvidersContract.EntraIdGroup),
                              ),
                              Effect.map(Result.succeed),
                            ),
                        ),
                        Match.orElse(() => Result.failVoid.pipe(Effect.succeed)),
                      ),
                    ),
                  ),
                ),
                Match.when({ kind: Match.is(Constants.GOOGLE) }, (google) =>
                  Stream.fail(new IdentityProvidersContract.NotImplementedError(google)),
                ),
                Match.exhaustive,
                Stream.map((group) => Tuple.make(group.name, { id: identityProvider.id, group })),
                Stream.runFold(
                  HashMap.empty<
                    CustomerGroup["name"],
                    { id: IdentityProvider["id"]; group: IdentityProvidersContract.Group }
                  >,
                  (map, entry) => map.pipe(HashMap.set(...entry)),
                ),
                Effect.map(HashMap.filter((_, name) => names.pipe(HashSet.has(name)))),
              );
            }),
          ),
          Stream.runFold(
            HashMap.empty<
              CustomerGroup["name"],
              { id: IdentityProvider["id"]; group: IdentityProvidersContract.Group }
            >,
            (...maps) => HashMap.union(...maps),
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
      HashSet.reduce(Chunk.empty<InferInsertModel<CustomerGroupsTable>>(), (chunk, name) => {
        const group = prev.pipe(HashMap.get(name));
        const idp = next.pipe(HashMap.get(name));

        const base = {
          origin: "papercut",
          name,
          tenantId,
        } as const;

        // create
        if (Option.isNone(group) && Option.isSome(idp))
          return chunk.pipe(
            Chunk.append({
              ...base,
              externalId: idp.value.group.externalId,
              identityProviderId: idp.value.id,
            }),
          );

        // update
        if (Option.isSome(group) && Option.isSome(idp) && group.value.name !== idp.value.group.name)
          return chunk.pipe(
            Chunk.append({
              ...base,
              externalId: idp.value.group.externalId,
              id: group.value.id,
              identityProviderId: idp.value.id,
            }),
          );

        // delete
        if (Option.isSome(group) && Option.isNone(idp))
          return chunk.pipe(
            Chunk.append({
              ...base,
              ...Struct.pick(group.value, ["externalId", "id", "identityProviderId"]),
              deletedAt: now,
            }),
          );

        // no change
        return chunk;
      }),
    );

    if (Chunk.isNonEmpty(upserts))
      return yield* upserts.pipe(Chunk.toArray, customerGroupsRepository.upsertMany);

    return [];
  }).pipe(Effect.withSpan("PapercutSyncer.syncCustomerGroups"));

  const syncCustomerGroupMemberships = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    yield* papercutApi.getTaskStatus.pipe(
      Effect.filterOrFail(
        (taskStatus) => taskStatus[0].value.boolean,
        (taskStatus) => new IncompleteTaskStatusError({ message: taskStatus[1].value }),
      ),
    );

    const lookup = yield* Effect.all(
      {
        customerGroups: customerGroupsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((customerGroup) => Tuple.make(customerGroup.name, customerGroup.id)),
          Stream.runFold(HashMap.empty<CustomerGroup["name"], CustomerGroup["id"]>, (map, entry) =>
            map.pipe(HashMap.set(...entry)),
          ),
        ),
        members: usersRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((member) => Tuple.make(member.username, member.id)),
          Stream.runFold(HashMap.empty<User["username"], User["id"]>, (map, entry) =>
            map.pipe(HashMap.set(...entry)),
          ),
        ),
      },
      { concurrency: "unbounded" },
    );

    const [prev, next] = yield* Effect.all(
      [
        customerGroupMembershipsRepository.findWithMemberAndCustomerGroupByTenantId(tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map(({ customerGroup, member, membership }) =>
            Tuple.make(
              new CustomerGroupMembershipKey({
                customerGroupName: customerGroup.name,
                username: member.username,
              }),
              membership,
            ),
          ),
          Stream.runFold(
            HashMap.empty<CustomerGroupMembershipKey, CustomerGroupMembership>,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
        papercutApi.listUserGroupsStream.pipe(
          Stream.flatMap((customerGroupName) =>
            papercutApi
              .getGroupMembersStream(customerGroupName)
              .pipe(
                Stream.map(
                  (username) => new CustomerGroupMembershipKey({ customerGroupName, username }),
                ),
              ),
          ),
          Stream.filterMap((key) =>
            Option.product(
              lookup.customerGroups.pipe(HashMap.get(key.customerGroupName)),
              lookup.members.pipe(HashMap.get(key.username)),
            ).pipe(
              Option.map(([customerGroupId, memberId]) =>
                Tuple.make(key, { customerGroupId, memberId }),
              ),
              Result.fromOption(() => undefined),
            ),
          ),
          Stream.runFold(
            HashMap.empty<
              CustomerGroupMembershipKey,
              { customerGroupId: CustomerGroup["id"]; memberId: User["id"] }
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
        Chunk.empty<InferInsertModel<CustomerGroupMembershipsTable>>(),
        (chunk, key) => {
          const membership = prev.pipe(HashMap.get(key));
          const data = next.pipe(HashMap.get(key));

          // create
          if (Option.isNone(membership) && Option.isSome(data))
            return chunk.pipe(Chunk.append({ tenantId, ...data.value }));

          // delete
          if (Option.isSome(membership) && Option.isNone(data))
            return chunk.pipe(
              Chunk.append({
                tenantId,
                ...Struct.pick(membership.value, ["customerGroupId", "memberId"]),
                deletedAt: now,
              }),
            );

          return chunk;
        },
      ),
    );

    if (Chunk.isNonEmpty(upserts))
      return yield* upserts.pipe(Chunk.toArray, customerGroupMembershipsRepository.upsertMany);

    return [];
  }).pipe(Effect.withSpan("PapercutSyncer.syncCustomerGroupMemberships"));

  const syncSharedAccounts = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    const [prev, next] = yield* Effect.all(
      [
        sharedAccountsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((sharedAccount) => Tuple.make(sharedAccount.papercutId, sharedAccount)),
          Stream.runFold(
            HashMap.empty<
              NonNullable<SharedAccount["papercutId"]>,
              SharedAccountByOrigin<"papercut">
            >,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
        papercutApi.listSharedAccountsStream.pipe(
          Stream.mapEffect((name) =>
            papercutApi
              .getSharedAccountProperties(name, "account-id")
              .pipe(Effect.map(([accountId]) => Tuple.make(accountId, name))),
          ),
          Stream.runFold(
            HashMap.empty<NonNullable<SharedAccount["papercutId"]>, SharedAccount["name"]>,
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
      HashSet.reduce(Chunk.empty<InferInsertModel<SharedAccountsTable>>(), (chunk, papercutId) => {
        const sharedAccount = prev.pipe(HashMap.get(papercutId));
        const name = next.pipe(HashMap.get(papercutId));

        const base = {
          origin: "papercut",
          papercutId,
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
      }),
    );

    if (Chunk.isNonEmpty(upserts))
      return yield* upserts.pipe(Chunk.toArray, sharedAccountsRepository.upsertMany);

    return [];
  }).pipe(Effect.withSpan("PapercutSyncer.syncSharedAccounts"));

  const syncSharedAccountCustomerAccess = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    const lookup = yield* Effect.all(
      {
        customers: usersRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((customer) => Tuple.make(customer.username, customer.id)),
          Stream.runFold(HashMap.empty<User["username"], User["id"]>, (map, entry) =>
            map.pipe(HashMap.set(...entry)),
          ),
        ),
        sharedAccounts: sharedAccountsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((sharedAccount) => Tuple.make(sharedAccount.papercutId, sharedAccount.id)),
          Stream.runFold(
            HashMap.empty<NonNullable<SharedAccount["papercutId"]>, SharedAccount["id"]>,
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
                  sharedAccountPapercutId: sharedAccount.papercutId,
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
        papercutApi.listSharedAccountsStream.pipe(
          Stream.mapEffect((name) =>
            papercutApi.getSharedAccountProperties(name, "account-id", "access-users"),
          ),
          Stream.flatMap(([sharedAccountPapercutId, usernames]) =>
            Stream.fromArray(usernames).pipe(
              Stream.map(
                (username) =>
                  new SharedAccountCustomerAccessKey({ sharedAccountPapercutId, username }),
              ),
            ),
          ),
          Stream.filterMap((key) =>
            Option.product(
              lookup.customers.pipe(HashMap.get(key.username)),
              lookup.sharedAccounts.pipe(HashMap.get(key.sharedAccountPapercutId)),
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
  }).pipe(Effect.withSpan("PapercutSyncer.syncSharedAccountCustomerAccess"));

  const syncSharedAccountCustomerGroupAccess = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    const lookup = yield* Effect.all(
      {
        customerGroups: customerGroupsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((customerGroup) => Tuple.make(customerGroup.name, customerGroup.id)),
          Stream.runFold(HashMap.empty<CustomerGroup["name"], CustomerGroup["id"]>, (map, entry) =>
            map.pipe(HashMap.set(...entry)),
          ),
        ),
        sharedAccounts: sharedAccountsRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((sharedAccount) => Tuple.make(sharedAccount.papercutId, sharedAccount.id)),
          Stream.runFold(
            HashMap.empty<NonNullable<SharedAccount["papercutId"]>, SharedAccount["id"]>,
            (map, entry) => map.pipe(HashMap.set(...entry)),
          ),
        ),
      },
      { concurrency: "unbounded" },
    );

    const [prev, next] = yield* Effect.all(
      [
        sharedAccountCustomerGroupAccessRepository
          .findWithCustomerGroupAndSharedAccountByOrigin("papercut", tenantId)
          .pipe(
            Stream.fromArrayEffect,
            Stream.map(({ access, customerGroup, sharedAccount }) =>
              Tuple.make(
                new SharedAccountCustomerGroupAccessKey({
                  customerGroupName: customerGroup.name,
                  sharedAccountPapercutId: sharedAccount.papercutId,
                }),
                access,
              ),
            ),
            Stream.runFold(
              HashMap.empty<SharedAccountCustomerGroupAccessKey, SharedAccountCustomerGroupAccess>,
              (map, entry) => map.pipe(HashMap.set(...entry)),
            ),
          ),
        papercutApi.listSharedAccountsStream.pipe(
          Stream.mapEffect((name) =>
            papercutApi.getSharedAccountProperties(name, "account-id", "access-groups"),
          ),
          Stream.flatMap(([sharedAccountPapercutId, customerGroupNames]) =>
            Stream.fromArray(customerGroupNames).pipe(
              Stream.map(
                (customerGroupName) =>
                  new SharedAccountCustomerGroupAccessKey({
                    sharedAccountPapercutId,
                    customerGroupName,
                  }),
              ),
            ),
          ),
          Stream.filterMap((key) =>
            Option.product(
              lookup.customerGroups.pipe(HashMap.get(key.customerGroupName)),
              lookup.sharedAccounts.pipe(HashMap.get(key.sharedAccountPapercutId)),
            ).pipe(
              Option.map(([customerGroupId, sharedAccountId]) =>
                Tuple.make(key, { customerGroupId, sharedAccountId }),
              ),
              Result.fromOption(() => undefined),
            ),
          ),
          Stream.runFold(
            HashMap.empty<
              SharedAccountCustomerGroupAccessKey,
              { customerGroupId: CustomerGroup["id"]; sharedAccountId: SharedAccount["id"] }
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
        Chunk.empty<InferInsertModel<SharedAccountCustomerGroupAccessTable>>(),
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
                ...Struct.pick(access.value, ["customerGroupId", "sharedAccountId"]),
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
        sharedAccountCustomerGroupAccessRepository.upsertMany,
      );

    return [];
  }).pipe(Effect.withSpan("PapercutSyncer.syncSharedAccountCustomerGroupAccess"));

  const syncUsers = Effect.gen(function* () {
    const tenantId = yield* Actor.use(Struct.get("tenantId"));

    yield* papercutApi.getTaskStatus.pipe(
      Effect.filterOrFail(
        (taskStatus) => taskStatus[0].value.boolean,
        (taskStatus) => new IncompleteTaskStatusError({ message: taskStatus[1].value }),
      ),
    );

    const [prev, next] = yield* Effect.all(
      [
        usersRepository.findByOrigin("papercut", tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.map((user) => Tuple.make(user.username, user)),
          Stream.runFold(HashMap.empty<User["username"], UserByOrigin<"papercut">>, (map, entry) =>
            map.pipe(HashMap.set(...entry)),
          ),
        ),
        identityProvidersRepository.findWithCustomerGroupsByTenantId(tenantId).pipe(
          Stream.fromArrayEffect,
          Stream.groupBy(({ identityProvider, customerGroup }) =>
            Effect.succeed(Tuple.make(new IdentityProviderKey(identityProvider), customerGroup)),
          ),
          Stream.mapEffect(([identityProvider, customerGroupsStream]) =>
            customerGroupsStream.pipe(
              Stream.filter(Predicate.isNotNull),
              Stream.runCollect,
              Effect.map((customerGroups) => ({ identityProvider, customerGroups })),
            ),
          ),
          Stream.mapEffect(
            Effect.fn(function* ({ identityProvider, customerGroups }) {
              const hasGroups = Array.isArrayNonEmpty(customerGroups);

              const usernames = yield* (
                hasGroups
                  ? Stream.fromArray(customerGroups).pipe(
                      Stream.flatMap((customerGroup) =>
                        papercutApi.getGroupMembersStream(customerGroup.name),
                      ),
                    )
                  : papercutApi.listUserAccountsStream
              ).pipe(
                Stream.runFold(HashSet.empty<User["username"]>, (set, username) =>
                  set.pipe(HashSet.add(username)),
                ),
              );

              return yield* identityProvider.pipe(
                Match.value,
                Match.when({ kind: Match.is(Constants.ENTRA_ID) }, (entraId) =>
                  (hasGroups
                    ? Stream.fromArray(customerGroups).pipe(
                        Stream.flatMap((customerGroup) =>
                          Graph.use((graph) => graph.groupMembers(customerGroup.externalId)).pipe(
                            Effect.provide(GraphLayerMap.get(entraId.externalTenantId)),
                            Stream.fromArrayEffect,
                          ),
                        ),
                      )
                    : Graph.use(Struct.get("users")).pipe(
                        Effect.provide(GraphLayerMap.get(entraId.externalTenantId)),
                        Stream.fromArrayEffect,
                      )
                  ).pipe(
                    Stream.filterMapEffect((user) =>
                      Match.value(user).pipe(
                        Match.when(
                          {
                            id: Predicate.isNotNullish,
                            mail: Predicate.isNotNullish,
                            preferredName: Predicate.isNotNullish,
                            userPrincipalName: Predicate.isNotNullish,
                          },
                          (user) =>
                            Effect.succeed(user).pipe(
                              Effect.flatMap(
                                Schema.decodeEffect(IdentityProvidersContract.EntraIdUser),
                              ),
                              Effect.map(Result.succeed),
                            ),
                        ),
                        Match.orElse(() => Result.failVoid.pipe(Effect.succeed)),
                      ),
                    ),
                  ),
                ),
                Match.when({ kind: Match.is(Constants.GOOGLE) }, (google) =>
                  Stream.fail(new IdentityProvidersContract.NotImplementedError(google)),
                ),
                Match.exhaustive,
                Stream.map((user) => Tuple.make(user.username, { id: identityProvider.id, user })),
                Stream.runFold(
                  HashMap.empty<
                    User["username"],
                    { id: IdentityProvider["id"]; user: IdentityProvidersContract.User }
                  >,
                  (map, entry) => map.pipe(HashMap.set(...entry)),
                ),
                Effect.map(HashMap.filter((_, username) => usernames.pipe(HashSet.has(username)))),
              );
            }),
          ),
          Stream.runFold(
            HashMap.empty<
              User["username"],
              { id: IdentityProvider["id"]; user: IdentityProvidersContract.User }
            >,
            (...maps) => HashMap.union(...maps),
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
      HashSet.reduce(Chunk.empty<InferInsertModel<UsersTable>>(), (chunk, username) => {
        const user = prev.pipe(HashMap.get(username));
        const idp = next.pipe(HashMap.get(username));

        const base = {
          origin: "papercut",
          username,
          tenantId,
        } as const;

        // create
        if (Option.isNone(user) && Option.isSome(idp))
          return chunk.pipe(
            Chunk.append({
              ...base,
              ...Struct.pick(idp.value.user, ["displayName", "email", "externalId"]),
              identityProviderId: idp.value.id,
            }),
          );

        // update
        if (
          Option.isSome(user) &&
          Option.isSome(idp) &&
          (user.value.displayName !== idp.value.user.displayName ||
            user.value.email !== idp.value.user.email ||
            user.value.username !== idp.value.user.username)
        )
          return chunk.pipe(
            Chunk.append({
              ...base,
              id: user.value.id,
              ...Struct.pick(idp.value.user, ["displayName", "email", "externalId"]),
              identityProviderId: idp.value.id,
            }),
          );

        // delete
        if (Option.isSome(user) && Option.isNone(idp))
          return chunk.pipe(
            Chunk.append({
              ...base,
              ...Struct.pick(user.value, [
                "displayName",
                "email",
                "externalId",
                "id",
                "identityProviderId",
              ]),
              deletedAt: now,
            }),
          );

        // no change
        return chunk;
      }),
    );

    if (Chunk.isNonEmpty(upserts))
      return yield* upserts.pipe(Chunk.toArray, usersRepository.upsertMany);

    return [];
  }).pipe(Effect.withSpan("PapercutSyncer.syncUsers"));

  const syncAll = Effect.all(
    [
      syncUsers,
      syncCustomerGroups,
      syncCustomerGroupMemberships,
      syncSharedAccounts,
      syncSharedAccountCustomerAccess,
      syncSharedAccountCustomerGroupAccess,
    ],
    { discard: true },
  ).pipe(Effect.withSpan("PapercutSyncer.syncAll"));

  return {
    syncAll,
    syncCustomerGroups,
    syncCustomerGroupMemberships,
    syncSharedAccounts,
    syncSharedAccountCustomerAccess,
    syncSharedAccountCustomerGroupAccess,
    syncUsers,
  } as const;
});

export const layer = makeService.pipe(Layer.effect(PapercutSyncer));
