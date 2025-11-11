import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as Struct from "effect/Struct";
import * as Tuple from "effect/Tuple";

import { Announcements } from "../announcements2";
import { Comments } from "../comments2";
import { DeliveryOptions } from "../delivery-options2";
import { Invoices } from "../invoices2";
import { Models } from "../models2";
import { Orders } from "../orders2";
import { Products } from "../products2";
import { ReplicacheContract } from "../replicache2/contract";
import { ReplicacheClientViewEntriesModel } from "../replicache2/models";
import { Rooms } from "../rooms2";
import { SharedAccounts } from "../shared-accounts2";
import { Tenants } from "../tenants2";
import { Users } from "../users2";
import { Constants } from "../utils/constants";
import {
  RoomWorkflows,
  SharedAccountWorkflows,
  WorkflowStatuses,
} from "../workflows2";
import { QueriesContract } from "./contract";

import type { AuthContract } from "../auth2/contract";
import type { ColumnsContract } from "../columns2/contract";
import type { ReplicacheClientViewsModel } from "../replicache2/models";

export namespace Queries {
  export class Differentiator extends Effect.Service<Differentiator>()(
    "@printdesk/core/queries/Differentiator",
    {
      accessors: true,
      dependencies: [
        Announcements.Queries.Default,
        Comments.Queries.Default,
        DeliveryOptions.Queries.Default,
        Invoices.Queries.Default,
        Orders.Queries.Default,
        Products.Queries.Default,
        Rooms.Queries.Default,
        SharedAccounts.Queries.Default,
        SharedAccounts.ManagerAuthorizationsQueries.Default,
        SharedAccounts.CustomerAuthorizationsQueries.Default,
        Tenants.Queries.Default,
        Users.Queries.Default,
        RoomWorkflows.Queries.Default,
        SharedAccountWorkflows.Queries.Default,
        WorkflowStatuses.Queries.Default,
        Models.SyncTables.Default,
      ],
      effect: Effect.gen(function* () {
        const announcements = yield* Announcements.Queries.differenceResolver;
        const comments = yield* Comments.Queries.differenceResolver;
        const deliveryOptions =
          yield* DeliveryOptions.Queries.differenceResolver;
        const invoices = yield* Invoices.Queries.differenceResolver;
        const orders = yield* Orders.Queries.differenceResolver;
        const products = yield* Products.Queries.differenceResolver;
        const rooms = yield* Rooms.Queries.differenceResolver;
        const sharedAccounts = yield* SharedAccounts.Queries.differenceResolver;
        const sharedAccountManagerAuthorizations =
          yield* SharedAccounts.ManagerAuthorizationsQueries.differenceResolver;
        const sharedAccountCustomerAuthorizations =
          yield* SharedAccounts.CustomerAuthorizationsQueries
            .differenceResolver;
        const tenants = yield* Tenants.Queries.differenceResolver;
        const users = yield* Users.Queries.differenceResolver;
        const roomWorkflows = yield* RoomWorkflows.Queries.differenceResolver;
        const sharedAccountWorkflows =
          yield* SharedAccountWorkflows.Queries.differenceResolver;
        const workflowStatuses =
          yield* WorkflowStatuses.Queries.differenceResolver;

        const syncTables = yield* Models.SyncTables;

        const client = new QueriesContract.Differentiator()
          .resolver(announcements)
          .resolver(comments)
          .resolver(deliveryOptions)
          .resolver(invoices)
          .resolver(orders)
          .resolver(products)
          .resolver(rooms)
          .resolver(sharedAccounts)
          .resolver(sharedAccountManagerAuthorizations)
          .resolver(sharedAccountCustomerAuthorizations)
          .resolver(tenants)
          .resolver(users)
          .resolver(roomWorkflows)
          .resolver(sharedAccountWorkflows)
          .resolver(workflowStatuses)
          .final();

        const differentiate = Effect.fn("Queries.Differentiator.differentiate")(
          (
            clientView: ReplicacheClientViewsModel.Record,
            userId: AuthContract.Session["userId"],
            limitOffset: number,
            clientViewVersion: {
              next: ColumnsContract.Version;
              max: ColumnsContract.Version;
            },
          ) =>
            Effect.gen(function* () {
              const baseLimit =
                Constants.DB_TRANSACTION_ROW_MODIFICATION_LIMIT -
                Math.abs(limitOffset);

              const { clientViewEntries, patch, limit, excludeIds } =
                yield* Stream.mergeWithTag(
                  {
                    update: client.findUpdates(clientView, userId),
                    delete: client.findDeletes(clientView, userId),
                  },
                  { concurrency: "unbounded" },
                ).pipe(
                  Stream.broadcast(4, 1),
                  Effect.flatMap(([first, second, third, fourth]) =>
                    Effect.all(
                      {
                        clientViewEntries: first.pipe(
                          Stream.map(
                            Match.type<
                              Stream.Stream.Success<typeof first>
                            >().pipe(
                              Match.tag("update", (update) =>
                                ReplicacheClientViewEntriesModel.Record.make({
                                  clientGroupId: clientView.clientGroupId,
                                  clientViewVersion: clientViewVersion.next,
                                  entity: update.value[0],
                                  entityId: update.value[1].id,
                                  entityVersion: update.value[1].version,
                                  tenantId: clientView.tenantId,
                                }),
                              ),
                              Match.tag("delete", (delete_) =>
                                ReplicacheClientViewEntriesModel.Record.make({
                                  clientGroupId: clientView.clientGroupId,
                                  clientViewVersion: clientViewVersion.next,
                                  entity: delete_.value[0],
                                  entityId: delete_.value[1].id,
                                  entityVersion: null,
                                  tenantId: clientView.tenantId,
                                }),
                              ),
                              Match.exhaustive,
                            ),
                          ),
                          Stream.runCollect,
                        ),
                        patch: second.pipe(
                          Stream.map(
                            Match.type<
                              Stream.Stream.Success<typeof second>
                            >().pipe(
                              Match.tag("update", (update) =>
                                ReplicacheContract.makePutTableOperation({
                                  table: syncTables[update.value[0]],
                                  value: update.value[1],
                                }),
                              ),
                              Match.tag("delete", (delete_) =>
                                ReplicacheContract.makeDeleteTableOperation({
                                  table: syncTables[delete_.value[0]],
                                  id: delete_.value[1].id,
                                }),
                              ),
                              Match.exhaustive,
                            ),
                          ),
                          Stream.runCollect<
                            ReplicacheContract.PatchOperation,
                            Stream.Stream.Error<typeof second>,
                            Stream.Stream.Context<typeof second>
                          >,
                        ),
                        limit: third.pipe(
                          Stream.runFold(baseLimit, Number.decrement),
                        ),
                        excludeIds: fourth.pipe(
                          Stream.map((item) =>
                            Tuple.mapSecond(item.value, Struct.get("id")),
                          ),
                          Stream.runCollect,
                        ),
                      },
                      { concurrency: "unbounded" },
                    ),
                  ),
                  Effect.scoped,
                );

              // Reset
              if (limit < 0)
                return yield* client.findCreates(clientView, userId).pipe(
                  Stream.broadcast(3, 1),
                  Effect.flatMap(([first, second, third]) =>
                    Effect.all(
                      {
                        clientViewEntries: first.pipe(
                          Stream.take(baseLimit),
                          Stream.map(([entity, value]) =>
                            ReplicacheClientViewEntriesModel.Record.make({
                              clientGroupId: clientView.clientGroupId,
                              clientViewVersion: clientViewVersion.next,
                              entity,
                              entityId: value.id,
                              entityVersion: value.version,
                              tenantId: clientView.tenantId,
                            }),
                          ),
                          Stream.runCollect,
                        ),
                        patch: second.pipe(
                          Stream.take(baseLimit),
                          Stream.map(([entity, value]) =>
                            ReplicacheContract.makePutTableOperation({
                              table: syncTables[entity],
                              value,
                            }),
                          ),
                          Stream.runCollect<
                            ReplicacheContract.PatchOperation,
                            Stream.Stream.Error<typeof second>,
                            Stream.Stream.Context<typeof second>
                          >,
                          Effect.map(
                            Chunk.prepend(
                              ReplicacheContract.ClearOperation.make(),
                            ),
                          ),
                        ),
                        isPartial: third.pipe(
                          Stream.drop(baseLimit),
                          Stream.runHead,
                          Effect.map(Option.isSome),
                        ),
                      },
                      { concurrency: "unbounded" },
                    ),
                  ),
                  Effect.scoped,
                  Effect.map(({ clientViewEntries, patch, isPartial }) => ({
                    clientViewEntries,
                    patch: patch.pipe(
                      Chunk.append(
                        ReplicacheContract.PutSyncStateOperation.make({
                          value: isPartial ? "PARTIAL" : "COMPLETE",
                        }),
                      ),
                    ),
                  })),
                );

              // Fast-forward
              if (clientView.version < clientViewVersion.max)
                return yield* client
                  .fastForward(clientView, excludeIds, userId)
                  .pipe(
                    Stream.runFold(patch, (patch, [entity, value]) =>
                      patch.pipe(
                        Chunk.append(
                          ReplicacheContract.makePutTableOperation({
                            table: syncTables[entity],
                            value,
                          }),
                        ),
                      ),
                    ),
                    Effect.map((patch) => ({ clientViewEntries, patch })),
                  );

              return yield* client.findCreates(clientView, userId).pipe(
                Stream.broadcast(2, 1),
                Effect.flatMap(([first, second]) =>
                  Effect.all(
                    {
                      result: first.pipe(
                        Stream.take(limit),
                        Stream.runFold(
                          { clientViewEntries, patch },
                          (result, [entity, value]) => ({
                            clientViewEntries: result.clientViewEntries.pipe(
                              Chunk.append(
                                ReplicacheClientViewEntriesModel.Record.make({
                                  clientGroupId: clientView.clientGroupId,
                                  clientViewVersion: clientViewVersion.next,
                                  entity,
                                  entityId: value.id,
                                  entityVersion: value.version,
                                  tenantId: clientView.tenantId,
                                }),
                              ),
                            ),
                            patch: result.patch.pipe(
                              Chunk.append(
                                ReplicacheContract.makePutTableOperation({
                                  table: syncTables[entity],
                                  value,
                                }),
                              ),
                            ),
                          }),
                        ),
                      ),
                      isPartial: second.pipe(
                        Stream.drop(limit),
                        Stream.runHead,
                        Effect.map(Option.isSome),
                      ),
                    },
                    { concurrency: "unbounded" },
                  ),
                ),
                Effect.scoped,
                Effect.map(({ result, isPartial }) => ({
                  ...result,
                  patch: result.patch.pipe(
                    Chunk.append(
                      ReplicacheContract.PutSyncStateOperation.make({
                        value: isPartial ? "PARTIAL" : "COMPLETE",
                      }),
                    ),
                  ),
                })),
              );
            }),
        );

        return { differentiate } as const;
      }),
    },
  ) {}
}
