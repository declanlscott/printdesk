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
import type { User } from "../users/sql";
import type { SyncedTableName, TableByName } from "../utils/tables";
import type { InferTable } from "../utils/types";
import type { Serialized } from "./shared";

export namespace Replicache {
  export const query =
    <
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      TGetDeps extends (...input: Array<any>) => ReturnType<TGetDeps>,
      TQueryFn extends (tx: ReadTransaction) => ReturnType<TQueryFn>,
    >(
      getDeps: TGetDeps,
      getQueryFn: (deps: ReturnType<TGetDeps>) => TQueryFn,
    ) =>
    (
      ...input: TGetDeps extends (
        ...input: infer TInput
      ) => ReturnType<TGetDeps>
        ? TInput
        : Array<never>
    ) =>
    (tx: ReadTransaction) => {
      const deps = getDeps(...input);

      const queryFn = getQueryFn(deps);

      return queryFn(tx);
    };

  export type MutatorFn<TSchema extends v.GenericSchema = v.AnySchema> = (
    tx: WriteTransaction,
    args: v.InferOutput<TSchema>,
  ) => Promise<void>;

  export const mutator =
    <
      TSchema extends v.GenericSchema,
      TAuthorizer extends (
        tx: WriteTransaction,
        user: DeepReadonlyObject<User>,
        args: v.InferOutput<TSchema>,
      ) => ReturnType<TAuthorizer>,
      TMutatorFn extends MutatorFn<TSchema>,
    >(
      schema: TSchema,
      authorizer: TAuthorizer,
      getMutatorFn: (context: {
        user: DeepReadonlyObject<User>;
        authorized: Awaited<ReturnType<TAuthorizer>>;
      }) => TMutatorFn,
    ) =>
    (userId: User["id"]) =>
    async (tx: WriteTransaction, args: v.InferInput<TSchema>) => {
      const user = await get(tx, usersTableName, userId);

      const values = v.parse(schema, args);

      const authorized = await Promise.resolve(authorizer(tx, user, values));

      const mutatorFn = getMutatorFn({ user, authorized });

      return mutatorFn(tx, values);
    };

  export async function get<TTableName extends SyncedTableName>(
    tx: ReadTransaction,
    name: TTableName,
    id: string,
  ) {
    const value = (await tx.get(`${name}/${id}`)) as Serialized | undefined;
    if (!value) throw new ApplicationError.EntityNotFound({ name, id });

    return deserialize<DeepReadonlyObject<InferTable<TableByName<TTableName>>>>(
      value,
    );
  }

  export const scan = async <TTableName extends SyncedTableName>(
    tx: ReadTransaction,
    name: TTableName,
  ) =>
    (
      tx.scan({ prefix: `${name}/` }).toArray() as Promise<Array<Serialized>>
    ).then(
      R.map(
        deserialize<DeepReadonlyObject<InferTable<TableByName<TTableName>>>>,
      ),
    );

  export const set = async <TTableName extends SyncedTableName>(
    tx: WriteTransaction,
    name: TTableName,
    id: string,
    value: DeepReadonlyObject<InferTable<TableByName<TTableName>>>,
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
