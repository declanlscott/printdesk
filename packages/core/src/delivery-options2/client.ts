import { Array, Effect, Number, Order } from "effect";

import { AccessControl } from "../access-control2";
import { DataAccessContract } from "../data-access2/contract";
import { Replicache } from "../replicache2/client";
import { DeliveryOptionsContract } from "./contract";

export namespace DeliveryOptions {
  export class ReadRepository extends Effect.Service<ReadRepository>()(
    "@printdesk/core/delivery-options/client/ReadRepository",
    {
      dependencies: [Replicache.ReadTransactionManager.Default],
      effect: Effect.gen(function* () {
        const base = yield* Replicache.makeReadRepository(
          DeliveryOptionsContract.table,
        );

        const findTailIndexByRoomId = (
          roomId: DeliveryOptionsContract.DataTransferObject["roomId"],
        ) =>
          base.findAll.pipe(
            Effect.map(Array.filter((option) => option.roomId === roomId)),
            Effect.map(
              Array.sortWith(
                (option) => option.index,
                Order.reverse(Order.number),
              ),
            ),
            Effect.flatMap(Array.head),
            Effect.map(({ index }) => ({ index })),
          );

        const findSliceByRoomId = (
          start: DeliveryOptionsContract.DataTransferObject["index"],
          end: DeliveryOptionsContract.DataTransferObject["index"],
          roomId: DeliveryOptionsContract.DataTransferObject["roomId"],
        ) =>
          Effect.succeed(Number.sign(end - start) > 0).pipe(
            Effect.flatMap((isAscending) =>
              base.findAll.pipe(
                Effect.map(
                  Array.filter((option) =>
                    option.roomId === roomId && isAscending
                      ? option.index >= start && option.index <= end
                      : option.index <= start && option.index >= end,
                  ),
                ),
                Effect.map(
                  Array.sortWith(
                    (option) => option.index,
                    isAscending ? Order.number : Order.reverse(Order.number),
                  ),
                ),
              ),
            ),
          );

        return { ...base, findTailIndexByRoomId, findSliceByRoomId } as const;
      }),
    },
  ) {}

  export class WriteRepository extends Effect.Service<WriteRepository>()(
    "@printdesk/core/delivery-options/client/WriteRepository",
    {
      dependencies: [
        ReadRepository.Default,
        Replicache.WriteTransactionManager.Default,
      ],
      effect: ReadRepository.pipe(
        Effect.flatMap((repository) =>
          Replicache.makeWriteRepository(
            DeliveryOptionsContract.table,
            repository,
          ),
        ),
      ),
    },
  ) {}

  export class Mutations extends Effect.Service<Mutations>()(
    "@printdesk/core/delivery-options/client/Mutations",
    {
      accessors: true,
      dependencies: [ReadRepository.Default, WriteRepository.Default],
      effect: Effect.gen(function* () {
        const readRepository = yield* ReadRepository;
        const writeRepository = yield* WriteRepository;

        const append = DataAccessContract.makeMutation(
          DeliveryOptionsContract.append,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:create"),
            mutator: (deliveryOption, { tenantId }) =>
              readRepository.findTailIndexByRoomId(deliveryOption.roomId).pipe(
                Effect.catchTag("NoSuchElementException", () =>
                  Effect.succeed({ index: -1 }),
                ),
                Effect.map(({ index }) => ++index),
                Effect.flatMap((index) =>
                  writeRepository.create(
                    DeliveryOptionsContract.DataTransferObject.make({
                      ...deliveryOption,
                      index,
                      tenantId,
                    }),
                  ),
                ),
              ),
          }),
        );

        const edit = DataAccessContract.makeMutation(
          DeliveryOptionsContract.edit,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:update"),
            mutator: ({ id, ...deliveryOption }) =>
              writeRepository.updateById(id, deliveryOption),
          }),
        );

        const reorder = DataAccessContract.makeMutation(
          DeliveryOptionsContract.reorder,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:update"),
            mutator: ({ oldIndex, newIndex, updatedAt, roomId }) =>
              Effect.gen(function* () {
                const delta = newIndex - oldIndex;
                const shift = -Number.sign(delta);

                const slice = yield* readRepository.findSliceByRoomId(
                  oldIndex,
                  newIndex,
                  roomId,
                );

                const sliceLength = slice.length;
                const absoluteDelta = Math.abs(delta);
                if (sliceLength !== absoluteDelta)
                  return yield* Effect.fail(
                    new DeliveryOptionsContract.InvalidReorderDeltaError({
                      sliceLength,
                      absoluteDelta,
                    }),
                  );

                return yield* Effect.all(
                  Array.map(slice, (option, sliceIndex) =>
                    writeRepository.updateById(option.id, {
                      index: option.index + (sliceIndex === 0 ? delta : shift),
                      updatedAt,
                    }),
                  ),
                );
              }),
          }),
        );

        const delete_ = DataAccessContract.makeMutation(
          DeliveryOptionsContract.delete_,
          Effect.succeed({
            makePolicy: () =>
              AccessControl.permission("delivery_options:delete"),
            mutator: ({ id, deletedAt }) =>
              writeRepository.updateById(id, { deletedAt }).pipe(
                AccessControl.enforce(
                  AccessControl.permission("delivery_options:read"),
                ),
                Effect.catchTag("AccessDeniedError", () =>
                  writeRepository.deleteById(id),
                ),
              ),
          }),
        );

        return { append, edit, reorder, delete: delete_ } as const;
      }),
    },
  ) {}
}
