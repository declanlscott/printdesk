import { getTableName } from "drizzle-orm";
import * as R from "remeda";

import { ApplicationError } from "../utils/errors";
import { syncedTables } from "../utils/tables";
import { replicacheClientsTableName } from "./shared";

import type { Table, TableByName, TableName } from "../utils/tables";
import type { Metadata, TableMetadata } from "./data";

export type ClientViewRecord = {
  [TName in TableName]: ClientViewRecordEntries<TableByName<TName>>;
};
export type ClientViewRecordEntries<TTable extends Table> = Record<
  Metadata<TTable>["id"],
  Metadata<TTable>["version"]
>;
export type ClientViewRecordDiff = {
  [TName in TableName]: ClientViewRecordDiffEntry<TableByName<TName>>;
};
export type ClientViewRecordDiffEntry<TTable extends Table> = {
  puts: Array<Metadata<TTable>["id"]>;
  dels: Array<Metadata<TTable>["id"]>;
};

export const buildCvrEntries = <TTable extends Table>(
  tableMetadata: Array<Metadata<TTable>>,
) =>
  tableMetadata.reduce((entries, { id, version }) => {
    entries[id] = version;
    return entries;
  }, {} as ClientViewRecordEntries<TTable>);

export function buildCvr(
  args:
    | {
        variant: "base";
        prev?: ClientViewRecord;
      }
    | {
        variant: "next";
        metadata: Array<TableMetadata>;
      },
) {
  const variant = args.variant;

  switch (variant) {
    case "base":
      return (
        args.prev ??
        syncedTables.reduce(
          (baseCvr, table) => {
            baseCvr[getTableName(table)] = {};
            return baseCvr;
          },
          { [replicacheClientsTableName]: {} } as ClientViewRecord,
        )
      );
    case "next":
      return args.metadata.reduce((nextCvr, [name, metadata]) => {
        nextCvr[name] = buildCvrEntries(metadata);
        return nextCvr;
      }, {} as ClientViewRecord);
    default:
      throw new ApplicationError.NonExhaustiveValue(variant);
  }
}

export const diffCvr = (prev: ClientViewRecord, next: ClientViewRecord) =>
  R.pipe(
    { ...prev, ...next },
    R.keys(),
    R.unique(),
    R.reduce((diff, name) => {
      const prevEntries = prev[name] ?? {};
      const nextEntries = next[name] ?? {};

      diff[name] = {
        puts: R.pipe(
          nextEntries,
          R.keys(),
          R.filter(
            (id) =>
              prevEntries[id] === undefined ||
              prevEntries[id] < nextEntries[id],
          ),
        ),
        dels: R.pipe(
          prevEntries,
          R.keys(),
          R.filter((id) => nextEntries[id] === undefined),
        ),
      };

      return diff;
    }, {} as ClientViewRecordDiff),
  );

export function isCvrDiffEmpty(diff: ClientViewRecordDiff) {
  for (const tableName in diff) {
    const { puts, dels } = diff[tableName as keyof ClientViewRecordDiff];

    if (puts.length > 0 || dels.length > 0) return false;
  }

  return true;
}
