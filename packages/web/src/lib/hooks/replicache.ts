import { useContext, useEffect, useState } from "react";
import { ClientErrors } from "@printworks/core/errors/client";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useRouteApi } from "~/lib/hooks/route-api";

import type { ReadTransaction, SubscribeOptions } from "replicache";

export function useReplicacheContext() {
  const replicache = useContext(ReplicacheContext);

  if (!replicache) throw new ClientErrors.MissingContextProvider("Replicache");

  return replicache;
}

export const useReplicache = () =>
  useRouteApi("/_authenticated").useRouteContext().replicache;

export interface UseSubscribeOptions<TData, TDefaultData>
  extends Partial<SubscribeOptions<TData>> {
  defaultData?: TDefaultData;
}

export function useSubscribe<TData, TDefaultData = undefined>(
  query: (tx: ReadTransaction) => Promise<TData>,
  {
    onData,
    onError,
    onDone,
    isEqual,
    defaultData,
  }: UseSubscribeOptions<TData, TDefaultData> = {},
): TData | TDefaultData {
  const replicache = useReplicache();

  const [data, setData] = useState<TData>();

  useEffect(() => {
    const unsubscribe = replicache.subscribe(query, {
      onData: (data) => {
        setData(() => data);

        onData?.(data);
      },
      onError,
      onDone,
      isEqual,
    });

    return () => {
      unsubscribe();
      setData(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replicache]);

  if (!data) return defaultData as TDefaultData;

  return data;
}

export function useIsSyncing() {
  const [isSyncing, setIsSyncing] = useState(() => false);

  const replicache = useReplicache();

  useEffect(() => {
    replicache.onSync = setIsSyncing;
  }, [replicache]);

  return isSyncing;
}

export const useMutators = () => useReplicache().mutate;
