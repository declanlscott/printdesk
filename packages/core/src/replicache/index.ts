import { sub } from "date-fns";
import { and, eq, getTableName, lt } from "drizzle-orm";
import * as R from "remeda";
import { deserialize, serialize } from "superjson";
import * as v from "valibot";

import { AccessControl } from "../access-control";
import { useTransaction } from "../drizzle/context";
import { useTenant } from "../tenants/context";
import { useUser } from "../users/context";
import { Utils } from "../utils";
import { Constants } from "../utils/constants";
import { ReplicacheError } from "../utils/errors";
import { fn } from "../utils/shared";
import { syncedTables } from "../utils/tables";
import { buildCvr, diffCvr, isCvrDiffEmpty } from "./client-view-record";
import { authoritativeMutator, dataFactory } from "./data";
import {
  genericMutationSchema,
  isSerialized,
  mutationNameSchema,
  pullRequestSchema,
  pushRequestSchema,
  replicacheClientsTableName,
} from "./shared";
import {
  replicacheClientGroupsTable,
  replicacheClientsTable,
  replicacheClientViewsTable,
} from "./sql";

import type {
  ClientGroupID,
  PatchOperation,
  PullResponseV1,
  PushResponse,
} from "replicache";
import type { OmitTimestamps } from "../drizzle/columns";
import type { SyncedTable } from "../utils/tables";
import type {
  ClientViewRecord,
  ClientViewRecordEntries,
} from "./client-view-record";
import type {
  NonSyncedTableMetadata,
  SyncedTableMetadata,
  TableData,
  TableMetadata,
  TablePatchData,
} from "./data";
import type { Serialized } from "./shared";
import type { ReplicacheClient, ReplicacheClientGroup } from "./sql";

export namespace Replicache {
  export const clientGroupFromId = async (id: ClientGroupID) =>
    useTransaction(async (tx) =>
      tx
        .select({
          id: replicacheClientGroupsTable.id,
          tenantId: replicacheClientGroupsTable.tenantId,
          cvrVersion: replicacheClientGroupsTable.cvrVersion,
          userId: replicacheClientGroupsTable.userId,
        })
        .from(replicacheClientGroupsTable)
        .where(
          and(
            eq(replicacheClientGroupsTable.id, id),
            eq(replicacheClientGroupsTable.tenantId, useTenant().id),
          ),
        )
        .then(R.first()),
    );

  export const clientMetadataFromGroupId = async (
    groupId: ReplicacheClientGroup["id"],
  ) =>
    useTransaction((tx) =>
      tx
        .select({
          id: replicacheClientsTable.id,
          version: replicacheClientsTable.lastMutationId,
        })
        .from(replicacheClientsTable)
        .where(eq(replicacheClientsTable.clientGroupId, groupId)),
    );

  export const clientFromId = async (id: ReplicacheClient["id"]) =>
    useTransaction((tx) =>
      tx
        .select({
          id: replicacheClientsTable.id,
          tenantId: replicacheClientsTable.tenantId,
          clientGroupId: replicacheClientsTable.clientGroupId,
          lastMutationId: replicacheClientsTable.lastMutationId,
        })
        .from(replicacheClientsTable)
        .where(eq(replicacheClientsTable.id, id))
        .then(R.first()),
    );

  export const putClientGroup = async (
    clientGroup: OmitTimestamps<ReplicacheClientGroup>,
  ) =>
    useTransaction((tx) =>
      tx
        .insert(replicacheClientGroupsTable)
        .values(clientGroup)
        .onConflictDoUpdate({
          target: [
            replicacheClientGroupsTable.id,
            replicacheClientGroupsTable.tenantId,
          ],
          set: clientGroup,
        }),
    );

  export const deleteExpiredClientGroups = async () =>
    useTransaction((tx) =>
      tx
        .delete(replicacheClientGroupsTable)
        .where(
          lt(
            replicacheClientGroupsTable.updatedAt,
            sub(new Date(), Constants.REPLICACHE_LIFETIME),
          ),
        ),
    );

  export const putClient = async (client: OmitTimestamps<ReplicacheClient>) =>
    useTransaction((tx) =>
      tx
        .insert(replicacheClientsTable)
        .values(client)
        .onConflictDoUpdate({
          target: [replicacheClientsTable.id, replicacheClientsTable.tenantId],
          set: client,
        }),
    );

  export const deleteExpiredClients = async () =>
    useTransaction((tx) =>
      tx
        .delete(replicacheClientsTable)
        .where(
          lt(
            replicacheClientsTable.updatedAt,
            sub(new Date(), Constants.REPLICACHE_LIFETIME),
          ),
        ),
    );

  type PullTransactionResult = {
    data: Array<TableData>;
    clients: ClientViewRecordEntries<typeof replicacheClientsTable>;
    cvr: {
      prev: {
        value?: ClientViewRecord;
      };
      next: {
        value: ClientViewRecord;
        version: number;
      };
    };
  } | null;

