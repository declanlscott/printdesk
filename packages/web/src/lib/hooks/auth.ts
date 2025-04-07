import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { AuthStoreApi } from "~/lib/contexts/stores/auth";

export const useAuthStoreApi = AuthStoreApi.use;

export const useAuth = () =>
  useStore(
    useAuthStoreApi(),
    useShallow(({ client, tokens, user }) => ({
      client,
      tokens,
      user,
    })),
  );

export function useUserSubject() {
  const { user } = useAuth();

  if (!user) throw new Error("User not authenticated");

  return user;
}

export const useAuthActions = AuthStoreApi.useActions;

export const useAuthToken = () =>
  AuthStoreApi.useSelector(({ tokens }) => tokens?.access);
