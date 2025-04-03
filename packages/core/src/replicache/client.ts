import * as R from "remeda";
import { deserialize, serialize } from "superjson";
import * as v from "valibot";

import { SharedErrors } from "../errors/shared";
import { usersTableName } from "../users/shared";

import type {
  DeepReadonlyObject,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import type { SyncedTableName, TableByName } from "../data";
import type { InferTable } from "../drizzle/tables";
import type { User } from "../users/sql";
import type { Serialized } from "./shared";

export namespace Replicache {
  export const createQuery =
    <
      TQuery extends (tx: ReadTransaction) => ReturnType<TQuery>,
      TGetDeps extends (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...input: Array<any>
      ) => ReturnType<TGetDeps> = () => undefined,
    >({
      getDeps = (() => undefined) as TGetDeps,
      getQuery,
    }: {
      getDeps?: TGetDeps;
      getQuery: (deps: ReturnType<TGetDeps>) => TQuery;
    }) =>
    (
      ...input: TGetDeps extends (
        ...input: infer TInput
      ) => ReturnType<TGetDeps>
        ? TInput
        : Array<never>
    ) =>
    (tx: ReadTransaction) => {
      const deps = getDeps(...input);

      const query = getQuery(deps);

      return query(tx);
    };

  export type Mutator<TSchema extends v.GenericSchema = v.AnySchema> = (
    tx: WriteTransaction,
    args: v.InferOutput<TSchema>,
  ) => Promise<void>;

  export const createMutator =
    <
      TSchema extends v.GenericSchema,
      TAuthorizer extends (
        tx: WriteTransaction,
        user: DeepReadonlyObject<User>,
        args: v.InferOutput<TSchema>,
      ) => ReturnType<TAuthorizer>,
      TMutator extends Mutator<TSchema>,
    >(
      schema: TSchema,
      {
        authorizer,
        getMutator,
      }: {
        authorizer: TAuthorizer;
        getMutator: (context: {
          user: DeepReadonlyObject<User>;
          authorized: Awaited<ReturnType<TAuthorizer>>;
        }) => TMutator;
      },
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
    if (!value) throw new SharedErrors.NotFound({ name, id });

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
    if (!success) throw new SharedErrors.NotFound({ name, id });
  }
}