  /**
   * Implements the row version strategy pull algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#pull).
   */
  export const pull = fn(
    pullRequestSchema,
    async (pullRequest): Promise<PullResponseV1> => {
      if (pullRequest.pullVersion !== 1)
        return {
          error: "VersionNotSupported",
          versionType: "pull",
        };

      const cookieOrder = pullRequest.cookie?.order ?? 0;

      // 3: Begin transaction
      const result: PullTransactionResult = await useTransaction(async (tx) => {
        // 1: Fetch previous client view record
        const prevClientView = pullRequest.cookie
          ? await tx
              .select({ record: replicacheClientViewsTable.record })
              .from(replicacheClientViewsTable)
              .where(
                and(
                  eq(
                    replicacheClientViewsTable.clientGroupId,
                    pullRequest.clientGroupID,
                  ),
                  eq(replicacheClientViewsTable.version, cookieOrder),
                  eq(replicacheClientViewsTable.tenantId, useTenant().id),
                ),
              )
              .then(R.first())
          : undefined;

        // 2: Initialize base client view record
        const baseCvr = buildCvr({
          variant: "base",
          prev: prevClientView?.record,
        });

        // 4: Get client group
        const baseClientGroup =
          (await clientGroupFromId(pullRequest.clientGroupID)) ??
          ({
            id: pullRequest.clientGroupID,
            tenantId: useTenant().id,
            cvrVersion: 0,
            userId: useUser().id,
          } satisfies OmitTimestamps<ReplicacheClientGroup>);

        // 5: Verify requesting client group owns requested client
        if (baseClientGroup.userId !== useUser().id)
          throw new ReplicacheError.Unauthorized(
            `User "${useUser().id}" does not own client group "${baseClientGroup.id}"`,
          );

        const metadata = (await Promise.all([
          ...syncedTables.map(async (table) => {
            const name = getTableName(table);

            // 6: Read all id/version pairs from the database that should be in the client view
            const metadata = R.uniqueBy(
              await AccessControl.syncedTableResourceMetadata[useUser().role][
                name
              ](),
              R.prop("id"),
            );

            return [name, metadata] satisfies SyncedTableMetadata;
          }),
          [
            replicacheClientsTableName,
            // 7: Read all clients in the client group
            await clientMetadataFromGroupId(baseClientGroup.id),
          ] satisfies NonSyncedTableMetadata,
        ])) satisfies Array<TableMetadata>;

        // 8: Build next client view record
        const nextCvr = buildCvr({ variant: "next", metadata });

        // 9: Calculate diff
        const diff = diffCvr(baseCvr, nextCvr);

        // 10: If diff is empty, return no-op
        if (prevClientView && isCvrDiffEmpty(diff)) return null;

        // 11: Read only the data that changed
        const data = await Promise.all(
          syncedTables.map(async (table) => {
            const name = getTableName(table);

            if (R.isEmpty(diff[name].puts))
              return [
                name,
                { puts: [], dels: diff[name].dels },
              ] as const satisfies TableData;

            const puts: TablePatchData<SyncedTable>["puts"] = [];
            for (const ids of R.chunk(
              diff[name].puts,
              Constants.REPLICACHE_PULL_CHUNK_SIZE,
            )) {
              const data = await dataFactory[name](ids);

              puts.push(...data);
            }

            return [
              name,
              { puts, dels: diff[name].dels },
            ] as const satisfies TableData;
          }),
        );

        // 12: Changed clients - no need to re-read clients from database,
        // we already have their versions.
        const clients = diff[replicacheClientsTableName].puts.reduce(
          (clients, clientId) => {
            clients[clientId] = nextCvr[replicacheClientsTableName][clientId];
            return clients;
          },
          {} as ClientViewRecordEntries<typeof replicacheClientsTable>,
        );

        // 13: new client view record version
        const nextCvrVersion =
          Math.max(cookieOrder, baseClientGroup.cvrVersion) + 1;

        const nextClientGroup = {
          ...baseClientGroup,
          cvrVersion: nextCvrVersion,
        };

        await Promise.all([
          // 14: Write client group record
          putClientGroup(nextClientGroup),
          // 16-17: Generate client view record id, store client view record
          tx.insert(replicacheClientViewsTable).values({
            clientGroupId: baseClientGroup.id,
            tenantId: useTenant().id,
            version: nextCvrVersion,
            record: nextCvr,
          }),
          // Delete old client view records
          tx
            .delete(replicacheClientViewsTable)
            .where(
              and(
                eq(
                  replicacheClientViewsTable.clientGroupId,
                  baseClientGroup.id,
                ),
                eq(replicacheClientViewsTable.tenantId, useTenant().id),
                lt(
                  replicacheClientViewsTable.updatedAt,
                  sub(new Date(), Constants.REPLICACHE_LIFETIME),
                ),
              ),
            ),
        ]);

        // 15: Commit transaction
        return {
          data,
          clients,
          cvr: {
            prev: {
              value: prevClientView?.record,
            },
            next: {
              value: nextCvr,
              version: nextCvrVersion,
            },
          },
        };
      });

      // 10: If transaction result returns empty diff, return no-op
      if (!result)
        return {
          patch: [],
          cookie: pullRequest.cookie,
          lastMutationIDChanges: {},
        };

      // 18(i): Build patch
      const patch: Array<PatchOperation> = [];
      if (result.cvr.prev.value === undefined) patch.push({ op: "clear" });
      for (const [name, { puts, dels }] of result.data) {
        for (const value of puts)
          patch.push({
            op: "put",
            key: `${name}/${value.id}`,
            value: serialize(value) as Serialized,
          });

        for (const id of dels) patch.push({ op: "del", key: `${name}/${id}` });
      }

      // 18(ii): Construct cookie
      const cookie = result.cvr.next.version;

      // 18(iii): Last mutation ID changes
      const lastMutationIDChanges = result.clients;

      return {
        patch,
        cookie,
        lastMutationIDChanges,
      };
    },
    {
      Error: ReplicacheError.BadRequest,
      args: ["Failed to parse pull request"],
    },
  );

