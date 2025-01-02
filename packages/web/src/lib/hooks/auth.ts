import { ApplicationError } from "@printworks/core/utils/errors";
import { useStore } from "zustand";

import { AuthStore } from "~/lib/stores/auth";

export const useAuth = () =>
  useStore(AuthStore.useContext(), (store) => ({
    client: store.client,
    tokens: store.tokens,
    user: store.user,
  }));

export const useAuthActions = () =>
  useStore(AuthStore.useContext(), (store) => store.actions);

export function useUserSubject() {
  const { user } = useAuth();

  if (!user) throw new ApplicationError.Unauthenticated();

  return user;
}
