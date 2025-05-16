import { use, useEffect, useState } from "react";
import { ClientErrors } from "@printdesk/core/errors/client";
import * as R from "remeda";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useRouteApi } from "~/lib/hooks/route-api";
import { useStableCallback } from "~/lib/hooks/utils";

import type { ReadTransaction, SubscribeOptions } from "@rocicorp/replicache";

export function useReplicacheContext() {
  const replicache = use(ReplicacheContext);
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
  options: UseSubscribeOptions<TData, TDefaultData> = {},
): TData | TDefaultData {
  const queryHandler = useStableCallback(query);
  const onData = useStableCallback(options.onData ?? (() => undefined));
  const onError = useStableCallback(options.onError ?? (() => undefined));
  const onDone = useStableCallback(options.onDone ?? (() => undefined));
  const isEqual = useStableCallback(options.isEqual ?? R.isDeepEqual);

  const replicache = useReplicache();

  const [data, setData] = useState<TData>();

  useEffect(() => {
    const unsubscribe = replicache.subscribe(queryHandler, {
      onData: (data) => {
        setData(() => data);

        onData(data);
      },
      onError,
      onDone,
      isEqual,
    });

    return () => {
      unsubscribe();
      setData(() => undefined);
    };
  }, [replicache, queryHandler, onData, onError, onDone, isEqual]);

  if (data === undefined) return options.defaultData as TDefaultData;

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
