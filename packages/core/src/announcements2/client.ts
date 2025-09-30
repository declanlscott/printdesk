import { Effect } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Models } from "../models2";
import { Replicache } from "../replicache2/client";
import { AnnouncementsContract } from "./contract";

export namespace Announcements {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/announcements/client/ReadRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        Replicache.ReadTransactionManager.Default,
      ],
      effect: Models.SyncTables.announcements.pipe(
        Effect.flatMap(Replicache.makeReadRepository),
      ),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/announcements/client/WriteRepository",
    {
      dependencies: [
        Models.SyncTables.Default,
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: Effect.all([
        Models.SyncTables.announcements,
        ReadRepository,
      ]).pipe(
        Effect.flatMap((args) => Replicache.makeWriteRepository(...args)),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/announcements/client/Mutations",
    {
      accessors: true,
      dependencies: [WriteRepository.Default],
      effect: Effect.gen(function* () {
        const repository = yield* WriteRepository;

        const create = DataAccessContract.makeMutation(
          AnnouncementsContract.create,
          {
            makePolicy: () => AccessControl.permission("announcements:create"),
            mutator: (announcement, session) =>
              repository.create(
                AnnouncementsContract.DataTransferObject.make({
                  ...announcement,
                  authorId: session.userId,
                  tenantId: session.tenantId,
                }),
              ),
          },
        );

        const update = DataAccessContract.makeMutation(
          AnnouncementsContract.update,
          {
            makePolicy: () => AccessControl.permission("announcements:update"),
            mutator: ({ id, ...announcement }) =>
              repository.updateById(id, () => announcement),
          },
        );

        const delete_ = DataAccessContract.makeMutation(
          AnnouncementsContract.delete_,
          {
            makePolicy: () => AccessControl.permission("announcements:delete"),
            mutator: ({ id, deletedAt }) =>
              repository
                .updateById(id, () => ({ deletedAt }))
                .pipe(
                  AccessControl.enforce(
                    AccessControl.permission("announcements:read"),
                  ),
                  Effect.catchTag("AccessDeniedError", () =>
                    repository.deleteById(id),
                  ),
                ),
          },
        );

        return { create, update, delete: delete_ } as const;
      }),
    },
  ) {}
}