  /**
   * Implements the row version strategy push algorithm from the [Replicache docs](https://doc.replicache.dev/strategies/row-version#push).
   */
  export const push = fn(
    pushRequestSchema,
    async (pushRequest): Promise<PushResponse | null> => {
      if (pushRequest.pushVersion !== 1)
        return { error: "VersionNotSupported", versionType: "push" };

      const context = Utils.createContext<{ errorMode: boolean }>("Push");

      for (const mutation of pushRequest.mutations) {
        try {
          // 1: Error mode is initially false
          await context.with({ errorMode: false }, async () =>
            processMutation(mutation),
          );
        } catch (error) {
          console.error(error);

          console.log(
            `Encountered error during push on mutation "${mutation.id}"`,
          );

          if (error instanceof ReplicacheError.ClientStateNotFound)
            return { error: error.name };

          console.log(`Retrying mutation "${mutation.id}" in error mode`);

          // retry in error mode
          await context.with({ errorMode: true }, async () =>
            processMutation(mutation),
          );
        }
      }

      const processMutation = fn(
        v.object({
          ...genericMutationSchema.entries,
          name: mutationNameSchema,
        }),
        async (mutation) =>
          // 2: Begin transaction
          useTransaction(async () => {
            const clientGroupId = pushRequest.clientGroupID;

            // 3: Get client group
            const clientGroup =
              (await clientGroupFromId(clientGroupId)) ??
              ({
                id: clientGroupId,
                tenantId: useTenant().id,
                cvrVersion: 0,
                userId: useUser().id,
              } satisfies OmitTimestamps<ReplicacheClientGroup>);

            // 4: Verify requesting user owns the client group
            if (clientGroup.userId !== useUser().id)
              throw new ReplicacheError.Unauthorized(
                `User "${useUser().id}" does not own client group "${clientGroupId}"`,
              );

            // 5: Get client
            const client =
              (await clientFromId(mutation.clientID)) ??
              ({
                id: mutation.clientID,
                tenantId: useTenant().id,
                clientGroupId: clientGroupId,
                lastMutationId: 0,
              } satisfies OmitTimestamps<ReplicacheClient>);

            // 6: Verify requesting client group owns the client
            if (client.clientGroupId !== clientGroupId)
              throw new ReplicacheError.Unauthorized(
                `Client ${mutation.clientID} does not belong to client group ${clientGroupId}`,
              );

            if (client.lastMutationId === 0 && mutation.id > 1)
              throw new ReplicacheError.ClientStateNotFound();

            // 7: Next mutation ID
            const nextMutationId = client.lastMutationId + 1;

            // 8: Rollback and skip if mutation already processed
            if (mutation.id < nextMutationId)
              return console.log(
                `Mutation "${mutation.id}" already processed - skipping`,
              );

            // 9: Rollback and throw if mutation is from the future
            if (mutation.id > nextMutationId)
              throw new ReplicacheError.MutationConflict(
                `Mutation "${mutation.id}" is from the future - aborting`,
              );

            const start = Date.now();

            // 10. Perform mutation
            if (!context.use().errorMode) {
              try {
                if (!isSerialized(mutation.args))
                  throw new ReplicacheError.BadRequest(
                    "Mutation args not serialized",
                  );

                // 10(i): Business logic
                // 10(i)(a): xmin column is automatically updated by Postgres on any affected rows
                await authoritativeMutator[mutation.name](
                  deserialize(mutation.args),
                );
              } catch (e) {
                // 10(ii)(a-c): Log, abort, and retry
                console.log(`Error processing mutation "${mutation.id}"`);

                throw e;
              }
            }

            const nextClient = {
              id: client.id,
              tenantId: client.tenantId,
              clientGroupId,
              lastMutationId: nextMutationId,
            } satisfies OmitTimestamps<ReplicacheClient>;

            await Promise.all([
              // 11. Upsert client group
              await putClientGroup(clientGroup),

              // 12. Upsert client
              await putClient(nextClient),
            ]);

            const end = Date.now();
            console.log(
              `Processed mutation "${mutation.id}" in ${end - start}ms`,
            );
          }),
      );

      return null;
    },
    {
      Error: ReplicacheError.BadRequest,
      args: ["Failed to parse push request"],
    },
  );
}
