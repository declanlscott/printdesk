import { useCallback, useContext, useEffect, useState } from "react";
import { Announcements } from "@printworks/core/announcements/client";
import { BillingAccounts } from "@printworks/core/billing-accounts/client";
import { Comments } from "@printworks/core/comments/client";
import { Invoices } from "@printworks/core/invoices/client";
import { Orders } from "@printworks/core/orders/client";
import { Products } from "@printworks/core/products/client";
import { Rooms } from "@printworks/core/rooms/client";
import { Tenants } from "@printworks/core/tenants/client";
import { Users } from "@printworks/core/users/client";
import { ApplicationError } from "@printworks/core/utils/errors";

import { ReplicacheContext } from "~/lib/contexts/replicache";
import { useRouteApi } from "~/lib/hooks/route-api";

import type { Replicache } from "@printworks/core/replicache/client";
import type { MutationName } from "@printworks/core/replicache/shared";
import type { User } from "@printworks/core/users/sql";
import type { ReadTransaction, SubscribeOptions } from "replicache";

export function useReplicacheContext() {
  const replicache = useContext(ReplicacheContext);

  if (!replicache)
    throw new ApplicationError.MissingContextProvider("Replicache");

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

/**
 * Returns a collection of optimistic mutators for Replicache. This should match the corresponding server-side mutators.
 */
export const useGetMutators = () =>
  useCallback(
    (userId: User["id"]) =>
      ({
        createAnnouncement: Announcements.create(userId),
        updateAnnouncement: Announcements.update(userId),
        deleteAnnouncement: Announcements.delete_(userId),
        updateBillingAccountReviewThreshold:
          BillingAccounts.updateReviewThreshold(userId),
        deleteBillingAccount: BillingAccounts.delete_(userId),
        createBillingAccountManagerAuthorization:
          BillingAccounts.createManagerAuthorization(userId),
        deleteBillingAccountManagerAuthorization:
          BillingAccounts.deleteManagerAuthorization(userId),
        createComment: Comments.create(userId),
        updateComment: Comments.update(userId),
        deleteComment: Comments.delete_(userId),
        setDeliveryOptions: Rooms.setDeliveryOptions(userId),
        createInvoice: Invoices.create(userId),
        createOrder: Orders.create(userId),
        updateOrder: Orders.update(userId),
        deleteOrder: Orders.delete_(userId),
        updateTenant: Tenants.update(userId),
        createProduct: Products.create(userId),
        updateProduct: Products.update(userId),
        deleteProduct: Products.delete_(userId),
        createRoom: Rooms.create(userId),
        updateRoom: Rooms.update(userId),
        deleteRoom: Rooms.delete_(userId),
        restoreRoom: Rooms.restore(userId),
        updateUserRole: Users.updateRole(userId),
        deleteUser: Users.delete_(userId),
        restoreUser: Users.restore(userId),
        setWorkflow: Rooms.setWorkflow(userId),
      }) satisfies Record<MutationName, Replicache.MutatorFn>,
    [],
  );

export type Mutators = ReturnType<ReturnType<typeof useGetMutators>>;

export const useMutators = () => useReplicache().mutate;
