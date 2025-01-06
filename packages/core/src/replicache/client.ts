import * as R from "remeda";
import { deserialize, serialize } from "superjson";
import * as v from "valibot";

import { usersTableName } from "../users/shared";
import { ApplicationError } from "../utils/errors";

import type {
  DeepReadonlyObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import type { User, UserData } from "../users/sql";
import type { SyncedTableName, TableByName } from "../utils/tables";
import type { Serialized } from "./shared";

export namespace Replicache {
  export type OptimisticMutator<TSchema extends v.GenericSchema> = (
    tx: WriteTransaction,
    args: v.InferOutput<TSchema>,
  ) => Promise<void>;

  export const optimisticMutator =
    <
      TSchema extends v.GenericSchema,
      TAuthorizer extends (
        tx: WriteTransaction,
        user: DeepReadonlyObject<UserData>,
        args: v.InferOutput<TSchema>,
      ) => ReturnType<TAuthorizer>,
      TMutator extends OptimisticMutator<TSchema>,
    >(
      schema: TSchema,
      authorizer: TAuthorizer,
      getMutator: (context: {
        user: DeepReadonlyObject<UserData>;
        authorized: Awaited<ReturnType<TAuthorizer>>;
      }) => TMutator,
    ) =>
    (userId: User["id"]) =>
    async (tx: WriteTransaction, args: v.InferInput<TSchema>) => {
      const user = await get(tx, usersTableName, userId);

      const values = v.parse(schema, args);

      const authorized = await Promise.resolve(authorizer(tx, user, values));

      const mutator = getMutator({ user, authorized });

      return mutator(tx, values);
    };

  export async function get<TTableName extends SyncedTableName>(
    tx: ReadTransaction,
    name: TTableName,
    id: string,
  ) {
    const value = (await tx.get(`${name}/${id}`)) as Serialized | undefined;
    if (!value) throw new ApplicationError.EntityNotFound({ name, id });

    return deserialize<
      DeepReadonlyObject<
        TTableName extends typeof usersTableName
          ? UserData
          : TableByName<TTableName>["$inferSelect"]
      >
    >(value);
  }

  export const scan = async <TTableName extends SyncedTableName>(
    tx: ReadTransaction,
    name: TTableName,
  ) =>
    (
      tx.scan({ prefix: `${name}/` }).toArray() as Promise<Array<Serialized>>
    ).then(
      R.map(
        deserialize<
          DeepReadonlyObject<
            TTableName extends typeof usersTableName
              ? UserData
              : TableByName<TTableName>["$inferSelect"]
          >
        >,
      ),
    );

  export const set = async <TTableName extends SyncedTableName>(
    tx: WriteTransaction,
    name: TTableName,
    id: string,
    value: DeepReadonlyObject<
      TTableName extends typeof usersTableName
        ? UserData
        : TableByName<TTableName>["$inferSelect"]
    >,
  ) => tx.set(`${name}/${id}`, serialize(value) as Serialized);

  export async function del(
    tx: WriteTransaction,
    name: SyncedTableName,
    id: string,
  ) {
    const success = await tx.del(`${name}/${id}`);
    if (!success) throw new ApplicationError.EntityNotFound({ name, id });
  }
}
